import { supabase } from "@/integrations/supabase/client";

export interface DealScore {
  dealId: string;
  totalScore: number; // 0-100
  completenessScore: number;
  complianceScore: number;
  participationScore: number;
  documentationScore: number;
  factors: ScoreFactor[];
  lastUpdated: string;
}

export interface ScoreFactor {
  name: string;
  score: number; // 0-100
  weight: number; // 0-1
  description: string;
}

/**
 * Calculate deal quality score
 */
export const calculateDealScore = async (dealId: string): Promise<DealScore | null> => {
  try {
    const [dealData, roomData, docData, participantData] = await Promise.all([
      supabase.from("deals").select("*").eq("id", dealId).single(),
      supabase
        .from("deal_rooms")
        .select("*")
        .eq("deal_id", dealId),
      supabase
        .from("deal_room_documents")
        .select("*")
        .eq("deal_room_id", dealId),
      supabase
        .from("deal_room_participants")
        .select("*")
        .eq("deal_room_id", dealId),
    ]);

    if (dealData.error) throw dealData.error;

    const room = roomData.data?.[0];
    const docs = docData.data || [];
    const participants = participantData.data || [];

    const factors: ScoreFactor[] = [];

    // 1. Completeness Score (Profile information)
    const completenessScore = calculateCompletenessScore(dealData.data);
    factors.push({
      name: "Profile Completeness",
      score: completenessScore,
      weight: 0.2,
      description: "Deal information completeness",
    });

    // 2. Documentation Score
    const docScore = calculateDocumentationScore(docs);
    factors.push({
      name: "Documentation",
      score: docScore,
      weight: 0.25,
      description: "Number and quality of documents",
    });

    // 3. Participation Score
    const participationScore = Math.min(participants.length * 20, 100);
    factors.push({
      name: "Participation",
      score: participationScore,
      weight: 0.2,
      description: "Number of active participants",
    });

    // 4. Activity Score
    const activityScore = room ? calculateActivityScore(room) : 0;
    factors.push({
      name: "Activity Level",
      score: activityScore,
      weight: 0.15,
      description: "Recent activity and engagement",
    });

    // 5. Compliance Score
    const complianceScore = await calculateComplianceScore(dealId);
    factors.push({
      name: "Compliance Status",
      score: complianceScore,
      weight: 0.2,
      description: "Compliance and risk checks passed",
    });

    // Calculate weighted total
    const totalScore = factors.reduce((sum, factor) => {
      return sum + factor.score * factor.weight;
    }, 0);

    const dealScore: DealScore = {
      dealId,
      totalScore: Math.round(totalScore),
      completenessScore,
      complianceScore,
      participationScore,
      documentationScore: docScore,
      factors,
      lastUpdated: new Date().toISOString(),
    };

    // Cache the score
    await cacheDealScore(dealScore);

    return dealScore;
  } catch (error) {
    console.error("Error calculating deal score:", error);
    return null;
  }
};

/**
 * Calculate profile completeness score
 */
const calculateCompletenessScore = (deal: any): number => {
  if (!deal) return 0;

  let filledFields = 0;
  const totalFields = 10;

  if (deal.title) filledFields++;
  if (deal.description) filledFields++;
  if (deal.industry) filledFields++;
  if (deal.stage) filledFields++;
  if (deal.amount) filledFields++;
  if (deal.location) filledFields++;
  if (deal.target_raise) filledFields++;
  if (deal.deal_type) filledFields++;
  if (deal.created_by) filledFields++;
  if (deal.created_at) filledFields++;

  return (filledFields / totalFields) * 100;
};

/**
 * Calculate documentation score based on document count and types
 */
