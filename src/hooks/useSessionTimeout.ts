import { useEffect, useCallback, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SESSION_WARNING_TIME = 25 * 60 * 1000; // Warning 5 mins before expiry
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 min total session

export const useSessionTimeout = () => {
  const [sessionExpiring, setSessionExpiring] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const activityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }, []);

  const setupTimers = useCallback(() => {
    // Clear existing timers
    if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    setSessionExpiring(false);
    setTimeRemaining(0);

    // Warn user 5 mins before timeout
    warningTimerRef.current = setTimeout(() => {
      setSessionExpiring(true);
      
      // Start countdown
      let remaining = 5 * 60;
      countdownIntervalRef.current = setInterval(() => {
        remaining--;
        setTimeRemaining(remaining);
        if (remaining <= 0) {
          clearInterval(countdownIntervalRef.current!);
          logout();
        }
      }, 1000);
    }, SESSION_WARNING_TIME);

    // Auto logout after 30 mins
    activityTimerRef.current = setTimeout(() => {
      logout();
    }, SESSION_TIMEOUT);
  }, [logout]);

  const resetTimer = useCallback(() => {
    setupTimers();
  }, [setupTimers]);

  useEffect(() => {
    if (!sessionExpiring) {
      setupTimers();
    }

    // Track user activity
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    const handleActivity = () => {
      if (!sessionExpiring) {
        setupTimers();
      }
    };

    events.forEach((event) => window.addEventListener(event, handleActivity));

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity));
      if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [setupTimers, sessionExpiring]);

  return { sessionExpiring, timeRemaining, resetTimer, logout };
};

/**
 * Periodically refresh the session token
 */
export const useTokenRefresh = () => {
  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      try {
        const refreshResult = await supabase.auth.refreshSession();
        const data = refreshResult?.data;
        const error = refreshResult?.error;
        if (error) {
          console.warn("Token refresh failed:", error);
        }
      } catch (err) {
        console.error("Error refreshing token:", err);
      }
    }, 10 * 60 * 1000); // Refresh every 10 mins

    return () => clearInterval(refreshInterval);
  }, []);
};

/**
 * Monitor session state and redirect if session invalid
 */
export const useSessionGuard = () => {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          window.location.href = "/login";
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);
};
