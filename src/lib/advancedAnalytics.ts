/**
 * Advanced Analytics Service
 * Provides comprehensive insights into deals, portfolios, and market trends
 */

import { supabase } from "@/integrations/supabase/client";

export interface DealMetrics {
  totalDeals: number;
  activeDeals: number;
  completedDeals: number;
  averageTimeToClose: number; // in days
  successRate: number; // percentage
  totalFunded: number;
  averageFundingAmount: number;
  topIndustries: Array<{ industry: string; count: number }>;
  topLocations: Array<{ location: string; count: number }>;
}

export interface UserAnalytics {
  userId: string;
  totalDealsCreated: number;
  totalDealsJoined: number;
  totalInvested: number;
  portfolio Value: number;
  successRate: number; // percentage
  trustScore: number;
  reputationRating: number;
  avgResponseTime: number; // in hours
  completionRate: number; // percentage
}

export interface RegressionModel {
  dealSuccessFactor: {
    completeness: number;
    documentation: number;
    participation: number;
    activity: number;
    compliance: number;
  };
  predictedSuccessRate: number;
}

export interface TrendData {
  date: string;
  metric: string;
  value: number;
}

/**
 * Get comprehensive deal metrics
 */
export const getDealMetrics = async (): Promise<DealMetrics | null> => {
  try {
    // Get all deals
    const { data: deals, error: dealsError } = await supabase
      .from("deals")
      .select("*, deal_scores(*), deal_view_analytics(*)")
      .eq("is_removed", false);

    if (dealsError) throw dealsError;

    if (!deals || deals.length === 0) {
      return {
        totalDeals: 0,
        activeDeals: 0,
        completedDeals: 0,
        averageTimeToClose: 0,
        successRate: 0,
        totalFunded: 0,
        averageFundingAmount: 0,
        topIndustries: [],
        topLocations: [],
      };
    }

    // Calculate metrics
    const totalDeals = deals.length;
    const completedDeals = deals.filter((d: any) => d.status === "completed").length;
    const activeDeals = totalDeals - completedDeals;

    // Calculate average time to close (from created_at to updated_at for completed deals)
    const completedDealsTimes = deals
      .filter((d: any) => d.status === "completed")
      .map((d: any) => {
        const created = new Date(d.created_at).getTime();
        const updated = new Date(d.updated_at).getTime();
        return (updated - created) / (1000 * 60 * 60 * 24); // Convert to days
      });
    const averageTimeToClose =
      completedDealsTimes.length > 0
        ? completedDealsTimes.reduce((a, b) => a + b, 0) / completedDealsTimes.length
        : 0;

    const successRate =
      totalDeals > 0 ? (completedDeals / totalDeals) * 100 : 0;
    const totalFunded = deals.reduce((sum: number, d: any) => sum + (d.funding_amount || 0), 0);
    const averageFundingAmount =
      totalDeals > 0 ? totalFunded / totalDeals : 0;

    // Get top industries
    const industriesCounts: Record<string, number> = {};
    deals.forEach((d: any) => {
      if (d.industry) {
        industriesCounts[d.industry] = (industriesCounts[d.industry] || 0) + 1;
      }
    });
    const topIndustries = Object.entries(industriesCounts)
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get top locations
    const locationsCounts: Record<string, number> = {};
    deals.forEach((d: any) => {
      if (d.location) {
        locationsCounts[d.location] = (locationsCounts[d.location] || 0) + 1;
      }
    });
    const topLocations = Object.entries(locationsCounts)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalDeals,
      activeDeals,
      completedDeals,
      averageTimeToClose,
      successRate,
      totalFunded,
      averageFundingAmount,
      topIndustries,
      topLocations,
    };
  } catch (error) {
    console.error("Error getting deal metrics:", error);
    return null;
  }
};

/**
 * Get user analytics
 */
export const getUserAnalytics = async (userId: string): Promise<UserAnalytics | null> => {
  try {
    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    // Get deals created
    const { data: dealsCreated } = await supabase
      .from("deals")
      .select("*")
      .eq("created_by", userId);

    // Get deal participation
    const { data: dealParticipation } = await supabase
      .from("deal_room_participants")
      .select("deal_room_id")
      .eq("user_id", userId);

    // Get portfolio investments
    const { data: portfolios } = await supabase
      .from("portfolios")
      .select("*")
      .eq("user_id", userId);

    // Calculate metrics
    const totalDealsCreated = dealsCreated?.length || 0;
    const totalDealsJoined = dealParticipation?.length || 0;
    const totalInvested = portfolios?.reduce((sum: number, p: any) => sum + (p.total_value || 0), 0) || 0;
    const portfolioValue = totalInvested; // Simplified - should recalculate based on current valuations

    return {
      userId,
      totalDealsCreated,
      totalDealsJoined,
      totalInvested,
      portfolio Value: portfolioValue,
      successRate: profile?.success_rate || 0,
      trustScore: profile?.trust_score || 0,
      reputationRating: profile?.reputation_rating || 0,
      avgResponseTime: 24, // Placeholder - would need to calculate from activity logs
      completionRate: 75, // Placeholder
    };
  } catch (error) {
    console.error("Error getting user analytics:", error);
    return null;
  }
};

