import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Building2, Wallet, Phone, ShieldCheck } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { checkComplianceOnSignup } from "@/lib/complianceWorkflow";
import { updateUserPrivacySettings, DEFAULT_PRIVACY_SETTINGS } from "@/lib/dataPrivacy";

type Role = "business" | "investor";
type Step = "role" | "details" | "phone" | "otp";

const RESEND_COOLDOWN_SECONDS = 60;

const normalizePhone = (raw: string) => {
  const trimmed = raw.replace(/\s+/g, "");
  if (trimmed.startsWith("+")) return trimmed;
  if (trimmed.startsWith("0")) return `+233${trimmed.slice(1)}`;
  return `+${trimmed}`;
};

const Signup = () => {
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  // Locked, normalized phone we sent the OTP to — never trust the input field after send.
  const verifiedPhoneRef = useRef<string>("");
  const pendingUserIdRef = useRef<string | null>(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Resend cooldown ticker
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // Auto-focus OTP input when step changes to otp
  useEffect(() => {
    if (step === "otp" && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [step]);

  // Step 1: Create the auth user (email/password). Then move to phone step.
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
    // Stash the user id from signUp — works whether or not email confirmation is on.
    pendingUserIdRef.current = data.user?.id ?? null;
    toast({ title: "Account created", description: "Now let's verify your phone number." });
    setStep("phone");
  };

  // Send (or resend) the SMS OTP. Uses signInWithOtp which works with or without a session.
  const sendOtp = async (targetPhone: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone: targetPhone,
      options: { shouldCreateUser: false }, // user already exists from signUp
    });
    if (error) throw error;
  };

  // Step 2: First send.
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const normalized = normalizePhone(phone);
    try {
      await sendOtp(normalized);
      verifiedPhoneRef.current = normalized;
      setPhone(normalized);
      setResendIn(RESEND_COOLDOWN_SECONDS);
      toast({ title: "Code sent", description: `We sent a 6-digit code to ${normalized}` });
      setStep("otp");
    } catch (err: unknown) {
      const error = err as Error;
      toast({ title: "Couldn't send code", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Resend (no step change — stays on the OTP screen).
  const handleResend = async () => {
    if (resendIn > 0 || !verifiedPhoneRef.current) return;
    setLoading(true);
    try {
      await sendOtp(verifiedPhoneRef.current);
      setResendIn(RESEND_COOLDOWN_SECONDS);
      setOtp("");
      toast({ title: "Code resent", description: `New code sent to ${verifiedPhoneRef.current}` });
    } catch (err: unknown) {
      const error = err as Error;
      toast({ title: "Couldn't resend", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Verify. signInWithOtp + verifyOtp({ type: "sms" }) gives us a real session
  // tied to the current user, so we can safely persist phone_verified=true.
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const targetPhone = verifiedPhoneRef.current;
    const { data, error } = await supabase.auth.verifyOtp({
      phone: targetPhone,
      token: otp,
      type: "sms",
    });
    if (error || !data.session?.user) {
      setLoading(false);
      toast({
        title: "Invalid code",
        description: error?.message || "Could not verify the code. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // The session user is now guaranteed authenticated — bind the phone to THIS user.
    const authedUserId = data.session.user.id;
    // Sanity check: must match the user we created at signUp (defends against any
    // edge case where verifyOtp returns a different account).
    if (pendingUserIdRef.current && pendingUserIdRef.current !== authedUserId) {
      setLoading(false);
      toast({
        title: "Account mismatch",
        description: "This phone is linked to a different account. Use a different number or log in.",
        variant: "destructive",
      });
      return;
    }

    const { error: updErr } = await supabase
      .from("profiles")
      .update({ phone: targetPhone, phone_verified: true })
      .eq("id", authedUserId);

    setLoading(false);
    if (updErr) {
      toast({
        title: "Phone verified, but profile update failed",
        description: updErr.message,
        variant: "destructive",
      });
      return;
    }

    // Trigger automatic compliance check on signup
    await checkComplianceOnSignup(authedUserId).catch((err) => {
      console.error("Compliance check failed during signup:", err);
    });

    // Initialize default privacy settings
    await updateUserPrivacySettings(authedUserId, {
      ...DEFAULT_PRIVACY_SETTINGS,
      email_marketing: true,
      profile_visibility: "connections_only",
    }).catch((err) => {
      console.error("Failed to initialize privacy settings:", err);
    });

    toast({ title: "Phone verified ✅", description: "Welcome to Navex Market!" });
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
    : step === "details" ? "Account details"
    : step === "phone" ? "Verify your phone"
    : "Enter verification code";

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
              {(["role", "details", "phone", "otp"] as Step[]).map((s, i) => {
                const currentIdx = ["role", "details", "phone", "otp"].indexOf(step);
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
                {loading ? "Creating account..." : "Continue"}
              </Button>
            </form>
          )}

          {step === "phone" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto">
                <Phone className="w-5 h-5" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                We'll send a 6-digit code by SMS to verify you're a real person. This helps keep Navex Market safe.
              </p>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+233 24 123 4567"
                  className="mt-1 bg-secondary border-border"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">Ghana numbers starting with 0 will be auto-formatted to +233.</p>
              </div>
              <Button type="submit" className="w-full gradient-primary text-primary-foreground hover:opacity-90" disabled={loading}>
                {loading ? "Sending code..." : "Send Code"}
              </Button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Enter the 6-digit code sent to <strong>{phone}</strong>
              </p>
              <div>
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  ref={otpInputRef}
                  id="otp"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="mt-1 bg-secondary border-border text-center text-lg tracking-widest"
                  required
                />
              </div>
              <Button type="submit" className="w-full gradient-primary text-primary-foreground hover:opacity-90" disabled={loading || otp.length !== 6}>
                {loading ? "Verifying..." : "Verify & Continue"}
              </Button>
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setStep("phone")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Wrong number?
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendIn > 0 || loading}
                  className="text-primary hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed"
                >
                  {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
                </button>
              </div>
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
