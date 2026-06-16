/**
 * Compliance Workflow Automation
 * Automatically triggers compliance checks and creates flags at key points
 * Integrates with complianceChecks.ts service
 */

import { supabase } from "@/integrations/supabase/client";
import { performComplianceCheck, getComplianceFlags } from "./complianceChecks";
import { logDealRoomActivity } from "./activityTracking";
import { sendComplianceFlagEmail } from "./emailEventTriggers";

/**
 * Auto-check compliance when user signs up
 * Called from signup/onboarding flow
 */
export const checkComplianceOnSignup = async (userId: string) => {
  try {
    const complianceResult = await performComplianceCheck(userId);

    if (complianceResult.flags.length > 0) {
      console.log(
        `[COMPLIANCE] Flags raised for new user ${userId}:`,
        complianceResult.flags
      );

      // Log for audit trail
      await logDealRoomActivity(userId, {
        deal_room_id: "system",
        action: "compliance_check_triggered",
        description: "Automatic compliance check on account creation",
        metadata: {
          flags: complianceResult.flags,
          risk_score: complianceResult.riskScore,
        },
      }).catch(() => null); // Don't fail if logging fails
    }

    return complianceResult;
  } catch (error) {
    console.error("Error checking compliance on signup:", error);
    return null;
  }
};

/**
 * Auto-check compliance when deal is posted
 * Called from deal creation flow
 */
export const checkComplianceOnDealPost = async (
  userId: string,
  dealId: string,
  dealValue?: number
) => {
  try {
    const complianceResult = await performComplianceCheck(
      userId,
      dealId,
      dealValue
    );

    if (!complianceResult.passed) {
      console.log(
        `[COMPLIANCE] Deal ${dealId} flagged for user ${userId}. Risk: ${complianceResult.riskScore}`
      );

      // Notify admins if risk is critical
      if (complianceResult.riskScore >= 85) {
        await notifyAdminsOfComplianceFlag(
          userId,
          dealId,
          complianceResult.riskScore,
          complianceResult.recommendations
        ).catch(() => null);
      }
    }

    return complianceResult;
  } catch (error) {
    console.error("Error checking compliance on deal post:", error);
    return null;
  }
};

/**
 * Auto-check compliance when deal room is created
 * Called from DealRoomCreate flow
 */
export const checkComplianceOnDealRoomCreate = async (
  userId: string,
  dealRoomId: string,
  dealId: string
) => {
  try {
    const complianceResult = await performComplianceCheck(userId, dealId);

    if (!complianceResult.passed) {
      console.log(
        `[COMPLIANCE] Deal room ${dealRoomId} created under compliance watch`
      );

      // Log to activity trail
      await logDealRoomActivity(userId, {
        deal_room_id: dealRoomId,
        action: "deal_room_created_with_flags",
        description: "Deal room created - compliance review recommended",
        metadata: {
          flags: complianceResult.flags,
          risk_score: complianceResult.riskScore,
        },
      }).catch(() => null);
    }

    return complianceResult;
  } catch (error) {
    console.error("Error checking compliance on deal room creation:", error);
    return null;
  }
};

/**
 * Get all pending compliance flags for admin review
 */
export const getPendingComplianceFlags = async (status?: string) => {
  try {
    let query = supabase
      .from("compliance_flags")
      .select(
        `
        id,
        user_id,
        deal_room_id,
        flag_type,
        severity,
        status,
        description,
        created_at,
        user:profiles(full_name, email),
        deal_room:deal_rooms(title)
      `
      );

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching pending compliance flags:", error);
    return [];
  }
};

/**
 * Get compliance flag statistics for dashboard
 */