/**
 * Predict deal success rate based on quality metrics
 */
export const predictDealSuccess = async (dealId: string): Promise<number> => {
  try {
    // Get deal quality score
    const { data: score } = await supabase
      .from("deal_scores")
      .select("*")
      .eq("deal_id", dealId)
      .single();

    if (!score) return 0;

    // Score components are weighted
    const successRate =
      (score.completeness_score * 0.2 +
        score.documentation_score * 0.25 +
        score.participation_score * 0.2 +
        score.activity_score * 0.15 +
        score.compliance_score * 0.2) /
      100;

    return Math.round(successRate * 100);
  } catch (error) {
    console.error("Error predicting deal success:", error);
    return 0;
  }
};

/**
 * Get trend data over time
 */
export const getTrendData = async (
  metric: "deals" | "funding" | "activity",
  days: number = 30
): Promise<TrendData[]> => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let data: TrendData[] = [];

    if (metric === "deals") {
      const { data: deals } = await supabase
        .from("deals")
        .select("created_at")
        .gte("created_at", startDate.toISOString());

      // Aggregate by day
      const dealsByDay: Record<string, number> = {};
      deals?.forEach((d: any) => {
        const date = new Date(d.created_at).toISOString().split("T")[0];
        dealsByDay[date] = (dealsByDay[date] || 0) + 1;
      });

      data = Object.entries(dealsByDay).map(([date, count]) => ({
        date,
        metric: "deals_created",
        value: count,
      }));
    }

    if (metric === "funding") {
      const { data: deals } = await supabase
        .from("deals")
        .select("created_at, funding_amount")
        .gte("created_at", startDate.toISOString());

      // Aggregate by day
      const fundingByDay: Record<string, number> = {};
      deals?.forEach((d: any) => {
        const date = new Date(d.created_at).toISOString().split("T")[0];
        fundingByDay[date] = (fundingByDay[date] || 0) + (d.funding_amount || 0);
      });

      data = Object.entries(fundingByDay).map(([date, amount]) => ({
        date,
        metric: "funding_volume",
        value: amount,
      }));
    }

    if (metric === "activity") {
      const { data: activities } = await supabase
        .from("deal_room_activity")
        .select("created_at")
        .gte("created_at", startDate.toISOString());

      // Aggregate by day
      const activityByDay: Record<string, number> = {};
      activities?.forEach((a: any) => {
        const date = new Date(a.created_at).toISOString().split("T")[0];
        activityByDay[date] = (activityByDay[date] || 0) + 1;
      });

      data = Object.entries(activityByDay).map(([date, count]) => ({
        date,
        metric: "activity_count",
        value: count,
      }));
    }

    return data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error) {
    console.error("Error getting trend data:", error);
    return [];
  }
};

/**
 * Get deal stage distribution
 */
export const getDealStageDistribution = async (): Promise<Record<string, number>> => {
  try {
    const { data: deals } = await supabase
      .from("deals")
      .select("stage")
      .eq("is_removed", false);

    const distribution: Record<string, number> = {};
    deals?.forEach((d: any) => {
      distribution[d.stage] = (distribution[d.stage] || 0) + 1;
    });

    return distribution;
  } catch (error) {
    console.error("Error getting stage distribution:", error);
    return {};
  }
};

/**
 * Get heatmap data (deal concentration by industry and location)
 */
export const getConcentrationHeatmap = async (): Promise<
  Array<{ industry: string; location: string; count: number }>
> => {
  try {
    const { data: deals } = await supabase
      .from("deals")
      .select("industry, location")
      .eq("is_removed", false);

    const heatmap: Record<string, number> = {};
    deals?.forEach((d: any) => {
      const key = `${d.industry || "Unknown"}:${d.location || "Unknown"}`;
      heatmap[key] = (heatmap[key] || 0) + 1;
    });

    return Object.entries(heatmap)
      .map(([key, count]) => {
        const [industry, location] = key.split(":");
        return { industry, location, count };
      })
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error("Error getting heatmap data:", error);
    return [];
  }
};

/**
 * Calculate market sentiment (bullish/bearish/neutral)
 */
export const getMarketSentiment = async (): Promise<"bullish" | "bearish" | "neutral"> => {
  try {
    // Get recent deals and their success rates
    const { data: deals } = await supabase
      .from("deals")
      .select("status, created_at")
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .eq("is_removed", false);

    if (!deals || deals.length === 0) return "neutral";

    const successCount = deals.filter((d: any) => d.status === "completed").length;
    const successRate = successCount / deals.length;

    if (successRate > 0.6) return "bullish";
    if (successRate < 0.3) return "bearish";
    return "neutral";
  } catch (error) {
    console.error("Error calculating market sentiment:", error);
    return "neutral";
  }
};
