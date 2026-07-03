import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Building2, Wallet } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { checkComplianceOnSignup } from "@/lib/complianceWorkflow";
import { updateUserPrivacySettings, DEFAULT_PRIVACY_SETTINGS } from "@/lib/dataPrivacy";

type Role = "business" | "investor";
type Step = "role" | "details";

const Signup = () => {
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Step 1: Create the auth user (email/password)
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName, role },
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      return;
    }

    const userId = data.user?.id;
    if (userId) {
      void checkComplianceOnSignup(userId).catch((err) => {
        console.error("Compliance check failed during signup:", err);
      });

      void updateUserPrivacySettings(userId, {
        ...DEFAULT_PRIVACY_SETTINGS,
        email_marketing: true,
        profile_visibility: "connections_only",
      }).catch((err) => {
        console.error("Failed to initialize privacy settings:", err);
      });
    }

    toast({ title: "Account created ✅", description: "Please check your email to confirm your account." });
    navigate("/dashboard");
  };

  const handleGoogleSignup = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast({ title: "Google sign-in failed", description: String(result.error), variant: "destructive" });
      return;
    }
    if (result.redirected) return;
    navigate("/dashboard");
  };

  const stepLabel =
    step === "role" ? "Choose your role"
    : "Account details";

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4 py-8">
      <SEOHead title="Sign Up" description="Create your Navex Market account — join as a business or investor" />
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <div className="glass rounded-xl p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-1">Create Your Account</h1>
            <p className="text-sm text-muted-foreground">{stepLabel}</p>
            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 mt-4">
              {(["role", "details"] as Step[]).map((s, i) => {
                const currentIdx = ["role", "details"].indexOf(step);
                return (
                  <div
                    key={s}
                    className={`h-1.5 rounded-full transition-all ${
                      i <= currentIdx ? "w-6 bg-primary" : "w-2 bg-border"
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {step === "role" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center mb-2">I want to join as a...</p>
              {([
                { value: "business" as Role, icon: Building2, title: "Business", desc: "Seeking funding for my business" },
                { value: "investor" as Role, icon: Wallet, title: "Investor", desc: "Looking to fund opportunities" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setRole(opt.value); setStep("details"); }}
                  className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all hover:border-primary/50 hover:bg-secondary ${role === opt.value ? "border-primary bg-secondary" : "border-border"}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <opt.icon className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">{opt.title}</div>
                    <div className="text-xs text-muted-foreground">{opt.desc}</div>
                  </div>
                </button>
              ))}

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
              </div>

              <Button variant="outline" className="w-full" onClick={handleGoogleSignup}>
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continue with Google
              </Button>
            </div>
          )}

          {step === "details" && (
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <button type="button" onClick={() => setStep("role")} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
                <ArrowLeft className="w-3 h-3" /> Change role
              </button>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-2">
                {role === "business" ? <Building2 className="w-3 h-3" /> : <Wallet className="w-3 h-3" />}
                {role === "business" ? "Business" : "Investor"}
              </div>
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" className="mt-1 bg-secondary border-border" required />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1 bg-secondary border-border" required />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" className="mt-1 bg-secondary border-border" minLength={6} required />
              </div>
              <Button type="submit" className="w-full gradient-primary text-primary-foreground hover:opacity-90" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
