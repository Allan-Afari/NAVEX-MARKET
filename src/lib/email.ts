import { supabase } from "@/integrations/supabase/client";

const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email-notification`;

async function callEmailFunction(payload: Record<string, unknown>): Promise<{ success: boolean; error?: unknown }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(EDGE_FN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      return { success: false, error: err };
    }
    return { success: true };
  } catch (error) {
    console.error("Email function call failed:", error);
    return { success: false, error };
  }
}

export const sendEmail = (options: { to: string; subject: string; html: string }) =>
  callEmailFunction({ to: options.to, subject: options.subject, html: options.html });

export const sendWelcomeEmail = (email: string, name: string) =>
  callEmailFunction({ type: "welcome", to_email: email, name });

export const sendPasswordResetEmail = (email: string, resetLink: string) =>
  callEmailFunction({ type: "password_reset", to_email: email, reset_link: resetLink });