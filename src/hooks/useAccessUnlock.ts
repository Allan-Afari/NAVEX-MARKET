import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Tracks whether the current user has unlocked contact access for an
 * investment opportunity. Business owners are considered "unlocked" by default.
 *
 * MVP: unlock is a free, one-click action (simulated payment).
 */
export function useAccessUnlock(opportunityId: string | undefined, userId: string | undefined, isOwner: boolean) {
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);

  const refresh = useCallback(async () => {
    if (!opportunityId || !userId) { setLoading(false); return; }
    if (isOwner) { setUnlocked(true); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("access_unlocks")
      .select("id")
      .eq("opportunity_id", opportunityId)
      .eq("investor_id", userId)
      .maybeSingle();
    setUnlocked(!!data);
    setLoading(false);
  }, [opportunityId, userId, isOwner]);

  useEffect(() => { refresh(); }, [refresh]);

  const unlock = useCallback(async () => {
    if (!opportunityId || !userId) return;
    setUnlocking(true);
    const { error } = await supabase
      .from("access_unlocks")
      .insert({ opportunity_id: opportunityId, investor_id: userId });
    setUnlocking(false);
    if (error && !error.message.includes("duplicate")) {
      toast.error("Failed to unlock contact");
      return;
    }
    toast.success("Contact unlocked — you can now message the business");
    setUnlocked(true);
  }, [opportunityId, userId]);

  return { unlocked, loading, unlocking, unlock };
}
