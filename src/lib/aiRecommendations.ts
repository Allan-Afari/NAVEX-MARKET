import { supabase } from "@/integrations/supabase/client";

export interface RecommendationScore {
  dealId: string;
  score: number;
  reasons: string[];
  matchFactors: {
    industry?: number;
    stage?: number;
    location?: number;
    amount?: number;
    dealType?: number;
    quality?: number;
    activity?: number;
  };
}

export interface UserPreferences {
  preferred_stages?: string[];
  preferred_industries?: string[];
  preferred_locations?: string[];
  preferred_deal_types?: string[];
  investment_range?: { min: number; max: number };
  risk_tolerance?: 'low' | 'medium' | 'high';
}

/**
 * Get AI-powered deal recommendations for a user
 */
export const getAIRecommendations = async (
  userId: string,
  limit: number = 20
): Promise<RecommendationScore[]> => {
  try {
    // Get user preferences and history
    const [profileData, viewHistory, savedDeals] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      (supabase.from("deal_view_analytics" as any) as any)
        .select("deal_id, viewed_at")
        .eq("user_id", userId)
        .order("viewed_at", { ascending: false })
        .limit(50),
      (supabase.from("saved_deals" as any) as any)
        .select("deal_id")
        .eq("user_id", userId),
    ]);

    const preferences: UserPreferences = (profileData.data as any) || {};
    const viewedDealIds = new Set((viewHistory.data as any)?.map((v: any) => v.deal_id) || []);
    const savedDealIds = new Set((savedDeals.data as any)?.map((s: any) => s.deal_id) || []);

    // Get all available deals
    const { data: deals } = await supabase
      .from("deals")
      .select("*, deal_scores(*)")
      .not("id", "in", `(${Array.from(viewedDealIds).join(",")})`)
      .limit(100);

    if (!deals) return [];

    // Score each deal
    const scoredDeals = await Promise.all(
      (deals as any[]).map(async (deal: any) => {
        const score = await scoreDealForUser(deal, preferences, viewedDealIds as Set<string>, savedDealIds as Set<string>);
        return score;
      })
    );

    // Sort by score and return top N
    return scoredDeals
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (error) {
    console.error("Error getting AI recommendations:", error);
    return [];
  }
};

/**
 * Score a single deal for a user based on multiple factors
 */
