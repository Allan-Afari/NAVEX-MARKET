import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Star, FileText, LogOut, CheckCircle2, Clock, PenLine, Save, MapPin, X, Plus, ShieldCheck, AlertCircle, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import VerificationDialog from "@/components/VerificationDialog";
import SmileIdVerifyButton from "@/components/SmileIdVerifyButton";
import { exportUserData, deleteUserAccount, getUserPrivacySettings, updateUserPrivacySettings, PrivacySettings, DEFAULT_PRIVACY_SETTINGS } from "@/lib/dataPrivacy";
import type { User } from "@supabase/supabase-js";

interface ProfileData {
  full_name: string | null;
  role: string;
  trust_score: number;
  verification_status: string;
  total_deals: number;
  bio: string | null;
  company_name: string | null;
  sector: string | null;
  location: string | null;
  preferred_regions: string[] | null;
  preferred_sectors: string[] | null;
}

const SECTOR_OPTIONS = ["Technology", "Agriculture", "Healthcare", "Real Estate", "Manufacturing", "Retail", "Energy", "Education", "Finance"];

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: "", bio: "", company_name: "", sector: "", location: "" });
  const [regions, setRegions] = useState<string[]>([]);
  const [regionInput, setRegionInput] = useState("");
  const [sectors, setSectors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(DEFAULT_PRIVACY_SETTINGS);
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const navigate = useNavigate();

  const refreshProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (data) setProfile(data as ProfileData);
  };

  useEffect(() => {
    if (!user) return;
    supabase
      .from("verification_requests")
      .select("status")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .limit(1)
      .then(({ data }) => setPendingVerification(!!data?.length));
  }, [user]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/login");
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/login");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
      if (data) {
        const p = data as ProfileData;
        setProfile(p);
        setForm({
          full_name: p.full_name || "",
          bio: p.bio || "",
          company_name: p.company_name || "",
          sector: p.sector || "",
          location: p.location || "",
        });
        setRegions(p.preferred_regions || []);
        setSectors(p.preferred_sectors || []);
      }
    });
    
    // Load privacy settings
    (async () => {
      try {
        const settings = await getUserPrivacySettings(user.id);
        setPrivacySettings(settings ?? DEFAULT_PRIVACY_SETTINGS);

      } catch (error) {
        console.error("Failed to load privacy settings:", error);
      }
    })();
  }, [user]);

  const toggleSector = (s: string) =>
    setSectors((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const addRegion = () => {
    const v = regionInput.trim();
    if (!v) return;
    if (v.length > 60) { toast.error("Region too long (max 60 chars)"); return; }
    if (regions.length >= 10) { toast.error("Max 10 regions"); return; }
    if (regions.some((r) => r.toLowerCase() === v.toLowerCase())) { setRegionInput(""); return; }
    setRegions([...regions, v]);
    setRegionInput("");
  };
  const removeRegion = (r: string) => setRegions(regions.filter((x) => x !== r));

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleExportData = async () => {
    if (!user) return;

    try {
      setPrivacyLoading(true);
      const exportData = await exportUserData(user.id);
      
      // Create downloadable JSON file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `navex-market-export-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      toast.success("Your data has been exported successfully.");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export your data.");
    } finally {
      setPrivacyLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone and will remove all your personal data from our system."
    );

    if (!confirmed) return;

    try {
      setPrivacyLoading(true);
      await deleteUserAccount(user.id);
      
      // Sign out and redirect
      await supabase.auth.signOut();
      navigate("/");
      toast.success("Your account has been deleted.");
    } catch (error) {
      console.error("Account deletion failed:", error);
      toast.error("Failed to delete your account.");
    } finally {
      setPrivacyLoading(false);
    }
  };

  const handlePrivacySettingChange = async (
    setting: keyof Omit<PrivacySettings, "profile_visibility">,
    value: boolean
  ) => {
    if (!user) return;

    try {
      const newSettings: PrivacySettings = {
        ...privacySettings,
        [setting]: value,
      };
      await updateUserPrivacySettings(user.id, newSettings);
      setPrivacySettings(newSettings);
      toast.success("Privacy settings updated.");
    } catch (error) {
      console.error("Failed to update privacy settings:", error);
      toast.error("Failed to update privacy settings.");
    }
  };

  const handleVisibilityChange = async (value: PrivacySettings["profile_visibility"]) => {
    if (!user) return;

    try {
      const newSettings: PrivacySettings = {
        ...privacySettings,
        profile_visibility: value,
      };
      await updateUserPrivacySettings(user.id, newSettings);
      setPrivacySettings(newSettings);
      toast.success("Privacy settings updated.");
    } catch (error) {
      console.error("Failed to update profile visibility:", error);
      toast.error("Failed to update privacy settings.");
    }
  };


  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name,
      bio: form.bio,
      company_name: form.company_name,
      sector: form.sector,
      location: form.location,
      preferred_regions: regions,
      preferred_sectors: sectors,
    }).eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to save profile");
    } else {
      setProfile((prev) => prev ? { ...prev, ...form, preferred_regions: regions, preferred_sectors: sectors } : prev);
      setEditing(false);
      toast.success("Profile updated!");
    }
  };

  const role = profile?.role || user?.user_metadata?.role || "business";
  const verificationIcon = profile?.verification_status === "verified" ? CheckCircle2 : Clock;
  const verificationColor = profile?.verification_status === "verified" ? "text-accent" : "text-warning";

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Profile" description="Manage your Navex Market profile" />
      <Navbar />
      <div className="container px-4 pt-24 pb-12 max-w-2xl">
        <div className="glass rounded-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                {(profile?.full_name?.[0] || user?.email?.[0] || "?").toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-bold">{profile?.full_name || user?.user_metadata?.full_name || "User"}</h1>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {role === "business" ? "Business" : "Investor"}
                  </span>
                  {(() => { const Icon = verificationIcon; return (
                    <span className={`inline-flex items-center gap-1 text-xs ${verificationColor}`}>
                      <Icon className="w-3 h-3" /> {profile?.verification_status || "Pending"}
                    </span>
                  ); })()}
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
              <PenLine className="w-4 h-4 mr-1" /> {editing ? "Cancel" : "Edit"}
            </Button>
          </div>

          {editing ? (
            <div className="space-y-4 mb-6">
              <div>
                <Label>Full Name</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1 bg-secondary border-border" />
              </div>
              <div>
                <Label>Company Name</Label>
                <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="mt-1 bg-secondary border-border" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Sector</Label>
                  <Input value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} className="mt-1 bg-secondary border-border" />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="mt-1 bg-secondary border-border" />
                </div>
              </div>
              <div>
                <Label>Bio</Label>
                <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="mt-1 bg-secondary border-border" rows={3} />
              </div>
              <div>
                <Label className="flex items-center gap-1.5">⭐ Preferred Sectors for Alerts</Label>
                <p className="text-xs text-muted-foreground mt-1 mb-2">Tap to follow sectors you want alerts for. Matches weigh more in your alert reasons.</p>
                <div className="flex flex-wrap gap-1.5">
                  {SECTOR_OPTIONS.map((s) => {
                    const active = sectors.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSector(s)}
                        className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border hover:text-foreground"}`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Preferred Regions for Alerts</Label>
                <p className="text-xs text-muted-foreground mt-1 mb-2">Get notified about new opportunities in any of these cities or regions.</p>
                <div className="flex gap-2">
                  <Input
                    value={regionInput}
                    onChange={(e) => setRegionInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRegion(); } }}
                    placeholder="e.g., Lagos, Abuja, Nairobi"
                    maxLength={60}
                    className="bg-secondary border-border"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addRegion}><Plus className="w-4 h-4" /></Button>
                </div>
                {regions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {regions.map((r) => (
                      <span key={r} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
                        <MapPin className="w-3 h-3" />{r}
                        <button type="button" onClick={() => removeRegion(r)} className="hover:text-destructive"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground">
                <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          ) : (
            <>
              {(profile?.company_name || profile?.bio || profile?.sector || profile?.location || (profile?.preferred_regions && profile.preferred_regions.length > 0) || (profile?.preferred_sectors && profile.preferred_sectors.length > 0)) && (
                <div className="mb-4 p-3 bg-muted/30 rounded-lg space-y-2">
                  {profile?.company_name && <div><span className="text-xs text-muted-foreground">Company:</span> <span className="text-sm font-medium">{profile.company_name}</span></div>}
                  {profile?.sector && <div><span className="text-xs text-muted-foreground">Sector:</span> <span className="text-sm">{profile.sector}</span></div>}
                  {profile?.location && <div><span className="text-xs text-muted-foreground">Location:</span> <span className="text-sm">{profile.location}</span></div>}
                  {profile?.preferred_sectors && profile.preferred_sectors.length > 0 && (
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground mt-0.5">Alert sectors:</span>
                      {profile.preferred_sectors.map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">{s}</span>
                      ))}
                    </div>
                  )}
                  {profile?.preferred_regions && profile.preferred_regions.length > 0 && (
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground mt-0.5">Alert regions:</span>
                      {profile.preferred_regions.map((r) => (
                        <span key={r} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                          <MapPin className="w-3 h-3" />{r}
                        </span>
                      ))}
                    </div>
                  )}
                  {profile?.bio && <div><span className="text-xs text-muted-foreground">Bio:</span> <span className="text-sm">{profile.bio}</span></div>}
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { icon: Shield, label: "Verification", value: profile?.verification_status || "Pending" },
              { icon: Star, label: "Trust Score", value: profile?.trust_score?.toFixed(1) || "0.0" },
              { icon: FileText, label: "Deals", value: String(profile?.total_deals || 0) },
            ].map((s) => (
              <div key={s.label} className="text-center p-3 rounded-lg bg-secondary">
                <s.icon className="w-4 h-4 text-primary mx-auto mb-1" />
                <div className="text-sm font-semibold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Verification CTA */}
          {profile?.verification_status !== "verified" && (
            <div className="mb-4 p-4 rounded-xl border border-primary/30 bg-primary/5">
              <div className="flex items-start gap-3 mb-3">
                <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">Get Verified</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {pendingVerification
                      ? "Your verification is under review. We'll respond within 48 hours."
                      : profile?.verification_status === "rejected"
                      ? "Your previous submission was rejected. You may resubmit with valid documents."
                      : "Boost trust and get priority placement. Choose automatic Smile ID or manual document upload."}
                  </p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {user && <SmileIdVerifyButton userId={user.id} status={profile?.verification_status} />}
                {!pendingVerification && (
                  <Button size="sm" variant="ghost" onClick={() => setVerifyOpen(true)}>
                    Upload Documents Manually
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Privacy & Data Controls */}
          <div className="mb-4 p-4 rounded-xl border border-border bg-muted/20">
            <div className="flex items-start gap-3 mb-3">
              <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold">Privacy & Data</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Download a copy of your data, manage privacy settings, or delete your account.
                </p>
              </div>
            </div>

            {privacySettings && (
              <div className="mb-4 space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacySettings.data_sharing || false}
                    onChange={(e) => handlePrivacySettingChange("data_sharing", e.target.checked)}
                    className="rounded"
                  />
                  <span>Allow profile data sharing with verified partners</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacySettings.analytics_tracking || false}
                    onChange={(e) => handlePrivacySettingChange("analytics_tracking", e.target.checked)}
                    className="rounded"
                  />
                  <span>Allow usage analytics for service improvement</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacySettings.email_marketing || false}
                    onChange={(e) => handlePrivacySettingChange("email_marketing", e.target.checked)}
                    className="rounded"
                  />
                  <span>Receive marketing emails and promotions</span>
                </label>
                <div className="mt-4">
                  <Label htmlFor="profile-visibility" className="text-xs font-semibold">
                    Profile visibility
                  </Label>
                  <select
                    id="profile-visibility"
                    value={privacySettings.profile_visibility}
                    onChange={(e) => handleVisibilityChange(e.target.value as PrivacySettings["profile_visibility"])}
                    className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="private">Only me</option>
                    <option value="connections_only">Connections only</option>
                    <option value="public">Public</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-2">
                    Control who can view your profile in Navex Market.
                  </p>
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportData}
                disabled={privacyLoading}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Download My Data (GDPR)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDeleteAccount}
                disabled={privacyLoading}
                className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
                Delete Account
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => navigate("/reputation")}>
              <Star className="w-4 h-4 mr-2" /> View Reputation
            </Button>
            <Button variant="outline" onClick={handleLogout} className="border-destructive/30 text-destructive hover:bg-destructive/10">
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      </div>
      {user && (
        <VerificationDialog
          userId={user.id}
          open={verifyOpen}
          onOpenChange={setVerifyOpen}
          onSubmitted={() => {
            setPendingVerification(true);
            refreshProfile();
          }}
        />
      )}
    </div>
  );
};

export default Profile;
