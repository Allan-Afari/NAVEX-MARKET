import { supabase } from "@/integrations/supabase/client";

export interface DataRetentionPolicy {
  id?: string;
  user_id: string;
  deal_room_id?: string;
  retention_days: number;
  auto_delete: boolean;
  encryption_enabled: boolean;
}

export interface PrivacySettings {
  data_sharing: boolean;
  analytics_tracking: boolean;
  email_marketing: boolean;
  profile_visibility: "public" | "private" | "connections_only";
}

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  data_sharing: false,
  analytics_tracking: false,
  email_marketing: false,
  profile_visibility: "private",
};

/**
 * Create or update data retention policy
 */
export const setDataRetentionPolicy = async (
  userId: string,
  policy: Omit<DataRetentionPolicy, "user_id">
) => {
  try {
    const { error } = await supabase
      .from("data_retention_policies")
      .upsert(
        {
          user_id: userId,
          ...policy,
        },
        { onConflict: "user_id,deal_room_id" }
      );

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error setting retention policy:", error);
    return false;
  }
};

/**
 * Get user's data retention policy
 */
export const getDataRetentionPolicy = async (userId: string, dealRoomId?: string) => {
  try {
    let query = supabase
      .from("data_retention_policies")
      .select("*")
      .eq("user_id", userId);

    if (dealRoomId) {
      query = query.eq("deal_room_id", dealRoomId);
    }

    const { data, error } = await query.single();
    if (error && error.code !== "PGRST116") throw error;
    return data || null;
  } catch (error) {
    console.error("Error fetching retention policy:", error);
    return null;
  }
};

/**
 * Delete user's documents based on retention policy
 */
export const enforceDataRetention = async (userId: string) => {
  try {
    const policy = await getDataRetentionPolicy(userId);
    if (!policy || !policy.auto_delete) return 0;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days);

    // Soft delete documents
    const { data, error } = await supabase
      .from("deal_room_documents")
      .update({ deleted_at: new Date().toISOString() })
      .eq("uploaded_by", userId)
      .lt("uploaded_at", cutoffDate.toISOString())
      .is("deleted_at", null);

    if (error) throw error;
    return data?.length || 0;
  } catch (error) {
    console.error("Error enforcing data retention:", error);
    return 0;
  }
};

/**
 * Export user's personal data (GDPR right to portability)
 */
export const exportUserData = async (userId: string) => {
  try {
    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    // Fetch user's deals
    const { data: deals } = await supabase
      .from("deals")
      .select("*")
      .eq("created_by", userId);

    // Fetch user's deal rooms
    const { data: roomParticipations } = await supabase
      .from("deal_room_participants")
      .select("*, room:deal_room_id(*)")
      .eq("user_id", userId);

    // Fetch user's documents
    const { data: documents } = await supabase
      .from("deal_room_documents")
      .select("*")
      .eq("uploaded_by", userId);

    // Fetch user's activity
    const { data: activities } = await supabase
      .from("deal_room_activity")
      .select("*")
      .eq("user_id", userId);

    // Compile export
    const exportData = {
      exportDate: new Date().toISOString(),
      profile,
      deals,
      dealRoomParticipations: roomParticipations,
      documents,
      activities,
    };

    return exportData;
  } catch (error) {
    console.error("Error exporting user data:", error);
    return null;
  }
};

/**
 * Delete user's account and associated data (GDPR right to be forgotten)
 */
export const deleteUserAccount = async (userId: string) => {
  try {
    // Start transaction-like behavior
    const deletes = [];

    // Delete user's activities
    deletes.push(
      supabase.from("deal_room_activity").delete().eq("user_id", userId)
    );

    // Delete user's compliance flags
    deletes.push(
      supabase.from("compliance_flags").delete().eq("user_id", userId)
    );

    // Delete user's messages
    deletes.push(
      supabase.from("deal_room_messages").delete().eq("sender_id", userId)
    );

    // Anonymize user's documents
    deletes.push(
      supabase
        .from("deal_room_documents")
        .update({ uploaded_by: "anonymous" })
        .eq("uploaded_by", userId)
    );

    // Delete data retention policy
    deletes.push(
      supabase.from("data_retention_policies").delete().eq("user_id", userId)
    );

    // Delete profile
    deletes.push(supabase.from("profiles").delete().eq("id", userId));

    // Execute all deletes
    const results = await Promise.all(deletes);
    const hasErrors = results.some((result) => result.error);

    if (hasErrors) {
      throw new Error("Some deletions failed");
    }

    return true;
  } catch (error) {
    console.error("Error deleting user account:", error);
    return false;
  }
};

/**
 * Anonymize user profile (alternative to deletion)
 */
export const anonymizeUser = async (userId: string) => {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: "Anonymous User",
        email: null,
        phone: null,
        bio: null,
        location: null,
        company_name: null,
      })
      .eq("id", userId);

    if (error) throw error;

    // Anonymize related content
    await supabase
      .from("deal_room_documents")
      .update({ uploaded_by: "anonymous" })
      .eq("uploaded_by", userId);

    await supabase
      .from("deal_room_messages")
      .update({ sender_id: null })
      .eq("sender_id", userId);

    return true;
  } catch (error) {
    console.error("Error anonymizing user:", error);
    return false;
  }
};

/**
 * Get user's privacy settings
 */
export const getUserPrivacySettings = async (
  userId: string
): Promise<PrivacySettings | null> => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("privacy_settings")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data?.privacy_settings || null;
  } catch (error) {
    console.error("Error fetching privacy settings:", error);
    return null;
  }
};

/**
 * Update user's privacy settings
 */
export const updateUserPrivacySettings = async (
  userId: string,
  settings: Partial<PrivacySettings>
) => {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({ privacy_settings: settings })
      .eq("id", userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating privacy settings:", error);
    return false;
  }
};
