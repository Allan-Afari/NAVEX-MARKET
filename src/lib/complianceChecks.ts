import { supabase } from "@/integrations/supabase/client";

export type ComplianceFlagType = "aml" | "kyc" | "sanctions" | "high_value" | "geographic_risk" | "suspicious_activity";
export type ComplianceSeverity = "low" | "medium" | "high" | "critical";
export type ComplianceStatus = "pending" | "reviewed" | "cleared" | "escalated";

export interface ComplianceCheckResult {
  passed: boolean;
  flags: ComplianceFlag[];
  riskScore: number;
  recommendations: string[];
}

export interface ComplianceFlag {
  id?: string;
  flag_type: ComplianceFlagType;
  severity: ComplianceSeverity;
  description: string;
  status?: ComplianceStatus;
}

const RISK_THRESHOLDS = {
  high_value: 100000, // GH₵
  critical_countries: ["KP", "IR", "SY"], // North Korea, Iran, Syria (OFAC list)
  max_deal_value: 10000000, // GH₵
};

/**
 * Perform comprehensive compliance check on a user and deal
 */
export const performComplianceCheck = async (
  userId: string,
  dealRoomId: string,
  dealValue?: number
): Promise<ComplianceCheckResult> => {
  const flags: ComplianceFlag[] = [];
  let riskScore = 0;
  const recommendations: string[] = [];

  try {
    // Check 1: User KYC Status
    const { data: userData } = await supabase
      .from("profiles")
      .select("verification_status, country, created_at")
      .eq("id", userId)
      .single();

    if (userData?.verification_status !== "verified") {
      flags.push({
        flag_type: "kyc",
        severity: "high",
        description: "User KYC verification not completed",
      });
      riskScore += 30;
      recommendations.push("Require user to complete KYC verification");
    }

    // Check 2: Geographic Risk (basic)
    if (userData?.country && RISK_THRESHOLDS.critical_countries.includes(userData.country)) {
      flags.push({
        flag_type: "geographic_risk",
        severity: "critical",
        description: `User from high-risk jurisdiction: ${userData.country}`,
      });
      riskScore += 50;
      recommendations.push("Escalate to compliance team for manual review");
    }

    // Check 3: High-Value Transaction
    if (dealValue && dealValue > RISK_THRESHOLDS.high_value) {
      flags.push({
        flag_type: "high_value",
        severity: dealValue > RISK_THRESHOLDS.max_deal_value ? "critical" : "medium",
        description: `High-value transaction detected: ${dealValue}`,
      });
      riskScore += dealValue > 500000 ? 25 : 15;
      recommendations.push("Enhanced due diligence required");
      recommendations.push("Manual review recommended before transaction");
    }

    // Check 4: Account Age (potential risk)
    if (userData?.created_at) {
      const accountAgeInDays =
        (Date.now() - new Date(userData.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (accountAgeInDays < 7) {
        flags.push({
          flag_type: "suspicious_activity",
          severity: "medium",
          description: "New account attempting high-value transaction",
        });
        riskScore += 20;
        recommendations.push("Monitor account for suspicious patterns");
      }
    }

    // Check 5: Existing Disputes
    const { data: disputes } = await supabase
      .from("dispute_resolutions")
      .select("*")
      .or(`initiator_id.eq.${userId},defendant_id.eq.${userId}`)
      .eq("status", "open");

    if (disputes && disputes.length > 0) {
      flags.push({
        flag_type: "suspicious_activity",
        severity: "medium",
        description: `User has ${disputes.length} active dispute(s)`,
      });
      riskScore += 15 * disputes.length;
      recommendations.push("Review user's dispute history");
    }

    // Store compliance flags
    if (flags.length > 0) {
      const flagsToInsert = flags.map((flag) => ({
        user_id: userId,
        deal_room_id: dealRoomId,
        flag_type: flag.flag_type,
        severity: flag.severity,
        description: flag.description,
        status: riskScore >= 75 ? "escalated" : "pending",
      }));

      await supabase.from("compliance_flags").insert(flagsToInsert);
    }

    return {
      passed: riskScore < 75,
      flags,
      riskScore: Math.min(100, riskScore),
      recommendations,
    };
  } catch (error) {
    console.error("Compliance check error:", error);
    return {
      passed: false,
      flags: [],
      riskScore: 50,
      recommendations: ["Error during compliance check - manual review required"],
    };
  }
};

/**
 * Get compliance flags for a user/deal
 */
export const getComplianceFlags = async (userId?: string, dealRoomId?: string) => {
  try {
    let query = supabase.from("compliance_flags").select("*");

    if (userId) query = query.eq("user_id", userId);
    if (dealRoomId) query = query.eq("deal_room_id", dealRoomId);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching compliance flags:", error);
    return [];
  }
};

/**
 * Update compliance flag status (admin only)
 */
export const updateComplianceFlag = async (
  flagId: string,
  status: ComplianceStatus,
  resolution?: string
) => {
  try {
    const { error } = await supabase
      .from("compliance_flags")
      .update({
        status,
        reviewer_id: (await supabase.auth.getUser()).data.user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", flagId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating compliance flag:", error);
    return false;
  }
};

/**
 * Generate compliance report for regulatory purposes
 */
export const generateComplianceReport = async (dealRoomId: string) => {
  try {
    const { data: activities } = await supabase
      .from("deal_room_activity")
      .select("*")
      .eq("deal_room_id", dealRoomId);

    const { data: flags } = await supabase
      .from("compliance_flags")
      .select("*")
      .eq("deal_room_id", dealRoomId);

    const { data: room } = await supabase
      .from("deal_rooms")
      .select("*")
      .eq("id", dealRoomId)
      .single();

    return {
      reportDate: new Date().toISOString(),
      dealRoomId,
      room,
      activityCount: activities?.length || 0,
      complianceFlagsCount: flags?.length || 0,
      flags,
      activities: activities?.slice(0, 100), // Last 100 activities
    };
  } catch (error) {
    console.error("Error generating compliance report:", error);
    return null;
  }
};
