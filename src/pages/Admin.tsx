import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Users, Shield, AlertTriangle, BarChart3,
  CheckCircle2, XCircle, Search, FileText, TrendingUp, ArrowLeft,
  Ban, ShieldCheck, Trash2, Eye, Briefcase
} from "lucide-react";
import { toast } from "sonner";
import AdminComplianceDashboard from "@/components/AdminComplianceDashboard";
import BulkImportDialog from "@/components/BulkImportDialog";
import type { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  verification_status: string;
  trust_score: number;
  total_deals: number;
  is_suspended: boolean;
  suspension_reason: string | null;
  created_at: string;
}

interface Dispute {
  id: string;
  reason: string;
  status: string;
  resolution: string | null;
  initiated_by: string | null;
  against_user: string | null;
  created_at: string;
}

interface Deal {
  id: string;
  title: string;
  description: string | null;
  sector: string | null;
  location: string | null;
  is_removed: boolean;
  removal_reason: string | null;
  created_by: string | null;
  created_at: string;
}

interface VerificationRequest {
  id: string;
  user_id: string;
  document_type: string;
  document_url: string;
  business_registration_number: string | null;
  notes: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

type Tab = "users" | "disputes" | "deals" | "verifications" | "compliance" | "analytics";

const Admin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("verifications");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState("");

  const [suspendTarget, setSuspendTarget] = useState<Profile | null>(null);
  const [suspendReason, setSuspendReason] = useState("");

  const [removeTarget, setRemoveTarget] = useState<Deal | null>(null);
  const [removeReason, setRemoveReason] = useState("");