const calculateDocumentationScore = (docs: any[]): number => {
  if (docs.length === 0) return 0;

  let score = 0;

  // Base score for having documents
  score += Math.min(docs.length * 10, 40);

  // Bonus for document variety
  const categories = new Set(docs.map((d) => d.category));
  score += Math.min(categories.size * 15, 40);

  // Bonus for recent uploads
  const recentDocs = docs.filter(
    (d) => new Date(d.uploaded_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
  );
  score += Math.min(recentDocs.length * 5, 20);

  return Math.min(score, 100);
};

/**
 * Calculate activity score based on recency and frequency
 */
const calculateActivityScore = (room: any): number => {
  if (!room) return 0;

  const lastActivityTime = new Date(room.updated_at || room.created_at).getTime();
  const daysSinceActivity = (Date.now() - lastActivityTime) / (1000 * 60 * 60 * 24);

  let score = 100;

  // Deduct points based on inactivity
  if (daysSinceActivity > 30) score = 0;
  else if (daysSinceActivity > 14) score = 30;
  else if (daysSinceActivity > 7) score = 60;
  else if (daysSinceActivity > 3) score = 80;

  return Math.max(score, 0);
};

/**
 * Calculate compliance score based on compliance flags
 */
const calculateComplianceScore = async (dealId: string): Promise<number> => {
  try {
    const { data: flags } = await supabase
      .from("compliance_flags")
      .select("*")
      .eq("deal_id", dealId);

    if (!flags || flags.length === 0) return 100;

    const criticalFlags = flags.filter((f) => f.severity === "critical").length;
    const highFlags = flags.filter((f) => f.severity === "high").length;
    const mediumFlags = flags.filter((f) => f.severity === "medium").length;

    let deduction = 0;
    deduction += criticalFlags * 30;
    deduction += highFlags * 15;
    deduction += mediumFlags * 5;

    return Math.max(100 - deduction, 0);
  } catch (error) {
    console.error("Error calculating compliance score:", error);
    return 100;
  }
};

/**
 * Cache deal score for performance
 */
const cacheDealScore = async (score: DealScore) => {
  const payload = {
    deal_id: score.dealId,
    total_score: score.totalScore,
    completeness_score: score.completenessScore,
    documentation_score: score.documentationScore,
    participation_score: score.participationScore,
    compliance_score: score.complianceScore,
    factors: score.factors,
    updated_at: new Date().toISOString(),
  } as any;

  try {
    const query: any = supabase.from("deal_scores");

    if (typeof query.upsert === "function") {
      await query.upsert(payload, { onConflict: "deal_id" });
      return;
    }

    if (typeof query.insert === "function") {
      const { error: insertError } = await query.insert(payload);
      if (!insertError) return;
      if (
        insertError.message?.toLowerCase().includes("duplicate") ||
        insertError.code === "23505"
      ) {
        if (typeof query.update === "function") {
          await query.update(payload).eq("deal_id", score.dealId);
          return;
        }
      }
    }
  } catch (error) {
    console.error("Error caching deal score:", error);
  }
};

/**
 * Get cached deal score
 */
export const getDealScore = async (dealId: string): Promise<DealScore | null> => {
  try {
    const { data } = await supabase
      .from("deal_scores")
      .select("*")
      .eq("deal_id", dealId)
      .single();

    if (!data) {
      // Calculate fresh if not cached
      return calculateDealScore(dealId);
    }

    return {
      dealId: data.deal_id,
      totalScore: data.total_score,
      completenessScore: data.completeness_score,
      complianceScore: data.compliance_score,
      participationScore: data.participation_score,
      documentationScore: data.documentation_score,
      factors: data.factors || [],
      lastUpdated: data.updated_at,
    };
  } catch (error) {
    console.error("Error fetching deal score:", error);
    return null;
  }
};

/**
 * Get quality-scored deals for marketplace
 */
export const getQualityRankedDeals = async (limit: number = 50) => {
  try {
    const { data } = await supabase
      .from("deal_scores")
      .select("*, deals(*)")
      .order("total_score", { ascending: false })
      .limit(limit);

    return data || [];
  } catch (error) {
    console.error("Error fetching quality ranked deals:", error);
    return [];
  }
};

/**
 * Get score badge text and color
 */
export const getScoreBadge = (
  score: number
): { text: string; color: string; bgColor: string } => {
  if (score >= 80) {
    return { text: "Excellent", color: "text-green-600", bgColor: "bg-green-50" };
  } else if (score >= 60) {
    return { text: "Good", color: "text-blue-600", bgColor: "bg-blue-50" };
  } else if (score >= 40) {
    return { text: "Fair", color: "text-yellow-600", bgColor: "bg-yellow-50" };
  } else {
    return { text: "Needs Work", color: "text-red-600", bgColor: "bg-red-50" };
  }
};
