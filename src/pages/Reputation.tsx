import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Star, Shield, AlertTriangle, Users, BarChart3,
  CheckCircle2, Clock, XCircle, FileText, Plus, ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  reviewer_id: string | null;
  reviewee_id: string | null;
  created_at: string;
}

interface Dispute {
  id: string;
  reason: string;
  status: string;
  resolution: string | null;
  initiated_by: string | null;
  against_user: string | null;
  deal_room_id: string | null;
  description: string | null;
  created_at: string;
}

const Reputation = () => {
  const [user, setUser] = useState<User | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [activeTab, setActiveTab] = useState<"reviews" | "disputes">("reviews");
  const [showNewDispute, setShowNewDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [againstUserId, setAgainstUserId] = useState("");
  const [trustScore, setTrustScore] = useState<number>(0);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return navigate("/login");
      setUser(session.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/login");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [reviewsRes, disputesRes, profileRes] = await Promise.all([
        supabase.from("reviews").select("*").or(`reviewer_id.eq.${user.id},reviewee_id.eq.${user.id}`).order("created_at", { ascending: false }),
        supabase.from("disputes").select("*").or(`initiated_by.eq.${user.id},against_user.eq.${user.id}`).order("created_at", { ascending: false }),
        supabase.from("profiles").select("trust_score").eq("id", user.id).single(),
      ]);
      if (reviewsRes.data) setReviews(reviewsRes.data);
      if (disputesRes.data) setDisputes(disputesRes.data);
      if (profileRes.data) setTrustScore(Number(profileRes.data.trust_score) || 0);
    };
    fetchData();
  }, [user]);

  const handleCreateDispute = async () => {
    if (!disputeReason.trim() || !user || !againstUserId.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    const { error } = await supabase.from("disputes").insert({
      reason: disputeReason.trim(),
      initiated_by: user.id,
      against_user: againstUserId.trim(),
    });
    if (error) { 
      toast.error("Failed to create dispute"); 
      return; 
    }
    toast.success("Dispute submitted");
    setDisputeReason("");
    setAgainstUserId("");
    setShowNewDispute(false);
    // Refresh
    const { data } = await supabase.from("disputes").select("*").or(`initiated_by.eq.${user.id},against_user.eq.${user.id}`).order("created_at", { ascending: false });
    if (data) setDisputes(data);
  };

  const avgRating = reviews.filter(r => r.reviewee_id === user?.id).length > 0
    ? reviews.filter(r => r.reviewee_id === user?.id).reduce((s, r) => s + r.rating, 0) / reviews.filter(r => r.reviewee_id === user?.id).length
    : 0;

  const disputeStatusConfig: Record<string, { icon: typeof Clock; color: string; label: string }> = {
    open: { icon: Clock, color: "text-warning", label: "Open" },
    investigating: { icon: AlertTriangle, color: "text-primary", label: "Investigating" },
    resolved: { icon: CheckCircle2, color: "text-accent", label: "Resolved" },
    dismissed: { icon: XCircle, color: "text-muted-foreground", label: "Dismissed" },
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container px-4 pt-24 pb-12">
        <h1 className="text-2xl font-bold mb-2">Reputation</h1>
        <p className="text-sm text-muted-foreground mb-8">Your trust score, reviews, and disputes</p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-xl p-5">
            <Shield className="w-5 h-5 text-accent mb-2" />
            <div className="text-2xl font-bold">{trustScore.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">Trust Score</div>
          </div>
          <div className="glass rounded-xl p-5">
            <Star className="w-5 h-5 text-warning mb-2" />
            <div className="text-2xl font-bold">{avgRating > 0 ? avgRating.toFixed(1) : "—"}</div>
            <div className="text-xs text-muted-foreground">Avg Rating</div>
          </div>
          <div className="glass rounded-xl p-5">
            <Users className="w-5 h-5 text-primary mb-2" />
            <div className="text-2xl font-bold">{reviews.filter(r => r.reviewee_id === user?.id).length}</div>
            <div className="text-xs text-muted-foreground">Reviews Received</div>
          </div>
          <div className="glass rounded-xl p-5">
            <AlertTriangle className="w-5 h-5 text-destructive mb-2" />
            <div className="text-2xl font-bold">{disputes.length}</div>
            <div className="text-xs text-muted-foreground">Disputes</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button variant={activeTab === "reviews" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("reviews")}>
            <Star className="w-3.5 h-3.5 mr-1.5" /> Reviews
          </Button>
          <Button variant={activeTab === "disputes" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("disputes")}>
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Disputes
          </Button>
        </div>

        {activeTab === "reviews" && (
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <Star className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No reviews yet. Complete deals to get reviewed.</p>
              </div>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="glass rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? "text-warning fill-warning" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {r.reviewer_id === user?.id ? "You wrote this review" : "Review about you"}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "disputes" && (
          <div>
            <div className="flex justify-end mb-4">
              <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setShowNewDispute(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> File Dispute
              </Button>
            </div>

            {showNewDispute && (
              <div className="glass rounded-xl p-5 mb-4">
                <h3 className="font-semibold text-sm mb-3">New Dispute</h3>
                <Input
                  placeholder="User ID or email of the other party..."
                  value={againstUserId}
                  onChange={(e) => setAgainstUserId(e.target.value)}
                  className="bg-muted/50 mb-3"
                />
                <Textarea
                  placeholder="Describe the issue in detail..."
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="bg-muted/50 mb-3"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="gradient-primary text-primary-foreground" onClick={handleCreateDispute}>Submit</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowNewDispute(false); setDisputeReason(""); setAgainstUserId(""); }}>Cancel</Button>
                </div>
              </div>
            )}

            {disputes.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No disputes filed</p>
              </div>
            ) : (
              <div className="space-y-3">
                {disputes.map((d) => {
                  const sc = disputeStatusConfig[d.status] || disputeStatusConfig.open;
                  const Icon = sc.icon;
                  return (
                    <div key={d.id} className="glass rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${sc.color}`}>
                          <Icon className="w-3.5 h-3.5" /> {sc.label}
                        </span>
                        <span className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm">{d.reason}</p>
                      {d.description && (
                        <p className="text-xs text-muted-foreground mt-1">{d.description}</p>
                      )}
                      {d.deal_room_id && (
                        <Link
                          to={`/deal-room/${d.deal_room_id}`}
                          className="text-xs text-primary hover:underline mt-2 inline-block"
                        >
                          View deal room →
                        </Link>
                      )}
                      {d.resolution && (
                        <div className="mt-2 p-2 bg-accent/10 rounded-lg text-xs text-accent">
                          Resolution: {d.resolution}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reputation;
