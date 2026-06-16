import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CreditCard, Crown, Star, Clock, CheckCircle2, XCircle } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface Subscription {
  id: string;
  tier: string;
  status: string;
  amount: number;
  currency: string;
  paystack_reference: string | null;
  started_at: string;
  expires_at: string | null;
  created_at: string;
}

interface FeaturedPayment {
  id: string;
  deal_id: string;
  amount: number;
  currency: string;
  paystack_reference: string | null;
  status: string;
  created_at: string;
}

const statusIcon = (status: string) => {
  switch (status) {
    case "active":
    case "paid":
      return <CheckCircle2 className="w-4 h-4 text-accent" />;
    case "pending":
      return <Clock className="w-4 h-4 text-warning" />;
    default:
      return <XCircle className="w-4 h-4 text-destructive" />;
  }
};

const statusColor = (status: string) => {
  switch (status) {
    case "active":
    case "paid":
      return "bg-accent/10 text-accent";
    case "pending":
      return "bg-warning/10 text-warning";
    default:
      return "bg-destructive/10 text-destructive";
  }
};

const Billing = () => {
  const [user, setUser] = useState<User | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [featuredPayments, setFeaturedPayments] = useState<FeaturedPayment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadBilling = useCallback(async () => {
    if (!user) return;
    setError(null);

    try {
      const [subsRes, featRes] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("featured_listing_payments")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (subsRes.error) {
        console.error("Subscription load error:", subsRes.error);
        setError("Unable to load subscriptions.");
      }
      if (featRes.error) {
        console.error("Featured payments load error:", featRes.error);
        setError((prev) => prev ? prev + " Featured payments failed to load." : "Unable to load featured payments.");
      }

      setSubscriptions(subsRes.data ?? []);
      setFeaturedPayments(featRes.data ?? []);
    } catch (loadError) {
      console.error("Billing load failed:", loadError);
      setError("Unable to load billing information.");
      toast.error("Failed to load billing details. Please try again.");
    }
  }, [user]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return navigate("/login");
      setUser(session.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate("/login");
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  const currentSubscription = subscriptions.find((s) => s.status === "active")
    ?? subscriptions.find((s) => s.status === "paid")
    ?? subscriptions[0];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container px-4 pt-24 pb-12 max-w-3xl">
        <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold mb-2">Billing & Payments</h1>
          <p className="text-sm text-muted-foreground mb-8">View your subscription and payment history</p>
        </motion.div>

        {error ? (
          <div className="glass rounded-xl p-6 mb-8 text-sm text-destructive">
            <p className="mb-4">{error}</p>
            <Button variant="outline" onClick={loadBilling}>Retry</Button>
          </div>
        ) : null}

        {/* Current Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-xl p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" /> Current Plan
            </h2>
            <Button size="sm" variant="outline" onClick={() => navigate("/pricing")}>
              {currentSubscription ? "Change Plan" : "Upgrade"}
            </Button>
          </div>
          {currentSubscription ? (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-lg font-bold capitalize">{currentSubscription.tier}</span>
                <span className={`ml-3 text-xs px-2 py-0.5 rounded-full ${statusColor(currentSubscription.status)}`}>
                  {currentSubscription.status}
                </span>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                {currentSubscription.expires_at && (
                  <p>Expires {format(new Date(currentSubscription.expires_at), "MMM d, yyyy")}</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">You're on the <span className="font-semibold text-foreground">Free</span> plan</p>
          )}
        </motion.div>

        {/* Subscription History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" /> Subscription History
          </h2>
          {subscriptions.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center text-sm text-muted-foreground">
              No subscription payments yet
            </div>
          ) : (
            <div className="space-y-2">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="glass rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {statusIcon(sub.status)}
                    <div>
                      <p className="text-sm font-medium capitalize">{sub.tier} Plan</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(sub.created_at), { addSuffix: true })}
                        {sub.paystack_reference && ` · Ref: ${sub.paystack_reference.slice(0, 12)}...`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">GH₵{sub.amount.toLocaleString()}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor(sub.status)}`}>
                      {sub.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Featured Listing Payments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-warning" /> Featured Listing Payments
          </h2>
          {featuredPayments.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center text-sm text-muted-foreground">
              No featured listing payments yet
            </div>
          ) : (
            <div className="space-y-2">
              {featuredPayments.map((fp) => (
                <div key={fp.id} className="glass rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {statusIcon(fp.status)}
                    <div>
                      <p className="text-sm font-medium">Featured Listing</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(fp.created_at), { addSuffix: true })}
                        {fp.paystack_reference && ` · Ref: ${fp.paystack_reference.slice(0, 12)}...`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">GH₵{fp.amount.toLocaleString()}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor(fp.status)}`}>
                      {fp.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Billing;
