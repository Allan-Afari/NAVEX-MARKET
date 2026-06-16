import { supabase } from "@/integrations/supabase/client";

export interface ActivityLog {
  deal_room_id: string;
  action: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Log an activity event in a deal room
 * Used for compliance, audit trails, and transparency
 */
export const logDealRoomActivity = async (
  userId: string,
  activityData: ActivityLog
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("deal_room_activity")
      .insert({
        deal_room_id: activityData.deal_room_id,
        user_id: userId,
        action: activityData.action,
        description: activityData.description,
        metadata: activityData.metadata || {},
        ip_address: await getUserIP(),
        user_agent: navigator.userAgent,
      });

    if (error) {
      console.error("Failed to log activity:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error logging activity:", error);
    return false;
  }
};

/**
 * Get activity history for a deal room
 */
export const getDealRoomActivityHistory = async (
  dealRoomId: string,
  limit: number = 50
) => {
  try {
    const { data, error } = await supabase
      .from("deal_room_activity")
      .select("*, user:user_id(full_name, email)")
      .eq("deal_room_id", dealRoomId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching activity history:", error);
    return [];
  }
};

/**
 * Export activity audit trail for compliance
 */
export const exportActivityAuditTrail = async (
  dealRoomId: string,
  format: "csv" | "json" = "csv"
) => {
  try {
    const { data, error } = await supabase
      .from("deal_room_activity")
      .select("*")
      .eq("deal_room_id", dealRoomId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    if (format === "json") {
      return JSON.stringify(data, null, 2);
    }

    // Convert to CSV
    if (!data || data.length === 0) return "";

    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((row) =>
      Object.values(row)
        .map((val) => {
          if (typeof val === "string" && val.includes(",")) {
            return `"${val}"`;
          }
          return val;
        })
        .join(",")
    );

    return [headers, ...rows].join("\n");
  } catch (error) {
    console.error("Error exporting audit trail:", error);
    return null;
  }
};

/**
 * Get user's IP address (best effort)
 */
const getUserIP = async (): Promise<string | null> => {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    return data.ip || null;
  } catch {
    return null;
  }
};

/**
 * Get activity summary for a deal room
 */
export const getActivitySummary = async (dealRoomId: string) => {
  try {
    const { data, error } = await supabase
      .from("deal_room_activity")
      .select("action")
      .eq("deal_room_id", dealRoomId);

    if (error) throw error;

    const summary: Record<string, number> = {};
    data?.forEach((item) => {
      summary[item.action] = (summary[item.action] || 0) + 1;
    });

    return summary;
  } catch (error) {
    console.error("Error getting activity summary:", error);
    return {};
  }
};