export const getComplianceStats = async () => {
  try {
    const { data: allFlags, error: flagsError } = await supabase
      .from("compliance_flags")
      .select("id, severity, status");

    if (flagsError) throw flagsError;

    const stats = {
      total: allFlags?.length || 0,
      critical: allFlags?.filter((f: any) => f.severity === "critical").length || 0,
      high: allFlags?.filter((f: any) => f.severity === "high").length || 0,
      medium: allFlags?.filter((f: any) => f.severity === "medium").length || 0,
      low: allFlags?.filter((f: any) => f.severity === "low").length || 0,
      open: allFlags?.filter((f: any) => f.status === "open").length || 0,
      resolved: allFlags?.filter((f: any) => f.status === "resolved").length || 0,
    };

    return stats;
  } catch (error) {
    console.error("Error fetching compliance stats:", error);
    return {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      open: 0,
      resolved: 0,
    };
  }
};

/**
 * Resolve a compliance flag
 */
export const resolveComplianceFlag = async (
  flagId: string,
  resolution: string,
  notes?: string
) => {
  try {
    const { error } = await supabase
      .from("compliance_flags")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        resolution_notes: notes,
      })
      .eq("id", flagId);

    if (error) throw error;

    console.log(`[COMPLIANCE] Flag ${flagId} resolved: ${resolution}`);
    return true;
  } catch (error) {
    console.error("Error resolving compliance flag:", error);
    return false;
  }
};

/**
 * Escalate a compliance flag
 */
export const escalateComplianceFlag = async (
  flagId: string,
  escalationReason: string
) => {
  try {
    const { error } = await supabase
      .from("compliance_flags")
      .update({
        severity: "critical",
        escalated_at: new Date().toISOString(),
        escalation_reason: escalationReason,
      })
      .eq("id", flagId);

    if (error) throw error;

    console.log(
      `[COMPLIANCE] Flag ${flagId} escalated. Reason: ${escalationReason}`
    );
    return true;
  } catch (error) {
    console.error("Error escalating compliance flag:", error);
    return false;
  }
};

/**
 * Notify admins of critical compliance flag
 */
export const notifyAdminsOfComplianceFlag = async (
  userId: string,
  dealId: string,
  riskScore: number,
  recommendations: string[]
) => {
  try {
    // Get all admin users
    const { data: admins, error: adminError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("role", "admin");

    if (adminError) throw adminError;
    if (!admins || admins.length === 0) return;

    // Get user and deal info
    const { data: user } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .single();

    const { data: deal } = await supabase
      .from("deals")
      .select("title")
      .eq("id", dealId)
      .single();

    // Send email to all admins
    for (const admin of admins) {
      await sendComplianceFlagEmail(
        admin.email,
        user?.full_name || userId,
        deal?.title || "Unknown Deal",
        riskScore,
        recommendations
      ).catch(() => null); // Don't fail if email fails
    }
  } catch (error) {
    console.error("Error notifying admins of compliance flag:", error);
  }
};

/**
 * Generate compliance report for specific date range
 */
export const generateComplianceReport = async (
  startDate: Date,
  endDate: Date
) => {
  try {
    const { data: flags, error } = await supabase
      .from("compliance_flags")
      .select(
        `
        *,
        user:profiles(full_name, email),
        deal_room:deal_rooms(title)
      `
      )
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;

    const report = {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      summary: {
        totalFlags: flags?.length || 0,
        bySeverity: {
          critical: flags?.filter((f: any) => f.severity === "critical").length || 0,
          high: flags?.filter((f: any) => f.severity === "high").length || 0,
          medium: flags?.filter((f: any) => f.severity === "medium").length || 0,
          low: flags?.filter((f: any) => f.severity === "low").length || 0,
        },
        byStatus: {
          open: flags?.filter((f: any) => f.status === "open").length || 0,
          resolved: flags?.filter((f: any) => f.status === "resolved").length || 0,
          escalated: flags?.filter((f: any) => f.escalated_at).length || 0,
        },
      },
      flags: flags || [],
    };

    return report;
  } catch (error) {
    console.error("Error generating compliance report:", error);
    return null;
  }
};
