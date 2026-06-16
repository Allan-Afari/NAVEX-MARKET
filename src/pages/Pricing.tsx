import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

const tiers = [
  {
    key: "free",
    name: "Free",
    price: "GH₵0",
    period: "forever",
    description: "Get started and explore the platform",
    features: ["Basic profile", "Browse marketplace", "3 deal interests/month", "Standard messaging"],
    cta: "Get Started",
    highlighted: false,
  },
  {
    key: "pro",
    name: "Pro",
    price: "GH₵150",
    period: "/month",
    description: "For active businesses and investors",
    features: ["Enhanced visibility", "Priority in search", "Unlimited deal interests", "Analytics dashboard", "Premium support"],
    cta: "Go Pro",
    highlighted: true,
  },
  {
    key: "premium",
    name: "Premium",
    price: "GH₵450",
    period: "/month",
    description: "Maximum exposure and early access",
    features: ["Featured listings", "Early access to deals", "Premium verified badge", "Advanced analytics", "Dedicated account manager", "Custom agreement templates"],
    cta: "Go Premium",
    highlighted: false,
  },
];

const Pricing = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentTier, setCurrentTier] = useState<string>("free");
  const [loading, setLoading] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch active subscription
  useEffect(() => {
    if (!user) return;
    supabase
      .from("subscriptions")
      .select("tier")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setCurrentTier(data[0].tier);
      });
  }, [user]);

  // Check for payment verification on return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("reference");
    if (!ref) return;

    const verify = async () => {
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
          body: JSON.stringify({ action: "verify", reference: ref }),
        }
      );
      const result = await res.json();
      if (result.verified) {
        toast.success(`Payment verified! You're now on the ${result.tier || "upgraded"} plan.`);
        if (result.tier) setCurrentTier(result.tier);
      } else {
        toast.error("Payment verification failed. Contact support if charged.");
      }
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    };
    verify();
  }, []);

  const handleSubscribe = async (tierKey: string) => {
    if (!user) {
      navigate("/signup");
      return;
    }
    if (tierKey === "free" || tierKey === currentTier) return;

    setLoading(tierKey);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

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
            action: "subscribe",
            tier: tierKey,
            callback_url: `${window.location.origin}/pricing`,
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
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container px-4 pt-24 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Simple, <span className="text-gradient">Value-Based</span> Pricing
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Pay for trust, structure, and successful outcomes — not just features.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {tiers.map((tier, i) => {
            const isActive = currentTier === tier.key;
            return (
              <motion.div
                key={tier.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-xl p-6 relative ${tier.highlighted ? "gradient-primary glow-primary" : "glass"}`}
              >
                {isActive && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-bold">
                    <Crown className="w-3 h-3" /> Current Plan
                  </div>
                )}
                <h3 className={`text-lg font-semibold mb-1 ${tier.highlighted ? "text-primary-foreground" : ""}`}>{tier.name}</h3>
                <p className={`text-xs mb-4 ${tier.highlighted ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{tier.description}</p>
                <div className="mb-6">
                  <span className={`text-3xl font-bold ${tier.highlighted ? "text-primary-foreground" : ""}`}>{tier.price}</span>
                  <span className={`text-sm ${tier.highlighted ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{tier.period}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {tier.features.map((f) => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${tier.highlighted ? "text-primary-foreground/90" : "text-muted-foreground"}`}>
                      <Check className="w-4 h-4 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${tier.highlighted ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90" : "gradient-primary text-primary-foreground hover:opacity-90"}`}
                  disabled={isActive || loading === tier.key}
                  onClick={() => handleSubscribe(tier.key)}
                >
                  {loading === tier.key ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  {isActive ? "Current Plan" : tier.cta}
                </Button>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>Payments securely processed by Paystack. Plus a small success fee on completed deals. No hidden costs.</p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Pricing;
