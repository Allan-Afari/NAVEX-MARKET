import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ArrowRight, X, MapPin, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AlertNotification {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  created_at: string;
}

const OpportunityAlert = ({ userId }: { userId: string }) => {
  const [alert, setAlert] = useState<AlertNotification | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    // Subscribe to realtime opportunity_alert notifications
    let channel: any = null;

    if (typeof supabase.channel === "function") {
      channel = supabase.channel(`opportunity_alerts_${userId}`);
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          const notif = payload.new as AlertNotification & { type: string };
          if (notif.type === "opportunity_alert" && !dismissed.has(notif.id)) {
            setAlert(notif);
            // Auto-dismiss after 15 seconds
            setTimeout(() => {
              setAlert((prev) => (prev?.id === notif.id ? null : prev));
            }, 15000);
          }
        }
      );
      channel.subscribe();
    } else {
      console.warn("Realtime opportunity alerts are unavailable in this environment.");
    }

    return () => {
      if (channel && typeof supabase.removeChannel === "function") {
        supabase.removeChannel(channel);
      }
    };
  }, [userId, dismissed]);

  // Also check for recent unread opportunity alerts on mount
  useEffect(() => {
    const checkRecent = async () => {
      try {
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const queryBuilder = supabase.from("notifications").select("*");
        if (!queryBuilder || typeof queryBuilder.eq !== "function" || typeof queryBuilder.gte !== "function" || typeof queryBuilder.order !== "function" || typeof queryBuilder.limit !== "function") {
          console.warn("Supabase query chaining unavailable for opportunity alerts.");
          return;
        }

        const { data } = await queryBuilder
          .eq("user_id", userId)
          .eq("type", "opportunity_alert")
          .eq("is_read", false)
          .gte("created_at", fiveMinAgo)
          .order("created_at", { ascending: false })
          .limit(1);

        if (data && data.length > 0 && !dismissed.has(data[0].id)) {
          setAlert(data[0]);
          setTimeout(() => {
            setAlert((prev) => (prev?.id === data[0].id ? null : prev));
          }, 15000);
        }
      } catch (error) {
        console.error("Unable to check opportunity alerts:", error);
      }
    };
    checkRecent();
  }, [userId, dismissed]);

  const handleView = async () => {
    if (!alert) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", alert.id);
    if (alert.link) navigate(alert.link);
    setAlert(null);
  };

  const handleDismiss = async () => {
    if (!alert) return;
    setDismissed((prev) => new Set(prev).add(alert.id));
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", alert.id);
    setAlert(null);
  };

  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          initial={{ y: -100, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -100, opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[95vw] max-w-md"
        >
          <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-background/95 backdrop-blur-xl shadow-2xl shadow-primary/20">
            {/* Animated pulse border */}
            <div className="absolute inset-0 rounded-2xl border-2 border-primary/50 animate-pulse pointer-events-none" />

            {/* Top accent bar */}
            <div className="h-1 w-full gradient-primary" />

            <div className="p-4">
              {/* Header with icon */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center animate-pulse">
                    <Zap className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      New Opportunity Nearby!
                    </h3>
                    <p className="text-[10px] text-muted-foreground">
                      Matches your sector profile
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Alert content */}
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {alert.body}
              </p>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={handleView}
                  className="flex-1 gradient-primary text-primary-foreground hover:opacity-90 h-10 text-sm font-semibold"
                >
                  View Opportunity
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDismiss}
                  className="h-10 text-sm border-border"
                >
                  Later
                </Button>
              </div>
            </div>

            {/* Progress bar that shows auto-dismiss countdown */}
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 15, ease: "linear" }}
              className="h-0.5 gradient-primary"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OpportunityAlert;
