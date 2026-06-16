import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Users, Briefcase, Shield, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface OnboardingData {
  full_name: string;
  company_name: string;
  role: "business" | "investor";
  bio: string;
  sectors: string[];
  location: string;
}

const BUSINESS_SECTORS = [
  "Technology",
  "Agriculture",
  "Healthcare",
  "Real Estate",
  "Manufacturing",
  "Retail",
  "Energy",
  "Education",
  "Finance",
];

const steps = [
  { id: "role", title: "Select Your Role", description: "Are you a business seeking funding or an investor?" },
  { id: "profile", title: "Complete Your Profile", description: "Tell us about yourself" },
  { id: "preferences", title: "Set Your Preferences", description: "Help us match you with opportunities" },
  { id: "verify", title: "Verify Your Account", description: "Identity verification (optional now, required later)" },
];

export const OnboardingFlow = ({ user }: { user: User }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    full_name: user?.user_metadata?.full_name || "",
    company_name: "",
    role: "business",
    bio: "",
    sectors: [],
    location: "",
  });
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has completed onboarding
    const checkOnboarding = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarded_at")
        .eq("id", user.id)
        .single();

      if (profile?.onboarded_at) {
        setCompleted(true);
      }
    };
    checkOnboarding();
  }, [user]);

  const handleRoleSelect = (role: "business" | "investor") => {
    setData((prev) => ({ ...prev, role }));
    setCurrentStep(1);
  };

  const handleSectorToggle = (sector: string) => {
    setData((prev) => ({
      ...prev,
      sectors: prev.sectors.includes(sector)
        ? prev.sectors.filter((s) => s !== sector)
        : [...prev.sectors, sector].slice(0, 5),
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // Validate required fields
      if (!data.full_name.trim()) {
        toast.error("Full name is required");
        return;
      }

      if (!data.company_name.trim()) {
        toast.error("Company/Business name is required");
        return;
      }

      if (!data.location.trim()) {
        toast.error("Location is required");
        return;
      }

      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: data.full_name,
          company_name: data.company_name,
          role: data.role,
          bio: data.bio || null,
          preferred_sectors: data.sectors.length > 0 ? data.sectors : null,
          location: data.location,
          onboarded_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Welcome to Navex Market!");
      setCompleted(true);
      navigate("/dashboard");
    } catch (err) {
      console.error("Onboarding error:", err);
      toast.error("Failed to complete onboarding");
    } finally {
      setLoading(false);
    }
  };

  if (completed) return null;

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle>{step.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
            </div>
            <div className="text-xs text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </div>
          </div>
          <div className="w-full bg-secondary h-1 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </CardHeader>

        <CardContent>
          {/* Step 0: Role Selection */}
          {currentStep === 0 && (
            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={() => handleRoleSelect("business")}
                className="p-6 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition group"
              >
                <Briefcase className="w-8 h-8 text-primary mb-4 group-hover:scale-110 transition" />
                <h3 className="font-semibold mb-2">I'm a Business</h3>
                <p className="text-sm text-muted-foreground">
                  I'm seeking funding to grow my venture
                </p>
              </button>

              <button
                onClick={() => handleRoleSelect("investor")}
                className="p-6 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition group"
              >
                <Users className="w-8 h-8 text-primary mb-4 group-hover:scale-110 transition" />
                <h3 className="font-semibold mb-2">I'm an Investor</h3>
                <p className="text-sm text-muted-foreground">
                  I'm looking for investment opportunities
                </p>
              </button>
            </div>
          )}

          {/* Step 1: Profile */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Full Name *</label>
                <Input
                  value={data.full_name}
                  onChange={(e) => setData((prev) => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Your name"
                  className="bg-muted/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {data.role === "business" ? "Business Name" : "Company/Organization"} *
                </label>
                <Input
                  value={data.company_name}
                  onChange={(e) => setData((prev) => ({ ...prev, company_name: e.target.value }))}
                  placeholder="Your business or company name"
                  className="bg-muted/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Location *</label>
                <Input
                  value={data.location}
                  onChange={(e) => setData((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="City, Country"
                  className="bg-muted/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Bio (Optional)</label>
                <Textarea
                  value={data.bio}
                  onChange={(e) => setData((prev) => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell us about yourself or your business"
                  rows={3}
                  className="bg-muted/50"
                />
              </div>
            </div>
          )}

          {/* Step 2: Preferences */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-3">
                  {data.role === "business" ? "Your Business Sector" : "Preferred Investment Sectors"} (up to 5)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {BUSINESS_SECTORS.map((sector) => (
                    <button
                      key={sector}
                      onClick={() => handleSectorToggle(sector)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        data.sectors.includes(sector)
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary border border-border hover:border-primary"
                      }`}
                    >
                      {sector}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                {data.role === "business"
                  ? "Help investors find deals in your sector"
                  : "We'll recommend opportunities matching your interests"}
              </p>
            </div>
          )}

          {/* Step 3: Verification */}
          {currentStep === 3 && (
            <div className="text-center py-6">
              <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Verify Your Identity (Optional)</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Identity verification unlocks more features and builds trust. You can skip this now and verify later from your profile settings.
              </p>
              <div className="bg-accent/10 border border-accent rounded-lg p-4 text-sm mb-6">
                <p className="text-muted-foreground">
                  ✓ Verified users receive priority in deal matching<br />
                  ✓ Higher trust scores unlock premium features
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 justify-between mt-8">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {currentStep < steps.length - 1 ? (
              <Button onClick={() => setCurrentStep(currentStep + 1)}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={loading} className="gap-2">
                {loading ? "Completing..." : "Complete Onboarding"}
                <CheckCircle2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingFlow;