  const [verifyTarget, setVerifyTarget] = useState<VerificationRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [docUrl, setDocUrl] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { navigate("/login"); return; }
      setUser(session.user);
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      setIsAdmin(!!data?.some((r) => r.role === "admin"));
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate("/login");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchAll = async () => {
    const [profilesRes, disputesRes, dealsRes, verifsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("disputes").select("*").order("created_at", { ascending: false }),
      supabase.from("deals").select("*").order("created_at", { ascending: false }),
      supabase.from("verification_requests").select("*").order("created_at", { ascending: false }),
    ]);
    if (profilesRes.data) setProfiles(profilesRes.data as Profile[]);
    if (disputesRes.data) setDisputes(disputesRes.data);
    if (dealsRes.data) setDeals(dealsRes.data as Deal[]);
    if (verifsRes.data) setVerifications(verifsRes.data as VerificationRequest[]);
  };

  useEffect(() => {
    if (isAdmin) fetchAll();
  }, [isAdmin]);

  const handleResolveDispute = async (status: string) => {
    if (!user || !selectedDispute) return;
    const { error } = await supabase.from("disputes")
      .update({ status, resolution: resolution || null, resolved_by: user.id, updated_at: new Date().toISOString() })
      .eq("id", selectedDispute.id);
    if (error) { toast.error("Failed to update dispute"); return; }
    toast.success(`Dispute ${status}`);
    setSelectedDispute(null);
    setResolution("");
    fetchAll();
  };

  const handleSuspend = async (suspend: boolean) => {
    if (!suspendTarget) return;
    const updates = suspend
      ? { is_suspended: true, suspension_reason: suspendReason.trim() || "No reason provided", suspended_at: new Date().toISOString() }
      : { is_suspended: false, suspension_reason: null, suspended_at: null };
    const { error } = await supabase.from("profiles").update(updates).eq("id", suspendTarget.id);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success(suspend ? "User suspended" : "User reinstated");
    setSuspendTarget(null);
    setSuspendReason("");
    fetchAll();
  };

  const handleRemoveDeal = async (remove: boolean) => {
    if (!removeTarget) return;
    const updates = remove
      ? { is_removed: true, removal_reason: removeReason.trim() || "Violates terms", removed_at: new Date().toISOString() }
      : { is_removed: false, removal_reason: null, removed_at: null };
    const { error } = await supabase.from("deals").update(updates).eq("id", removeTarget.id);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success(remove ? "Deal removed" : "Deal restored");
    setRemoveTarget(null);
    setRemoveReason("");
    fetchAll();
  };

  const openVerification = async (v: VerificationRequest) => {
    setVerifyTarget(v);
    setAdminNotes(v.admin_notes || "");
    const { data } = await supabase.storage
      .from("verification-docs")
      .createSignedUrl(v.document_url, 600);
    setDocUrl(data?.signedUrl ?? null);
  };

  const handleVerifyDecision = async (status: "approved" | "rejected") => {
    if (!verifyTarget || !user) return;
    const { error } = await supabase.from("verification_requests")
      .update({ status, admin_notes: adminNotes.trim() || null, reviewed_by: user.id })
      .eq("id", verifyTarget.id);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success(`Verification ${status}`);
    setVerifyTarget(null);
    setAdminNotes("");
    setDocUrl(null);
    fetchAll();
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>;
  }
  if (!isAdmin) {
    return <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container px-4 pt-24 pb-12 text-center">
        <Shield className="w-16 h-16 mx-auto mb-4 text-destructive/30" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">You don't have admin privileges</p>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
      </div>
    </div>;
  }

  const filteredProfiles = profiles.filter(
    (p) => !searchQuery || p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredDeals = deals.filter(
    (d) => !searchQuery || d.title?.toLowerCase().includes(searchQuery.toLowerCase()) || d.sector?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const pendingVerifications = verifications.filter((v) => v.status === "pending");

  const stats = {
    totalUsers: profiles.length,
    verified: profiles.filter((p) => p.verification_status === "verified").length,
    suspended: profiles.filter((p) => p.is_suspended).length,
    openDisputes: disputes.filter((d) => d.status === "open").length,
    pendingVerifs: pendingVerifications.length,
    removedDeals: deals.filter((d) => d.is_removed).length,
  };

  const verificationConfig: Record<string, { color: string; label: string }> = {
    unverified: { color: "text-muted-foreground", label: "Unverified" },
    pending: { color: "text-warning", label: "Pending" },
    verified: { color: "text-accent", label: "Verified" },
    rejected: { color: "text-destructive", label: "Rejected" },
    approved: { color: "text-accent", label: "Approved" },
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container px-4 pt-24 pb-12">
        <h1 className="text-2xl font-bold mb-2">Admin Panel</h1>
        <p className="text-sm text-muted-foreground mb-8">Manage users, deals, verifications, and disputes</p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
          {[
            { label: "Users", value: stats.totalUsers, icon: Users, color: "text-primary" },
            { label: "Verified", value: stats.verified, icon: CheckCircle2, color: "text-accent" },
            { label: "Pending Verifs", value: stats.pendingVerifs, icon: ShieldCheck, color: "text-warning" },
            { label: "Suspended", value: stats.suspended, icon: Ban, color: "text-destructive" },
            { label: "Open Disputes", value: stats.openDisputes, icon: AlertTriangle, color: "text-destructive" },
            { label: "Removed Deals", value: stats.removedDeals, icon: Trash2, color: "text-destructive" },
          ].map((s) => (
            <div key={s.label} className="glass rounded-xl p-4">
              <s.icon className={`w-4 h-4 ${s.color} mb-2`} />
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { key: "verifications" as const, label: "Verifications", icon: ShieldCheck, badge: stats.pendingVerifs },
            { key: "compliance" as const, label: "Compliance", icon: Shield },
            { key: "users" as const, label: "Users", icon: Users },
            { key: "deals" as const, label: "Deals", icon: Briefcase },
            { key: "disputes" as const, label: "Disputes", icon: AlertTriangle, badge: stats.openDisputes },
            { key: "analytics" as const, label: "Analytics", icon: BarChart3 },
          ].map((tab) => (
            <Button key={tab.key} variant={activeTab === tab.key ? "default" : "ghost"} size="sm" onClick={() => setActiveTab(tab.key)}>
              <tab.icon className="w-3.5 h-3.5 mr-1.5" /> {tab.label}
              {tab.badge ? (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                  {tab.badge}
                </span>
              ) : null}
            </Button>
          ))}
        </div>

        {/* Verifications Tab */}
        {activeTab === "verifications" && (
          <div className="space-y-2">
            {verifications.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No verification requests yet</p>
              </div>
            ) : verifications.map((v) => {
              const profile = profiles.find((p) => p.id === v.user_id);
              const vc = verificationConfig[v.status] || verificationConfig.pending;
              return (
                <div key={v.id} className="glass rounded-xl p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium ${vc.color}`}>{vc.label.toUpperCase()}</span>
                      <span className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm font-medium truncate">{profile?.full_name || profile?.email || v.user_id}</p>
                    <p className="text-xs text-muted-foreground capitalize">{v.document_type.replace(/_/g, " ")}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openVerification(v)}>
                    <Eye className="w-3.5 h-3.5 mr-1" /> Review
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search users..." className="pl-9 bg-muted/50" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="space-y-2">
              {filteredProfiles.map((p) => {
                const vc = verificationConfig[p.verification_status] || verificationConfig.unverified;
                return (
                  <div key={p.id} className={`glass rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 ${p.is_suspended ? "border border-destructive/30" : ""}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                        {(p.full_name?.[0] || p.email?.[0] || "?").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{p.full_name || "—"} {p.is_suspended && <span className="text-xs text-destructive ml-1">(suspended)</span>}</div>
                        <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs capitalize px-2 py-0.5 rounded-full bg-secondary">{p.role}</span>
                      <span className={`text-xs ${vc.color}`}>{vc.label}</span>
                      <Button size="sm" variant={p.is_suspended ? "outline" : "ghost"} className={`text-xs h-7 ${p.is_suspended ? "" : "text-destructive hover:text-destructive"}`}
                        onClick={() => { setSuspendTarget(p); setSuspendReason(p.suspension_reason || ""); }}>
                        <Ban className="w-3 h-3 mr-1" /> {p.is_suspended ? "Reinstate" : "Suspend"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Deals Tab */}
        {activeTab === "deals" && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search deals..." className="pl-9 bg-muted/50" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              {user && <BulkImportDialog user={user} onImportComplete={fetchAll} />}
            </div>
            <div className="space-y-2">
              {filteredDeals.map((d) => (
                <div key={d.id} className={`glass rounded-xl p-4 ${d.is_removed ? "border border-destructive/30 opacity-70" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium truncate">{d.title}</p>
                        {d.is_removed && <span className="text-[10px] uppercase font-bold text-destructive">Removed</span>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {d.sector || "—"} · {d.location || "—"} · {new Date(d.created_at).toLocaleDateString()}
                      </p>
                      {d.is_removed && d.removal_reason && (
                        <p className="text-xs text-destructive mt-1">Reason: {d.removal_reason}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/deals/${d.id}`)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant={d.is_removed ? "outline" : "ghost"} className={d.is_removed ? "" : "text-destructive hover:text-destructive"}
                        onClick={() => { setRemoveTarget(d); setRemoveReason(d.removal_reason || ""); }}>
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> {d.is_removed ? "Restore" : "Remove"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disputes Tab */}
        {activeTab === "disputes" && (
          <div>
            {selectedDispute ? (
              <div>
                <Button variant="ghost" size="sm" className="mb-4" onClick={() => setSelectedDispute(null)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <div className="glass rounded-xl p-6">
                  <h3 className="font-semibold mb-3">Dispute Details</h3>
                  <p className="text-sm mb-4">{selectedDispute.reason}</p>
                  <div className="text-xs text-muted-foreground mb-4">
                    Filed on {new Date(selectedDispute.created_at).toLocaleDateString()} · Status: {selectedDispute.status}
                  </div>
                  {selectedDispute.status === "open" && (
                    <div>
                      <Textarea placeholder="Resolution notes..." value={resolution} maxLength={1000}
                        onChange={(e) => setResolution(e.target.value)} className="bg-muted/50 mb-3" />
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-accent text-accent-foreground" onClick={() => handleResolveDispute("resolved")}>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Resolve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleResolveDispute("dismissed")}>
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Dismiss
                        </Button>
                      </div>
                    </div>
                  )}
                  {selectedDispute.resolution && (
                    <div className="mt-4 p-3 bg-accent/10 rounded-lg text-sm">
                      <strong>Resolution:</strong> {selectedDispute.resolution}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {disputes.length === 0 ? (
                  <div className="glass rounded-xl p-8 text-center">
                    <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No disputes</p>
                  </div>
                ) : disputes.map((d) => (
                  <button key={d.id} onClick={() => setSelectedDispute(d)}
                    className="glass rounded-xl p-4 w-full text-left hover:bg-muted/20 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium ${d.status === "open" ? "text-warning" : d.status === "resolved" ? "text-accent" : "text-muted-foreground"}`}>
                        {d.status.toUpperCase()}
                      </span>
                      <span className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm truncate">{d.reason}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Compliance Tab */}
        {activeTab === "compliance" && (
          <div className="space-y-4">
            <AdminComplianceDashboard />
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass rounded-xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> User Breakdown</h3>
              <div className="space-y-3">
                {["business", "investor"].map((r) => {
                  const count = profiles.filter((p) => p.role === r).length;
                  const pct = stats.totalUsers ? (count / stats.totalUsers) * 100 : 0;
                  return (
                    <div key={r}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground capitalize">{r}s</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-primary rounded-full h-2" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="glass rounded-xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><Shield className="w-4 h-4 text-accent" /> Verification Status</h3>
              <div className="space-y-3">
                {["verified", "pending", "unverified", "rejected"].map((status) => {
                  const count = profiles.filter((p) => p.verification_status === status).length;
                  const vc = verificationConfig[status];
                  return (
                    <div key={status} className="flex items-center justify-between">
                      <span className={`text-sm ${vc.color}`}>{vc.label}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="glass rounded-xl p-6 md:col-span-2">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-warning" /> Dispute Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                {["open", "resolved", "dismissed"].map((status) => {
                  const count = disputes.filter((d) => d.status === status).length;
                  return (
                    <div key={status} className="p-3 bg-muted/30 rounded-lg">
                      <div className="text-xl font-bold">{count}</div>
                      <div className="text-xs text-muted-foreground capitalize">{status}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suspend dialog */}
      <Dialog open={!!suspendTarget} onOpenChange={(o) => !o && setSuspendTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Ban className="w-5 h-5 text-destructive" />
              {suspendTarget?.is_suspended ? "Reinstate User" : "Suspend User"}</DialogTitle>
            <DialogDescription>{suspendTarget?.full_name || suspendTarget?.email}</DialogDescription>
          </DialogHeader>
          {!suspendTarget?.is_suspended && (
            <Textarea placeholder="Reason for suspension..." value={suspendReason} maxLength={500}
              onChange={(e) => setSuspendReason(e.target.value)} className="bg-secondary border-border" />
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setSuspendTarget(null)}>Cancel</Button>
            <Button variant={suspendTarget?.is_suspended ? "default" : "destructive"}
              onClick={() => handleSuspend(!suspendTarget?.is_suspended)}>
              {suspendTarget?.is_suspended ? "Reinstate" : "Suspend"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove deal dialog */}
      <Dialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Trash2 className="w-5 h-5 text-destructive" />
              {removeTarget?.is_removed ? "Restore Deal" : "Remove Deal"}</DialogTitle>
            <DialogDescription>{removeTarget?.title}</DialogDescription>
          </DialogHeader>
          {!removeTarget?.is_removed && (
            <Textarea placeholder="Reason for removal (visible to owner)..." value={removeReason} maxLength={500}
              onChange={(e) => setRemoveReason(e.target.value)} className="bg-secondary border-border" />
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>Cancel</Button>
            <Button variant={removeTarget?.is_removed ? "default" : "destructive"}
              onClick={() => handleRemoveDeal(!removeTarget?.is_removed)}>
              {removeTarget?.is_removed ? "Restore" : "Remove"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Verification review dialog */}
      <Dialog open={!!verifyTarget} onOpenChange={(o) => { if (!o) { setVerifyTarget(null); setDocUrl(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /> Review Verification</DialogTitle>
            <DialogDescription>
              {(() => {
                const p = profiles.find((x) => x.id === verifyTarget?.user_id);
                return `${p?.full_name || p?.email || verifyTarget?.user_id} · ${verifyTarget?.document_type?.replace(/_/g, " ")}`;
              })()}
            </DialogDescription>
          </DialogHeader>
          {verifyTarget && (
            <div className="space-y-4">
              {verifyTarget.business_registration_number && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Business Reg #:</span>{" "}
                  <span className="font-medium">{verifyTarget.business_registration_number}</span>
                </div>
              )}
              {verifyTarget.notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Notes:</span> {verifyTarget.notes}
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Document preview:</p>
                {docUrl ? (
                  verifyTarget.document_url.toLowerCase().endsWith(".pdf") ? (
                    <iframe src={docUrl} className="w-full h-[400px] rounded-lg border border-border" />
                  ) : (
                    <img src={docUrl} alt="Verification document" className="w-full max-h-[400px] object-contain rounded-lg border border-border" />
                  )
                ) : (
                  <div className="text-xs text-muted-foreground">Loading document...</div>
                )}
              </div>
              <Textarea placeholder="Admin notes (visible to user if rejected)..." value={adminNotes} maxLength={500}
                onChange={(e) => setAdminNotes(e.target.value)} className="bg-secondary border-border" />
              {verifyTarget.status === "pending" ? (
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => handleVerifyDecision("rejected")}>
                    <XCircle className="w-4 h-4 mr-1" /> Reject
                  </Button>
                  <Button className="bg-accent text-accent-foreground" onClick={() => handleVerifyDecision("approved")}>
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-right">
                  Already {verifyTarget.status} on {verifyTarget.created_at && new Date(verifyTarget.created_at).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
