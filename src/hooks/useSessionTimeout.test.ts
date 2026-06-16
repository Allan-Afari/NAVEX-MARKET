import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    },
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    },
  },
}));

// Mock window.location
const mockLocation = { href: "" };
Object.defineProperty(window, "location", {
  value: mockLocation,
  writable: true,
});

import { useSessionTimeout, useTokenRefresh } from "./useSessionTimeout";
import { supabase } from "@/integrations/supabase/client";

describe("useSessionTimeout Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("useSessionTimeout", () => {
    it("should initialize with session not expiring", () => {
      const { result } = renderHook(() => useSessionTimeout());

      expect(result.current.sessionExpiring).toBe(false);
      expect(result.current.timeRemaining).toBe(0);
    });

    it("should show warning before timeout", () => {
      const { result } = renderHook(() => useSessionTimeout());

      // Fast-forward to warning time (25 minutes)
      act(() => {
        vi.advanceTimersByTime(25 * 60 * 1000);
      });

      expect(result.current.sessionExpiring).toBe(true);
    });

    it("should call logout when timeout reached", () => {
      const { result } = renderHook(() => useSessionTimeout());

      // Fast-forward to timeout (30 minutes)
      act(() => {
        vi.advanceTimersByTime(30 * 60 * 1000);
      });

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it("should reset timer on user activity", () => {
      const { result } = renderHook(() => useSessionTimeout());

      // Simulate some time passing
      act(() => {
        vi.advanceTimersByTime(10 * 60 * 1000);
      });

      // Simulate user activity
      act(() => {
        result.current.resetTimer();
      });

      // Fast-forward to original warning time - should trigger warning since reset restarted timers
      act(() => {
        vi.advanceTimersByTime(25 * 60 * 1000);
      });

      expect(result.current.sessionExpiring).toBe(true);
    });

    it("should call logout when logout function is called", () => {
      const { result } = renderHook(() => useSessionTimeout());

      act(() => {
        result.current.logout();
      });

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe("useTokenRefresh", () => {
    it("should refresh token periodically", () => {
      renderHook(() => useTokenRefresh());

      // Fast-forward 10 minutes
      act(() => {
        vi.advanceTimersByTime(10 * 60 * 1000);
      });

      expect(supabase.auth.refreshSession).toHaveBeenCalled();
    });
  });
});
