import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Bell, Mail, Smartphone, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";

const NOTIFICATION_TYPES: { key: string; label: string; description: string }[] = [
  { key: "deal_interest", label: "Deal Interest", description: "When someone expresses interest in your opportunity" },
  { key: "message", label: "Messages", description: "New chat messages from other users" },
  { key: "opportunity_alert", label: "Opportunity Matches", description: "New deals matching your preferred sectors and regions" },
  { key: "verification", label: "Verification Updates", description: "When your verification is approved or rejected" },
  { key: "moderation", label: "Account & Moderation", description: "Account suspensions, reinstatements, and deal takedowns" },
  { key: "agreement", label: "Agreements", description: "Agreement signatures and updates" },
];

interface Prefs {
  in_app_enabled: boolean;
  email_enabled: boolean;
  muted_types: string[];
}

const NotificationPreferences = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs>({
    in_app_enabled: true,
    email_enabled: true,
    muted_types: [],
  });

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      setUserId(session.user.id);
      const { data } = await supabase
        .from("notification_preferences")
        .select("in_app_enabled, email_enabled, muted_types")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (data) setPrefs(data as Prefs);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const save = async (next: Prefs) => {
    if (!userId) return;
    setPrefs(next);
    setSaving(true);
    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: userId, ...next }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast.error("Failed to save preferences");
    } else {
      toast.success("Preferences updated");
    }
  };

  const toggleChannel = (key: "in_app_enabled" | "email_enabled", value: boolean) => {
    save({ ...prefs, [key]: value });
  };

  const toggleType = (type: string, muted: boolean) => {
    const next = muted
      ? [...prefs.muted_types.filter((t) => t !== type), type]
      : prefs.muted_types.filter((t) => t !== type);
    save({ ...prefs, muted_types: next });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Notification Preferences | Navex Market" description="Control which notifications you receive and how they're delivered." />
      <Navbar />
      <main className="container max-w-3xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} className="mb-4 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to profile
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="w-7 h-7 text-primary" /> Notifications
          </h1>
          <p className="text-muted-foreground mt-1">Choose how and when Navex reaches you.</p>
        </div>

        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Delivery channels</h2>
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <div className="font-medium">In-app notifications</div>
                  <p className="text-sm text-muted-foreground">Show alerts in the bell menu and toasts.</p>
                </div>
              </div>
              <Switch checked={prefs.in_app_enabled} onCheckedChange={(v) => toggleChannel("in_app_enabled", v)} disabled={saving} />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-accent mt-0.5" />
                <div>
                  <div className="font-medium">Email notifications</div>
                  <p className="text-sm text-muted-foreground">Receive important alerts at your sign-up email.</p>
                </div>
              </div>
              <Switch checked={prefs.email_enabled} onCheckedChange={(v) => toggleChannel("email_enabled", v)} disabled={saving} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-1">Alert types</h2>
          <p className="text-sm text-muted-foreground mb-4">Turn off any alert types you don't want to be notified about.</p>
          <div className="divide-y divide-border">
            {NOTIFICATION_TYPES.map((t) => {
              const muted = prefs.muted_types.includes(t.key);
              return (
                <div key={t.key} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div>
                    <div className="font-medium">{t.label}</div>
                    <p className="text-sm text-muted-foreground">{t.description}</p>
                  </div>
                  <Switch checked={!muted} onCheckedChange={(v) => toggleType(t.key, !v)} disabled={saving} />
                </div>
              );
            })}
          </div>
        </Card>

        <p className="text-xs text-muted-foreground mt-6">
          Note: account-critical alerts (e.g. security warnings) may still be delivered regardless of these settings.
        </p>
      </main>
    </div>
  );
};

export default NotificationPreferences;