const scoreDealForUser = async (
  deal: any,
  preferences: UserPreferences,
  viewedDealIds: Set<string>,
  savedDealIds: Set<string>
): Promise<RecommendationScore> => {
  let totalScore = 0;
  const reasons: string[] = [];
  const matchFactors: any = {};

  // 1. Industry Match (0-25 points)
  if (preferences.preferred_industries?.length > 0) {
    const industryMatch = preferences.preferred_industries.includes((deal as any).industry);
    if (industryMatch) {
      totalScore += 25;
      matchFactors.industry = 25;
      reasons.push(`Matches your preferred industry: ${(deal as any).industry}`);
    } else {
      // Partial match for related industries
      matchFactors.industry = 5;
    }
  }

  // 2. Stage Match (0-20 points)
  if (preferences.preferred_stages?.length > 0) {
    const stageMatch = preferences.preferred_stages.includes((deal as any).stage);
    if (stageMatch) {
      totalScore += 20;
      matchFactors.stage = 20;
      reasons.push(`Matches your preferred stage: ${(deal as any).stage}`);
    }
  }

  // 3. Location Match (0-15 points)
  if (preferences.preferred_locations?.length > 0) {
    const locationMatch = preferences.preferred_locations.includes((deal as any).location);
    if (locationMatch) {
      totalScore += 15;
      matchFactors.location = 15;
      reasons.push(`Located in your preferred region: ${(deal as any).location}`);
    }
  }

  // 4. Amount Range Match (0-15 points)
  if (preferences.investment_range && (deal as any).target_raise) {
    const { min, max } = preferences.investment_range;
    if ((deal as any).target_raise >= min && (deal as any).target_raise <= max) {
      totalScore += 15;
      matchFactors.amount = 15;
      reasons.push(`Fits your investment range`);
    } else if ((deal as any).target_raise >= min * 0.8 && (deal as any).target_raise <= max * 1.2) {
      totalScore += 8;
      matchFactors.amount = 8;
      reasons.push(`Close to your investment range`);
    }
  }

  // 5. Deal Type Match (0-10 points)
  if (preferences.preferred_deal_types?.length > 0) {
    const typeMatch = preferences.preferred_deal_types.includes((deal as any).deal_type);
    if (typeMatch) {
      totalScore += 10;
      matchFactors.dealType = 10;
      reasons.push(`Matches your preferred deal type: ${(deal as any).deal_type}`);
    }
  }

  // 6. Quality Score (0-15 points)
  if ((deal as any).deal_scores?.[0]?.total_score) {
    const qualityScore = (deal as any).deal_scores[0].total_score;
    if (qualityScore >= 80) {
      totalScore += 15;
      matchFactors.quality = 15;
      reasons.push(`High-quality deal (score: ${qualityScore})`);
    } else if (qualityScore >= 60) {
      totalScore += 10;
      matchFactors.quality = 10;
      reasons.push(`Good quality deal (score: ${qualityScore})`);
    } else if (qualityScore >= 40) {
      totalScore += 5;
      matchFactors.quality = 5;
    }
  }

  // 7. Activity/Recency (0-10 points)
  const daysSinceCreation = (Date.now() - new Date((deal as any).created_at).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceCreation < 7) {
    totalScore += 10;
    matchFactors.activity = 10;
    reasons.push(`Recently posted deal`);
  } else if (daysSinceCreation < 30) {
    totalScore += 5;
    matchFactors.activity = 5;
  }

  // 8. Risk Tolerance Adjustment
  if (preferences.risk_tolerance) {
    const complianceScore = (deal as any).deal_scores?.[0]?.compliance_score || 100;
    if (preferences.risk_tolerance === 'low' && complianceScore < 70) {
      totalScore -= 10;
      reasons.push(`Higher risk than your tolerance`);
    } else if (preferences.risk_tolerance === 'high' && complianceScore >= 90) {
      totalScore += 5;
      reasons.push(`Low-risk opportunity`);
    }
  }

  // 9. Similarity to Saved/Viewed Deals (collaborative filtering)
  const similarityScore = await calculateSimilarityScore(deal.id, savedDealIds, viewedDealIds);
  if (similarityScore > 0) {
    totalScore += similarityScore;
    matchFactors.similarity = similarityScore;
    reasons.push(`Similar to deals you've shown interest in`);
  }

  return {
    dealId: deal.id,
    score: Math.max(0, Math.min(100, totalScore)),
    reasons,
    matchFactors,
  };
};

/**
 * Calculate similarity score based on user's past interactions
 */
const calculateSimilarityScore = async (
  dealId: string,
  savedDealIds: Set<string>,
  viewedDealIds: Set<string>
): Promise<number> => {
  try {
    if (savedDealIds.size === 0 && viewedDealIds.size === 0) return 0;

    // Get attributes of user's saved/viewed deals
    const referenceDealIds = Array.from(savedDealIds).slice(0, 10);
    if (referenceDealIds.length === 0) return 0;

    const { data: referenceDeals } = await supabase
      .from("deals")
      .select("industry, stage, location, deal_type")
      .in("id", referenceDealIds);

    if (!referenceDeals || referenceDeals.length === 0) return 0;

    // Get current deal attributes
    const { data: currentDeal } = await supabase
      .from("deals")
      .select("industry, stage, location, deal_type")
      .eq("id", dealId)
      .single();

    if (!currentDeal) return 0;

    // Calculate similarity based on attribute matches
    let similarityCount = 0;
    const totalAttributes = 4;

    (referenceDeals as any[]).forEach((refDeal: any) => {
      if ((refDeal as any).industry === (currentDeal as any).industry) similarityCount++;
      if ((refDeal as any).stage === (currentDeal as any).stage) similarityCount++;
      if ((refDeal as any).location === (currentDeal as any).location) similarityCount++;
      if ((refDeal as any).deal_type === (currentDeal as any).deal_type) similarityCount++;
    });

    const similarityRatio = similarityCount / (referenceDeals.length * totalAttributes);
    return Math.round(similarityRatio * 10); // Max 10 points
  } catch (error) {
    console.error("Error calculating similarity score:", error);
    return 0;
  }
};

/**
 * Get trending deals based on recent activity
 */
export const getTrendingDeals = async (limit: number = 10): Promise<any[]> => {
  try {
    const { data } = await supabase
      .from("deals")
      .select("*, deal_scores(*), view_count")
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order("view_count", { ascending: false })
      .limit(limit);

    return data || [];
  } catch (error) {
    console.error("Error getting trending deals:", error);
    return [];
  }
};

/**
 * Get similar deals to a given deal
 */
