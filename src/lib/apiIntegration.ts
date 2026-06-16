/**
 * API Integration Service
 * Handles API key management, webhook subscriptions, and external integrations
 */

import { supabase } from "@/integrations/supabase/client";
import crypto from "crypto";

export interface ApiKey {
  id: string;
  user_id: string;
  key: string; // hashed
  name: string;
  description?: string;
  scopes: string[]; // e.g., ["deals:read", "deals:write", "chat:read"]
  rate_limit: number; // requests per minute
  last_used_at?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface WebhookSubscription {
  id: string;
  user_id: string;
  url: string;
  events: string[]; // e.g., ["deal.created", "message.sent", "signature.completed"]
  signing_secret: string; // for webhook validation
  is_active: boolean;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface WebhookEvent {
  id: string;
  subscription_id: string;
  event_type: string;
  resource_type: string;
  resource_id: string;
  payload: any;
  status: "pending" | "delivered" | "failed";
  retry_count: number;
  next_retry_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  event_id: string;
  subscription_id: string;
  attempt_number: number;
  status_code?: number;
  response_body?: string;
  error?: string;
  delivered_at?: string;
  created_at: string;
}

/**
 * Generate a new API key for the current user
 */
export const generateApiKey = async (
  name: string,
  description?: string,
  scopes: string[] = ["deals:read", "chat:read"],
  rate_limit: number = 60
): Promise<{ key: string; apiKey: ApiKey } | null> => {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.user?.id) throw new Error("Not authenticated");

    // Generate a random key
    const rawKey = `sk_${crypto.randomBytes(24).toString("hex")}`;
    const hashedKey = hashApiKey(rawKey);

    const { data, error } = await supabase
      .from("api_keys")
      .insert({
        user_id: session.user.id,
        key: hashedKey,
        name,
        description,
        scopes,
        rate_limit,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      key: rawKey, // Return unencrypted key only once
      apiKey: data as ApiKey,
    };
  } catch (error) {
    console.error("Error generating API key:", error);
    return null;
  }
};

/**
 * Revoke an API key
 */
export const revokeApiKey = async (apiKeyId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("api_keys")
      .update({ is_active: false })
      .eq("id", apiKeyId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error revoking API key:", error);
    return false;
  }
};

/**
 * List all API keys for the current user
 */
export const listApiKeys = async (): Promise<ApiKey[]> => {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.user?.id) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("api_keys")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as ApiKey[];
  } catch (error) {
    console.error("Error listing API keys:", error);
    return [];
  }
};

/**
 * Create a webhook subscription
 */
export const createWebhookSubscription = async (
  url: string,
  events: string[]
): Promise<WebhookSubscription | null> => {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.user?.id) throw new Error("Not authenticated");

    const signingSecret = crypto.randomBytes(32).toString("hex");

    const { data, error } = await supabase
      .from("webhook_subscriptions")
      .insert({
        user_id: session.user.id,
        url,
        events,
        signing_secret: signingSecret,
        is_active: true,
        retry_count: 3,
      })
      .select()
      .single();

    if (error) throw error;
    return data as WebhookSubscription;
  } catch (error) {
    console.error("Error creating webhook subscription:", error);
    return null;
  }
};

/**
 * Disable a webhook subscription
 */
export const disableWebhookSubscription = async (
  subscriptionId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("webhook_subscriptions")
      .update({ is_active: false })
      .eq("id", subscriptionId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error disabling webhook subscription:", error);
    return false;
  }
};

/**
 * List all webhook subscriptions for the current user
 */
export const listWebhookSubscriptions = async (): Promise<
  WebhookSubscription[]
> => {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.user?.id) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("webhook_subscriptions")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as WebhookSubscription[];
  } catch (error) {
    console.error("Error listing webhook subscriptions:", error);
    return [];
  }
};

/**
 * Trigger a webhook event (called by backend)
 * This would typically be called from a Supabase function or Edge Function
 */
export const triggerWebhookEvent = async (
  eventType: string,
  resourceType: string,
  resourceId: string,
  payload: any
): Promise<void> => {
  try {
    // In production, this would be called from a backend service
    // For now, we just insert the event into the database
    const { error } = await supabase.from("webhook_events").insert({
      event_type: eventType,
      resource_type: resourceType,
      resource_id: resourceId,
      payload,
      status: "pending",
      retry_count: 0,
    });

    if (error) throw error;
  } catch (error) {
    console.error("Error triggering webhook event:", error);
  }
};

/**
 * Get webhook event logs
 */
export const getWebhookEventLogs = async (
  subscriptionId: string,
  limit: number = 50
): Promise<WebhookEvent[]> => {
  try {
    const { data, error } = await supabase
      .from("webhook_events")
      .select("*")
      .eq("subscription_id", subscriptionId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as WebhookEvent[];
  } catch (error) {
    console.error("Error getting webhook event logs:", error);
    return [];
  }
};

/**
 * Helper: Hash API key for storage
 */
const hashApiKey = (key: string): string => {
  return crypto.createHash("sha256").update(key).digest("hex");
};

/**
 * Helper: Verify webhook signature
 * Validates that the webhook came from Navex Market
 */
export const verifyWebhookSignature = (
  payload: string,
  signature: string,
  secret: string
): boolean => {
  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
};

/**
 * Helper: Format webhook for delivery
 */
export const formatWebhookPayload = (event: WebhookEvent) => {
  return {
    id: event.id,
    event: event.event_type,
    timestamp: event.created_at,
    data: {
      type: event.resource_type,
      id: event.resource_id,
      ...event.payload,
    },
  };
};
