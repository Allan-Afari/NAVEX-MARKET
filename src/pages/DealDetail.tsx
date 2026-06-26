import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, CheckCircle2, Clock, TrendingUp, Users,
  MessageSquare, FileText, Send, Plus, ChevronRight, Star, Loader2
} from "lucide-react";
import DealChat from "@/components/DealChat";
import ReportButton from "@/components/ReportButton";
import DealQualityScoreDisplay from "@/components/DealQualityScoreDisplay";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

const STAGES = [
  { key: "published", label: "Published", color: "bg-muted-foreground" },
  { key: "interest", label: "Interest", color: "bg-primary" },
  { key: "discussion", label: "Discussion", color: "bg-primary" },
  { key: "terms", label: "Terms", color: "bg-warning" },
  { key: "agreement", label: "Agreement", color: "bg-warning" },
  { key: "funding", label: "Funding", color: "bg-accent" },
  { key: "active", label: "Active", color: "bg-accent" },
  { key: "complete", label: "Complete", color: "bg-accent" },
];

interface Deal {
  id: string;
  title: string;
  description: string | null;
  sector: string | null;
  location: string | null;
  funding_amount: number | null;
  funding_type: string;
  stage: string;
  is_featured: boolean;
  created_by: string | null;
  investor_id: string | null;
  created_at: string;
}

interface DealInterest {
  id: string;
  deal_id: string;
  user_id: string;
  message: string | null;
  status: string;
  created_at: string;
}

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  is_completed: boolean;
}

interface ActivityLog {
  id: string;
  action: string;
  details: string | null;
  created_at: string;
}

interface DealUpdate {
  id: string;
  content: string;
  created_at: string;
}

const DealDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [deal, setDeal] = useState<Deal | null>(null);
  const [interests, setInterests] = useState<DealInterest[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [updates, setUpdates] = useState<DealUpdate[]>([]);
  const [interestMessage, setInterestMessage] = useState("");
  const [newUpdate, setNewUpdate] = useState("");
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [showInterestForm, setShowInterestForm] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [featureLoading, setFeatureLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "milestones" | "updates" | "activity" | "messages">("overview");
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return navigate("/login");
      setUser(session.user);
    });
  }, [navigate]);

  useEffect(() => {
    if (!id || !user) return;
    const fetchDeal = async () => {
      try {
        const [dealRes, interestsRes, milestonesRes, activityRes, updatesRes] = await Promise.all([
          supabase.from("deals").select("*").eq("id", id).single(),
          supabase.from("deal_interests").select("*").eq("deal_id", id).order("created_at", { ascending: false }).limit(50),
          supabase.from("deal_milestones").select("*").eq("deal_id", id).order("created_at", { ascending: true }).limit(50),
          supabase.from("deal_activity_log").select("*").eq("deal_id", id).order("created_at", { ascending: false }).limit(20),
          supabase.from("deal_updates").select("*").eq("deal_id", id).order("created_at", { ascending: false }).limit(20),
        ]);
        
        if (dealRes.error) {
          console.error("Deal fetch error:", dealRes.error);
          return;
        }
        
        if (interestsRes.error) console.error("Interests fetch error:", interestsRes.error);
        if (milestonesRes.error) console.error("Milestones fetch error:", milestonesRes.error);
        if (activityRes.error) console.error("Activity fetch error:", activityRes.error);
        if (updatesRes.error) console.error("Updates fetch error:", updatesRes.error);

        if (dealRes.data) setDeal(dealRes.data as Deal);
        if (interestsRes.data) setInterests(interestsRes.data);
        if (milestonesRes.data) setMilestones(milestonesRes.data);
        if (activityRes.data) setActivity(activityRes.data);
        if (updatesRes.data) setUpdates(updatesRes.data);
      } catch (error) {
        console.error("DealDetail fetch error:", error);
      }
    };
    fetchDeal();
  }, [id, user]);

  const isOwner = deal?.created_by === user?.id;
  const isInvestor = deal?.investor_id === user?.id;
  const hasExpressedInterest = interests.some((i) => i.user_id === user?.id);
  const currentStageIndex = STAGES.findIndex((s) => s.key === deal?.stage);

  const handleExpressInterest = async () => {
    if (!user || !deal) return;
    const { error } = await supabase.from("deal_interests").insert({
      deal_id: deal.id,
      user_id: user.id,
      message: interestMessage || null,
    });
    if (error) { toast.error("Failed to express interest"); return; }
    await supabase.from("deal_activity_log").insert({
      deal_id: deal.id, user_id: user.id,
      action: "interest_expressed", details: "New interest expressed",
    });
    // Move to interest stage if published
    if (deal.stage === "published") {
      await supabase.from("deals").update({ stage: "interest", updated_at: new Date().toISOString() }).eq("id", deal.id);
      setDeal((prev) => prev ? { ...prev, stage: "interest" } : null);
    }
    toast.success("Interest expressed!");
    setShowInterestForm(false);
    setInterestMessage("");
    const { data } = await supabase.from("deal_interests").select("*").eq("deal_id", deal.id);
    if (data) setInterests(data);
  };

  const handleAdvanceStage = async () => {
    if (!deal || !user) return;
    const nextIndex = currentStageIndex + 1;
    if (nextIndex >= STAGES.length) return;
    const nextStage = STAGES[nextIndex].key;
    const { error } = await supabase.from("deals").update({ stage: nextStage, updated_at: new Date().toISOString() }).eq("id", deal.id);
    if (error) { toast.error("Failed to advance stage"); return; }
    await supabase.from("deal_activity_log").insert({
      deal_id: deal.id, user_id: user.id,
      action: "stage_advanced", details: `Stage moved to ${STAGES[nextIndex].label}`,
    });
    setDeal((prev) => prev ? { ...prev, stage: nextStage } : null);
    toast.success(`Advanced to ${STAGES[nextIndex].label}`);
  };

  const handlePostUpdate = async () => {
    if (!newUpdate.trim() || !deal || !user) return;
    await supabase.from("deal_updates").insert({ deal_id: deal.id, posted_by: user.id, content: newUpdate.trim() });
    await supabase.from("deal_activity_log").insert({ deal_id: deal.id, user_id: user.id, action: "update_posted", details: newUpdate.trim().slice(0, 100) });
    toast.success("Update posted");
    setNewUpdate("");
    const { data } = await supabase.from("deal_updates").select("*").eq("deal_id", deal.id).order("created_at", { ascending: false });
    if (data) setUpdates(data);
  };

  const handleAddMilestone = async () => {
    if (!newMilestoneTitle.trim() || !deal || !user) return;
    await supabase.from("deal_milestones").insert({ deal_id: deal.id, title: newMilestoneTitle.trim() });
    toast.success("Milestone added");
    setNewMilestoneTitle("");
    setShowMilestoneForm(false);
    const { data } = await supabase.from("deal_milestones").select("*").eq("deal_id", deal.id);
    if (data) setMilestones(data);
  };

  const handleToggleMilestone = async (ms: Milestone) => {
    await supabase.from("deal_milestones").update({
      is_completed: !ms.is_completed,
      completed_at: !ms.is_completed ? new Date().toISOString() : null,
    }).eq("id", ms.id);
    setMilestones((prev) => prev.map((m) => m.id === ms.id ? { ...m, is_completed: !m.is_completed } : m));
  };

  const handleFeatureDeal = async () => {
    if (!deal || !user) return;
    setFeatureLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/paystack-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: "feature_deal",
            deal_id: deal.id,
            callback_url: `${window.location.origin}/deals/${deal.id}`,
          }),
        }
      );
      const result = await res.json();
      if (result.authorization_url) {
        window.location.href = result.authorization_url;
      } else {
        toast.error(result.error || "Failed to initialize payment");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setFeatureLoading(false);
    }
  };

  if (!deal) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const formatAmount = (n: number | null) => n ? `GH₵${n.toLocaleString()}` : "Negotiable";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container px-4 pt-24 pb-12">
        <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">{deal.title}</h1>
            <div className="flex flex-wrap gap-2 text-xs">
              {deal.sector && <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">{deal.sector}</span>}
              {deal.location && <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{deal.location}</span>}
              <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground capitalize">{deal.funding_type}</span>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <div className="text-2xl font-bold text-primary">{formatAmount(deal.funding_amount)}</div>
            <div className="text-xs text-muted-foreground">Funding Target</div>
            {isOwner && !deal.is_featured && (
              <Button size="sm" variant="outline" className="text-xs border-warning text-warning hover:bg-warning/10" onClick={handleFeatureDeal} disabled={featureLoading}>
                {featureLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Star className="w-3 h-3 mr-1" />}
                Feature Deal — GH₵50
              </Button>
            )}
            {deal.is_featured && (
              <span className="flex items-center gap-1 text-xs text-warning font-medium">
                <Star className="w-3 h-3 fill-warning" /> Featured
              </span>
            )}
            {!isOwner && user && <ReportButton opportunityId={deal.id} reporterId={user.id} />}
          </div>
        </div>

        {/* Deal Quality Score */}
        <div className="mb-6">
          <DealQualityScoreDisplay dealId={deal.id} compact={false} />
        </div>

        {/* Stage Pipeline */}
        <div className="glass rounded-xl p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Deal Pipeline</h3>
            {(isOwner || isInvestor) && currentStageIndex < STAGES.length - 1 && (
              <Button size="sm" className="gradient-primary text-primary-foreground text-xs" onClick={handleAdvanceStage}>
                Advance Stage <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {STAGES.map((s, i) => (
              <div key={s.key} className="flex items-center flex-shrink-0">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  i <= currentStageIndex
                    ? `${s.color} text-background`
                    : "bg-muted text-muted-foreground"
                } ${i === currentStageIndex ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}>
                  {i < currentStageIndex ? <CheckCircle2 className="w-3 h-3" /> : i === currentStageIndex ? <Clock className="w-3 h-3" /> : null}
                  {s.label}
                </div>
                {i < STAGES.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground mx-0.5 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* Interest CTA */}
        {!isOwner && !hasExpressedInterest && (
          <div className="glass rounded-xl p-5 mb-6">
            {showInterestForm ? (
              <div>
                <h3 className="font-semibold text-sm mb-3">Express Interest</h3>
                <Textarea
                  placeholder="Tell the business owner why you're interested..."
                  value={interestMessage}
                  onChange={(e) => setInterestMessage(e.target.value)}
                  className="bg-muted/50 mb-3"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="gradient-primary text-primary-foreground" onClick={handleExpressInterest}>
                    <Send className="w-3.5 h-3.5 mr-1.5" /> Send Interest
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowInterestForm(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">Interested in this opportunity?</h3>
                  <p className="text-xs text-muted-foreground">Express your interest to start a conversation</p>
                </div>
                <Button className="gradient-primary text-primary-foreground" onClick={() => setShowInterestForm(true)}>
                  Express Interest
                </Button>
              </div>
            )}
          </div>
        )}
        {hasExpressedInterest && !isOwner && (
          <div className="glass rounded-xl p-4 mb-6 border-l-4 border-l-accent">
            <p className="text-sm text-accent font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> You've expressed interest in this deal
            </p>
          </div>
        )}

        {/* Interests list (owner only) */}
        {isOwner && interests.length > 0 && (
          <div className="glass rounded-xl p-5 mb-6">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Interest Expressions ({interests.length})
            </h3>
            <div className="space-y-2">
              {interests.map((i) => (
                <div key={i.id} className="bg-muted/30 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm">{i.message || "No message"}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(i.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    i.status === "accepted" ? "bg-accent/10 text-accent" : i.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                  }`}>{i.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { key: "overview" as const, label: "Overview", icon: FileText },
            { key: "messages" as const, label: "Messages", icon: MessageSquare },
            { key: "milestones" as const, label: "Milestones", icon: CheckCircle2 },
            { key: "updates" as const, label: "Updates", icon: TrendingUp },
            { key: "activity" as const, label: "Activity", icon: Clock },
          ].map((t) => (
            <Button key={t.key} variant={activeTab === t.key ? "default" : "ghost"} size="sm" onClick={() => setActiveTab(t.key)}>
              <t.icon className="w-3.5 h-3.5 mr-1.5" /> {t.label}
            </Button>
          ))}
        </div>

        {activeTab === "messages" && user && (
          <DealChat dealId={deal.id} dealTitle={deal.title} user={user} isOwner={isOwner} />
        )}

        {activeTab === "overview" && (
          <div className="glass rounded-xl p-6">
            <h3 className="font-semibold mb-3">Description</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{deal.description || "No description provided."}</p>
          </div>
        )}

        {activeTab === "milestones" && (
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Milestones</h3>
              {(isOwner || isInvestor) && (
                <Button size="sm" variant="outline" onClick={() => setShowMilestoneForm(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add
                </Button>
              )}
            </div>
            {showMilestoneForm && (
              <div className="bg-muted/30 rounded-lg p-3 mb-4">
                <Input placeholder="Milestone title..." value={newMilestoneTitle} onChange={(e) => setNewMilestoneTitle(e.target.value)} className="bg-muted/50 mb-2" />
                <div className="flex gap-2">
                  <Button size="sm" className="gradient-primary text-primary-foreground" onClick={handleAddMilestone}>Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowMilestoneForm(false)}>Cancel</Button>
                </div>
              </div>
            )}
            {milestones.length === 0 ? (
              <p className="text-sm text-muted-foreground">No milestones yet</p>
            ) : (
              <div className="space-y-2">
                {milestones.map((m) => (
                  <button key={m.id} onClick={() => (isOwner || isInvestor) && handleToggleMilestone(m)} className="w-full flex items-center gap-3 bg-muted/30 rounded-lg p-3 text-left hover:bg-muted/40 transition-colors">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${m.is_completed ? "border-accent bg-accent" : "border-muted-foreground"}`}>
                      {m.is_completed && <CheckCircle2 className="w-3 h-3 text-background" />}
                    </div>
                    <span className={`text-sm ${m.is_completed ? "line-through text-muted-foreground" : ""}`}>{m.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "updates" && (
          <div className="glass rounded-xl p-6">
            {(isOwner || isInvestor) && (
              <div className="mb-4">
                <Textarea placeholder="Post a deal update..." value={newUpdate} onChange={(e) => setNewUpdate(e.target.value)} className="bg-muted/50 mb-2" />
                <Button size="sm" className="gradient-primary text-primary-foreground" onClick={handlePostUpdate}>
                  <Send className="w-3.5 h-3.5 mr-1.5" /> Post Update
                </Button>
              </div>
            )}
            {updates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No updates yet</p>
            ) : (
              <div className="space-y-3">
                {updates.map((u) => (
                  <div key={u.id} className="bg-muted/30 rounded-lg p-3">
                    <p className="text-sm">{u.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(u.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "activity" && (
          <div className="glass rounded-xl p-6">
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet</p>
            ) : (
              <div className="space-y-3">
                {activity.map((a) => (
                  <div key={a.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium capitalize">{a.action.replace(/_/g, " ")}</p>
                      {a.details && <p className="text-xs text-muted-foreground">{a.details}</p>}
                      <p className="text-xs text-muted-foreground/60">{new Date(a.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DealDetail;
