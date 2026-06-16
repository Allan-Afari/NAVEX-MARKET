/**
 * Exit Tracking & Waterfall Analysis Service
 * Tracks exits and calculates distributions based on waterfall models
 */

import { supabase } from "@/integrations/supabase/client";

export interface ExitEvent {
  id: string;
  investment_id: string;
  portfolio_id: string;
  exit_type: "acquisition" | "ipo" | "liquidation" | "secondary";
  exit_date: string;
  exit_valuation: number;
  buyers?: string[];
  announced_date?: string;
  notes?: string;
  metadata?: any;
  created_at: string;
}

export interface WaterfallModel {
  id: string;
  investment_id: string;
  model_type: "simple" | "preferred" | "complex";
  preferences: {
    liquidation_preference?: number; // 1x, 2x, etc.
    participation_cap?: number;
    dividend_rate?: number;
  };
  distributions: WaterfallTranche[];
  total_distributed: number;
  created_at: string;
  updated_at: string;
}

export interface WaterfallTranche {
  tranche_number: number;
  priority: number;
  description: string;
  eligible_holders: string[]; // share classes
  percentage?: number;
  amount?: number;
  distribution_order: number;
}

export interface Distribution {
  id: string;
  exit_event_id: string;
  shareholder_name: string;
  share_class: string;
  shares_held: number;
  share_price: number;
  gross_proceeds: number;
  preferences_applied: any;
  net_proceeds: number;
  created_at: string;
}

export interface ExitMetrics {
  investmentId: string;
  exitType: string;
  timeToExit: number; // in months
  exitMultiple: number; // MOIC
  roi: number; // percentage
  totalInvested: number;
  exitProceeds: number;
  shareholder: string;
}

/**
 * Record an exit event
 */