export const getSimilarDeals = async (
  dealId: string,
  limit: number = 5
): Promise<any[]> => {
  try {
    // Get the reference deal
    const { data: referenceDeal } = await supabase
      .from("deals")
      .select("*")
      .eq("id", dealId)
      .single();

    if (!referenceDeal) return [];

    // Find deals with similar attributes
    const { data: similarDeals } = await supabase
      .from("deals")
      .select("*, deal_scores(*)")
      .neq("id", dealId)
      .or(`industry.eq.${(referenceDeal as any).industry},stage.eq.${(referenceDeal as any).stage}`)
      .limit(limit * 2); // Get more to filter

    if (!similarDeals) return [];

    // Score similarity
    const scored = (similarDeals as any[]).map((deal: any) => {
      let score = 0;
      if ((deal as any).industry === (referenceDeal as any).industry) score += 30;
      if ((deal as any).stage === (referenceDeal as any).stage) score += 25;
      if ((deal as any).location === (referenceDeal as any).location) score += 20;
      if ((deal as any).deal_type === (referenceDeal as any).deal_type) score += 15;
      if ((deal as any).industry === (referenceDeal as any).industry && (deal as any).stage === (referenceDeal as any).stage) score += 10;
      return { deal, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.deal);
  } catch (error) {
    console.error("Error getting similar deals:", error);
    return [];
  }
};

/**
 * Update user preferences based on their behavior
 */
export const updateUserPreferencesFromBehavior = async (
  userId: string
): Promise<boolean> => {
  try {
    // Get user's recent view history
    const { data: viewHistory } = await (supabase.from("deal_view_analytics" as any) as any)
      .select("deal_id, viewed_at")
      .eq("user_id", userId)
      .order("viewed_at", { ascending: false })
      .limit(50);

    if (!viewHistory || viewHistory.length === 0) return false;

    // Get deals they viewed
    const dealIds = (viewHistory as any[]).map((v: any) => v.deal_id);
    const { data: viewedDeals } = await supabase
      .from("deals")
      .select("industry, stage, location, deal_type, target_raise")
      .in("id", dealIds);

    if (!viewedDeals) return false;

    // Extract patterns
    const industries = (viewedDeals as any[]).map((d: any) => (d as any).industry);
    const stages = (viewedDeals as any[]).map((d: any) => (d as any).stage);
    const locations = (viewedDeals as any[]).map((d: any) => (d as any).location);
    const dealTypes = (viewedDeals as any[]).map((d: any) => (d as any).deal_type);
    const amounts = (viewedDeals as any[]).map((d: any) => (d as any).target_raise).filter(Boolean);

    // Find most common values
    const getTopValues = (arr: string[], limit: number = 3) => {
      const counts: Record<string, number> = {};
      arr.forEach((val) => {
        counts[val] = (counts[val] || 0) + 1;
      });
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([val]) => val);
    };

    const preferredIndustries = getTopValues(industries);
    const preferredStages = getTopValues(stages);
    const preferredLocations = getTopValues(locations);
    const preferredDealTypes = getTopValues(dealTypes);

    // Calculate investment range
    const validAmounts = amounts.filter((a) => a && a > 0);
    let investmentRange;
    if (validAmounts.length > 0) {
      const min = Math.min(...validAmounts);
      const max = Math.max(...validAmounts);
      investmentRange = {
        min: min * 0.8,
        max: max * 1.2,
      };
    }

    // Update profile
    const { error } = await (supabase.from("profiles" as any) as any)
      .update({
        preferred_industries: preferredIndustries,
        preferred_stages: preferredStages,
        preferred_locations: preferredLocations,
        preferred_deal_types: preferredDealTypes,
        investment_range: investmentRange,
      })
      .eq("id", userId);

    return !error;
  } catch (error) {
    console.error("Error updating user preferences:", error);
    return false;
  }
};

/**
 * Get recommendation explanation for a specific deal
 */
export const getRecommendationExplanation = async (
  dealId: string,
  userId: string
): Promise<{ score: number; reasons: string[]; factors: any } | null> => {
  try {
    const [profileData, dealData] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("deals").select("*, deal_scores(*)").eq("id", dealId).single(),
    ]);

    if (!dealData.data) return null;

    const preferences: UserPreferences = (profileData.data as any) || {};
    const score = await scoreDealForUser(
      dealData.data,
      preferences,
      new Set(),
      new Set()
    );

    return {
      score: score.score,
      reasons: score.reasons,
      factors: score.matchFactors,
    };
  } catch (error) {
    console.error("Error getting recommendation explanation:", error);
    return null;
  }
};
