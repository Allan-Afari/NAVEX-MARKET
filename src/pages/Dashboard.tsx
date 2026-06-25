import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import Navbar from "@/components/landing/Navbar";
import { BarChart3, FileText, MessageSquare, TrendingUp, Plus, Star, CreditCard, Users, Lock, Unlock } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import VerifiedBadge from "@/components/VerifiedBadge";
import DealRecommendations from "@/components/DealRecommendations";
import DealRoomList from "@/components/deal-rooms/DealRoomList";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import OpportunityAlert from "@/components/OpportunityAlert";
import { WelcomeTour } from "@/components/WelcomeTour";

interface MyOpportunity {
  id: string;
  title: string;
  funding_amount: number | null;
  industry: string | null;
  sector: string | null;
  unlock_count: number;
}

interface UnlockedOpportunity {
  id: string;
  title: string;
  funding_amount: number | null;
  industry: string | null;
  sector: string | null;
  unlocked_at: string;
}

const DashboardLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-sm text-muted-foreground animate-pulse">Loading dashboard…</div>
  </div>
);

const Dashboard = () => {
  const { user } = useSession();
  const [profileLoading, setProfileLoading] = useState(true);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [dismissedTour, setDismissedTour] = useState(false);
  const [userRole, setUserRole] = useState<string>("business");
  const [trustScore, setTrustScore] = useState(0);
  const [verified, setVerified] = useState(false);
  const [agreementCount, setAgreementCount] = useState(0);

  // Business view
  const [myOpps, setMyOpps] = useState<MyOpportunity[]>([]);
  // Investor view
  const [myUnlocks, setMyUnlocks] = useState<UnlockedOpportunity[]>([]);

  const navigate = useNavigate();

  const role = userRole || user?.user_metadata?.role || "business";
  const isBusiness = role === "business" || role === "business_owner";

  useEffect(() => {
    if (!user) {
      setProfileLoading(false);
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      setProfileLoading(true);
      try {
        const [profileRes, agreementsRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("trust_score, verification_status, onboarded, onboarded_at, user_role")
            .eq("id", user.id)
            .single(),
          supabase
            .from("agreements")
            .select("id", { count: "exact", head: true })
            .eq("created_by", user.id),
        ]);

        if (cancelled) return;

        if (profileRes.error) {
          console.error("Profile fetch error:", profileRes.error);
          // If profile doesn't exist, create a default one
          if (profileRes.error.code === 'PGRST116') {
            const { error: insertError } = await supabase
              .from("profiles")
              .insert({
                id: user.id,
                trust_score: 0,
                verification_status: "pending",
                onboarded: false,
                user_role: "business",
              });
            if (insertError) {
              console.error("Profile creation error:", insertError);
            }
          }
        }

        setTrustScore(Number(profileRes.data?.trust_score) || 0);
        setVerified(profileRes.data?.verification_status === "verified");
        setUserRole(profileRes.data?.user_role || "business");

        const hasCompleted =
          profileRes.data?.onboarded === true || Boolean(profileRes.data?.onboarded_at);
        setOnboarded(hasCompleted);
        setShowOnboarding(!hasCompleted);
        setAgreementCount(agreementsRes.count || 0);
      } catch (error) {
        console.error("Dashboard profile load error:", error);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || profileLoading || showOnboarding) return;

    let cancelled = false;
    const isBiz = userRole === "business" || userRole === "business_owner";

    const loadDeals = async () => {
      try {
        if (isBiz) {
          const { data: deals, error: dealsError } = await supabase
            .from("deals")
            .select("id, title, funding_amount, industry, sector")
            .eq("created_by", user.id)
            .eq("is_removed", false)
            .order("created_at", { ascending: false })
            .limit(20);

          if (cancelled || dealsError) {
            console.error("Deals fetch error:", dealsError);
            return;
          }

          if (deals && deals.length > 0) {
            const ids = deals.map((d) => d.id);
            const { data: unlocks, error: unlocksError } = await supabase
              .from("access_unlocks")
              .select("opportunity_id")
              .in("opportunity_id", ids);
            
            if (unlocksError) {
              console.error("Unlocks fetch error:", unlocksError);
            }

            const counts: Record<string, number> = {};
            (unlocks || []).forEach((u) => {
              counts[u.opportunity_id] = (counts[u.opportunity_id] || 0) + 1;
            });
            setMyOpps(deals.map((d) => ({ ...d, unlock_count: counts[d.id] || 0 })));
          } else {
            setMyOpps([]);
          }
        } else {
          const { data: unlocks, error: unlocksError } = await supabase
            .from("access_unlocks")
            .select("unlocked_at, opportunity_id")
            .eq("investor_id", user.id)
            .order("unlocked_at", { ascending: false })
            .limit(20);

          if (cancelled || unlocksError) {
            console.error("Investor unlocks fetch error:", unlocksError);
            return;
          }

          if (unlocks && unlocks.length > 0) {
            const ids = unlocks.map((u) => u.opportunity_id);
            const { data: deals, error: dealsError } = await supabase
              .from("deals")
              .select("id, title, funding_amount, industry, sector")
              .in("id", ids);
            
            if (dealsError) {
              console.error("Deals fetch error:", dealsError);
            }

            const dealMap: Record<
              string,
              {
                id: string;
                title: string;
                funding_amount: number | null;
                industry: string | null;
                sector: string | null;
              }
            > = {};
            (deals || []).forEach((d) => {
              dealMap[d.id] = d;
            });
            setMyUnlocks(
              unlocks
                .map((u) => ({ ...dealMap[u.opportunity_id], unlocked_at: u.unlocked_at }))
                .filter((d) => d.id)
            );
          } else {
            setMyUnlocks([]);
          }
        }
      } catch (error) {
        console.error("Dashboard loadDeals error:", error);
      }
    };

    loadDeals();
    return () => {
      cancelled = true;
    };
  }, [user, userRole, profileLoading, showOnboarding]);

  const totalUnlocks = myOpps.reduce((sum, o) => sum + o.unlock_count, 0);

  const stats = isBusiness
    ? [
        { label: "Opportunities", value: String(myOpps.length), icon: TrendingUp },
        { label: "Investor Unlocks", value: String(totalUnlocks), icon: Unlock },
        { label: "Agreements", value: String(agreementCount), icon: FileText },
        { label: "Trust Score", value: trustScore > 0 ? trustScore.toFixed(1) : "—", icon: BarChart3 },
      ]
    : [
        { label: "Unlocked Deals", value: String(myUnlocks.length), icon: Unlock },
        { label: "Agreements", value: String(agreementCount), icon: FileText },
        { label: "Messages", value: "—", icon: MessageSquare },
        { label: "Trust Score", value: trustScore > 0 ? trustScore.toFixed(1) : "—", icon: BarChart3 },
      ];

  const formatAmount = (n: number | null) => n ? `GH₵${n.toLocaleString()}` : "Negotiable";

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
    setOnboarded(true);
    setProfileLoading(false);
  }, []);

  useEffect(() => {
    // Show tour for newly onboarded users
    const hasSeenTour = localStorage.getItem("hasSeenTour");
    if (onboarded && !hasSeenTour && !dismissedTour && !showOnboarding) {
      setShowTour(true);
    }
  }, [onboarded, dismissedTour, showOnboarding]);

  const handleTourComplete = () => {
    localStorage.setItem("hasSeenTour", "true");
    setShowTour(false);
    setDismissedTour(true);
  };

  if (!user || profileLoading) {
    return <DashboardLoading />;
  }

  if (showOnboarding) {
    return <OnboardingFlow user={user} onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Dashboard" description="Your Navex Market dashboard — manage investment opportunities and unlocks" />
      <Navbar />
      {showTour && <WelcomeTour onComplete={handleTourComplete} />}
      {user && !isBusiness && <OpportunityAlert userId={user.id} />}
      <div className="container px-4 pt-24 pb-12">
        <div className="flex items-center justify-between mb-8 gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {isBusiness ? "Business" : "Investor"} Dashboard
              {verified && <VerifiedBadge />}
            </h1>
            <p className="text-sm text-muted-foreground">Welcome, {user?.user_metadata?.full_name || user?.email}</p>
          </div>
          <Button className="gradient-primary text-primary-foreground hover:opacity-90" onClick={() => navigate("/marketplace")}>
            <Plus className="w-4 h-4 mr-2" />
            {isBusiness ? "Post Opportunity" : "Browse Opportunities"}
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="glass rounded-xl p-5">
              <s.icon className="w-5 h-5 text-primary mb-3" />
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Role-specific section */}
        {isBusiness ? (
          <div className="glass rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Your Investment Opportunities</h2>
              <Button size="sm" variant="outline" onClick={() => navigate("/marketplace")}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> New
              </Button>
            </div>
            {myOpps.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">You haven't posted any opportunities yet.</p>
                <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => navigate("/marketplace")}>
                  Post Your First Opportunity
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {myOpps.map((o) => (
                  <button key={o.id} onClick={() => navigate(`/deals/${o.id}`)} className="w-full bg-muted/30 rounded-lg p-4 hover:bg-muted/50 transition-colors text-left flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm truncate">{o.title}</h3>
                      <p className="text-xs text-muted-foreground">{o.industry || o.sector || "No industry"} · {formatAmount(o.funding_amount)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-accent flex-shrink-0">
                      <Users className="w-3.5 h-3.5" /> {o.unlock_count} {o.unlock_count === 1 ? "investor" : "investors"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="glass rounded-xl p-6 mb-8">
            <h2 className="font-semibold mb-4 flex items-center gap-2"><Unlock className="w-4 h-4 text-primary" /> Opportunities You've Unlocked</h2>
            {myUnlocks.length === 0 ? (
              <div className="text-center py-8">
                <Lock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">You haven't unlocked any opportunities yet.</p>
                <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => navigate("/marketplace")}>
                  Browse Opportunities
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {myUnlocks.map((o) => (
                  <button key={o.id} onClick={() => navigate(`/deals/${o.id}`)} className="w-full bg-muted/30 rounded-lg p-4 hover:bg-muted/50 transition-colors text-left flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm truncate">{o.title}</h3>
                      <p className="text-xs text-muted-foreground">{o.industry || o.sector || "No industry"} · {formatAmount(o.funding_amount)}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      Unlocked {new Date(o.unlocked_at).toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI Deal Recommendations for Investors */}
        {!isBusiness && user && <DealRecommendations user={user} />}

        {/* Deal Rooms */}
        {user && <DealRoomList user={user} />}

        {/* Quick links */}
        <div className="grid md:grid-cols-2 gap-4">
          <button onClick={() => navigate("/messages")} className="glass rounded-xl p-6 text-left hover:bg-muted/20 transition-colors">
            <MessageSquare className="w-6 h-6 text-primary mb-3" />
            <h3 className="font-semibold mb-1">Messages</h3>
            <p className="text-xs text-muted-foreground">Conversations with unlocked contacts</p>
          </button>
          <button onClick={() => navigate("/agreements")} className="glass rounded-xl p-6 text-left hover:bg-muted/20 transition-colors">
            <FileText className="w-6 h-6 text-accent mb-3" />
            <h3 className="font-semibold mb-1">Agreements</h3>
            <p className="text-xs text-muted-foreground">Investment deal agreements</p>
          </button>
          <button onClick={() => navigate("/reputation")} className="glass rounded-xl p-6 text-left hover:bg-muted/20 transition-colors">
            <Star className="w-6 h-6 text-warning mb-3" />
            <h3 className="font-semibold mb-1">Reputation</h3>
            <p className="text-xs text-muted-foreground">Trust score, reviews, and disputes</p>
          </button>
          <button onClick={() => navigate("/analytics")} className="glass rounded-xl p-6 text-left hover:bg-muted/20 transition-colors">
            <BarChart3 className="w-6 h-6 text-primary mb-3" />
            <h3 className="font-semibold mb-1">Analytics</h3>
            <p className="text-xs text-muted-foreground">Market intelligence and insights</p>
          </button>
          <button onClick={() => navigate("/billing")} className="glass rounded-xl p-6 text-left hover:bg-muted/20 transition-colors">
            <CreditCard className="w-6 h-6 text-primary mb-3" />
            <h3 className="font-semibold mb-1">Billing</h3>
            <p className="text-xs text-muted-foreground">Subscription and payments</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