export const recordExitEvent = async (
  investmentId: string,
  portfolioId: string,
  exitType: "acquisition" | "ipo" | "liquidation" | "secondary",
  exitValuation: number,
  exitDate: string,
  buyers?: string[],
  notes?: string
): Promise<ExitEvent | null> => {
  try {
    const { data, error } = await supabase
      .from("exit_events")
      .insert({
        investment_id: investmentId,
        portfolio_id: portfolioId,
        exit_type: exitType,
        exit_valuation: exitValuation,
        exit_date: exitDate,
        buyers: buyers || [],
        notes,
        metadata: {
          recorded_by: (await supabase.auth.getUser()).data.user?.id,
          recorded_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (error) throw error;
    return data as ExitEvent;
  } catch (error) {
    console.error("Error recording exit event:", error);
    return null;
  }
};

/**
 * Create a waterfall model for an investment
 */
export const createWaterfallModel = async (
  investmentId: string,
  modelType: "simple" | "preferred" | "complex",
  preferences: any,
  tranches: WaterfallTranche[]
): Promise<WaterfallModel | null> => {
  try {
    const { data, error } = await supabase
      .from("waterfall_models")
      .insert({
        investment_id: investmentId,
        model_type: modelType,
        preferences,
        distributions: tranches,
        total_distributed: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data as WaterfallModel;
  } catch (error) {
    console.error("Error creating waterfall model:", error);
    return null;
  }
};

/**
 * Calculate distributions based on waterfall model
 */
export const calculateWaterfallDistributions = async (
  exitEventId: string,
  investmentId: string
): Promise<Distribution[]> => {
  try {
    // Get exit event
    const { data: exitEvent } = await supabase
      .from("exit_events")
      .select("*")
      .eq("id", exitEventId)
      .single();

    if (!exitEvent) throw new Error("Exit event not found");

    // Get cap table
    const { data: capTable } = await supabase
      .from("cap_table_entries")
      .select("*")
      .eq("portfolio_investment_id", investmentId);

    if (!capTable) throw new Error("Cap table not found");

    // Get waterfall model
    const { data: waterfallModel } = await supabase
      .from("waterfall_models")
      .select("*")
      .eq("investment_id", investmentId)
      .single();

    const distributions: Distribution[] = [];
    const exitProceeds = exitEvent.exit_valuation;
    let remainingProceeds = exitProceeds;

    if (waterfallModel?.model_type === "simple") {
      // Simple pro-rata distribution
      const totalOwnership = capTable.reduce(
        (sum: number, e: any) => sum + (e.ownership_percentage || 0),
        0
      );

      capTable.forEach((entry: any) => {
        const ownership = entry.ownership_percentage || 0;
        const shareOfProceeds = (ownership / totalOwnership) * exitProceeds;

        distributions.push({
          id: `dist_${entry.id}`,
          exit_event_id: exitEventId,
          shareholder_name: entry.shareholder_name,
          share_class: entry.share_class,
          shares_held: entry.shares_issued,
          share_price: exitProceeds / entry.shares_issued,
          gross_proceeds: shareOfProceeds,
          preferences_applied: {},
          net_proceeds: shareOfProceeds,
          created_at: new Date().toISOString(),
        } as Distribution);
      });
    } else if (waterfallModel?.model_type === "preferred") {
      // Preferred distribution with liquidation preferences
      const tranches = waterfallModel.distributions || [];

      tranches.forEach((tranche: WaterfallTranche) => {
        const eligibleEntries = capTable.filter((entry: any) =>
          tranche.eligible_holders.includes(entry.share_class)
        );

        let trancheAmount = 0;
        if (tranche.amount) {
          trancheAmount = Math.min(tranche.amount, remainingProceeds);
        } else if (tranche.percentage) {
          trancheAmount = (tranche.percentage / 100) * exitProceeds;
        }

        remainingProceeds -= trancheAmount;

        eligibleEntries.forEach((entry: any) => {
          const shareOfTranche =
            (entry.shares_issued /
              eligibleEntries.reduce((sum: number, e: any) => sum + e.shares_issued, 0)) *
            trancheAmount;

          distributions.push({
            id: `dist_${entry.id}_${tranche.tranche_number}`,
            exit_event_id: exitEventId,
            shareholder_name: entry.shareholder_name,
            share_class: entry.share_class,
            shares_held: entry.shares_issued,
            share_price: trancheAmount / entry.shares_issued,
            gross_proceeds: shareOfTranche,
            preferences_applied: {
              liquidation_preference: entry.liquidation_preference,
              tranche: tranche.tranche_number,
            },
            net_proceeds: shareOfTranche,
            created_at: new Date().toISOString(),
          } as Distribution);
        });
      });

      // Remaining proceeds to common (pro-rata)
      const commonEntries = capTable.filter((e: any) => e.share_class === "Common");
      if (commonEntries.length > 0 && remainingProceeds > 0) {
        const totalCommonShares = commonEntries.reduce(
          (sum: number, e: any) => sum + e.shares_issued,
          0
        );

        commonEntries.forEach((entry: any) => {
          const shareOfRemaining =
            (entry.shares_issued / totalCommonShares) * remainingProceeds;

          distributions.push({
            id: `dist_${entry.id}_common`,
            exit_event_id: exitEventId,
            shareholder_name: entry.shareholder_name,
            share_class: "Common",
            shares_held: entry.shares_issued,
            share_price: remainingProceeds / totalCommonShares,
            gross_proceeds: shareOfRemaining,
            preferences_applied: { tranche: "remaining" },
            net_proceeds: shareOfRemaining,
            created_at: new Date().toISOString(),
          } as Distribution);
        });
      }
    }

    // Save distributions
    for (const dist of distributions) {
      await supabase.from("distributions").insert({
        exit_event_id: exitEventId,
        shareholder_name: dist.shareholder_name,
        share_class: dist.share_class,
        shares_held: dist.shares_held,
        share_price: dist.share_price,
        gross_proceeds: dist.gross_proceeds,
        preferences_applied: dist.preferences_applied,
        net_proceeds: dist.net_proceeds,
      });
    }

    return distributions;
  } catch (error) {
    console.error("Error calculating waterfall distributions:", error);
    return [];
  }
};

/**
 * Get exit metrics for an investment
 */
export const getExitMetrics = async (exitEventId: string): Promise<ExitMetrics | null> => {
  try {
    const { data: exitEvent } = await supabase
      .from("exit_events")
      .select("*, portfolio_investments(*)")
      .eq("id", exitEventId)
      .single();

    if (!exitEvent) return null;

    const investment = exitEvent.portfolio_investments;
    const investmentDate = new Date(investment.investment_date);
    const exitDate = new Date(exitEvent.exit_date);
    const monthsToExit =
      (exitDate.getTime() - investmentDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

    const exitMultiple = investment.investment_amount
      ? exitEvent.exit_valuation / investment.investment_amount
      : 0;
    const roi = ((exitEvent.exit_valuation - investment.investment_amount) / investment.investment_amount) * 100;

    return {
      investmentId: investment.id,
      exitType: exitEvent.exit_type,
      timeToExit: monthsToExit,
      exitMultiple,
      roi,
      totalInvested: investment.investment_amount,
      exitProceeds: exitEvent.exit_valuation,
      shareholder: investment.company_name,
    };
  } catch (error) {
    console.error("Error getting exit metrics:", error);
    return null;
  }
};

/**
 * Get all exits for a portfolio
 */
export const getPortfolioExits = async (portfolioId: string): Promise<ExitEvent[]> => {
  try {
    const { data, error } = await supabase
      .from("exit_events")
      .select("*")
      .eq("portfolio_id", portfolioId)
      .order("exit_date", { ascending: false });

    if (error) throw error;
    return (data || []) as ExitEvent[];
  } catch (error) {
    console.error("Error getting portfolio exits:", error);
    return [];
  }
};

/**
 * Calculate distribution summary for an exit
 */
export const getDistributionSummary = async (
  exitEventId: string
): Promise<{
  totalDistributed: number;
  averageMultiple: number;
  byShareClass: Record<string, { amount: number; holders: number }>;
}> => {
  try {
    const { data: distributions } = await supabase
      .from("distributions")
      .select("*")
      .eq("exit_event_id", exitEventId);

    if (!distributions || distributions.length === 0) {
      return { totalDistributed: 0, averageMultiple: 0, byShareClass: {} };
    }

    const totalDistributed = distributions.reduce(
      (sum: number, d: any) => sum + (d.net_proceeds || 0),
      0
    );
    const averageMultiple =
      totalDistributed / distributions.reduce((sum: number, d: any) => sum + 1, 0); // Simplified

    const byShareClass: Record<string, { amount: number; holders: number }> = {};
    distributions.forEach((d: any) => {
      if (!byShareClass[d.share_class]) {
        byShareClass[d.share_class] = { amount: 0, holders: 0 };
      }
      byShareClass[d.share_class].amount += d.net_proceeds || 0;
      byShareClass[d.share_class].holders += 1;
    });

    return { totalDistributed, averageMultiple, byShareClass };
  } catch (error) {
    console.error("Error getting distribution summary:", error);
    return { totalDistributed: 0, averageMultiple: 0, byShareClass: {} };
  }
};
