import { supabase } from "@/integrations/supabase/client";

export interface DealSearchFilters {
  query?: string;
  stage?: string[];
  industry?: string[];
  location?: string[];
  minAmount?: number;
  maxAmount?: number;
  dealType?: string[];
  minScore?: number;
  sortBy?: "relevance" | "recent" | "score" | "amount";
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  deals: any[];
  total: number;
  hasMore: boolean;
}

/**
 * Search deals with advanced filters
 */
export const searchDeals = async (filters: DealSearchFilters): Promise<SearchResult> => {
  try {
    let query = supabase.from("deals").select("*, deal_scores(*)");

    // Text search
    if (filters.query && filters.query.trim()) {
      const searchTerm = filters.query.toLowerCase();
      query = query.or(
        `title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
      );
    }

    // Filter by stage
    if (filters.stage && filters.stage.length > 0) {
      query = query.in("stage", filters.stage);
    }

    // Filter by industry
    if (filters.industry && filters.industry.length > 0) {
      query = query.in("industry", filters.industry);
    }

    // Filter by location
    if (filters.location && filters.location.length > 0) {
      query = query.in("location", filters.location);
    }

    // Filter by amount range
    if (filters.minAmount !== undefined) {
      query = query.gte("target_raise", filters.minAmount);
    }
    if (filters.maxAmount !== undefined) {
      query = query.lte("target_raise", filters.maxAmount);
    }

    // Filter by deal type
    if (filters.dealType && filters.dealType.length > 0) {
      query = query.in("deal_type", filters.dealType);
    }

    // Sort
    const sortBy = filters.sortBy || "recent";
    if (sortBy === "recent") {
      query = query.order("created_at", { ascending: false });
    } else if (sortBy === "amount") {
      query = query.order("target_raise", { ascending: false });
    } else if (sortBy === "score") {
      query = query.order("deal_scores(total_score)", { ascending: false });
    }

    // Pagination
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      deals: data || [],
      total: count || 0,
      hasMore: (offset + limit) < (count || 0),
    };
  } catch (error) {
    console.error("Error searching deals:", error);
    return { deals: [], total: 0, hasMore: false };
  }
};

/**
 * Get available filter options
 */
export const getFilterOptions = async () => {
  try {
    const [stages, industries, locations, dealTypes] = await Promise.all([
      supabase.from("deals").select("stage").not("stage", "is", null),
      supabase.from("deals").select("industry").not("industry", "is", null),
      supabase.from("deals").select("location").not("location", "is", null),
      supabase.from("deals").select("deal_type").not("deal_type", "is", null),
    ]);

    return {
      stages: [...new Set(stages.data?.map((d) => d.stage).filter(Boolean))],
      industries: [...new Set(industries.data?.map((d) => d.industry).filter(Boolean))],
      locations: [...new Set(locations.data?.map((d) => d.location).filter(Boolean))],
      dealTypes: [...new Set(dealTypes.data?.map((d) => d.deal_type).filter(Boolean))],
    };
  } catch (error) {
    console.error("Error fetching filter options:", error);
    return {
      stages: [],
      industries: [],
      locations: [],
      dealTypes: [],
    };
  }
};

/**
 * Get trending deals
 */
export const getTrendingDeals = async (limit: number = 10) => {
  try {
    const { data } = await supabase
      .from("deal_view_analytics")
      .select("deal_id, view_count, deals(*)")
      .order("view_count", { ascending: false })
      .limit(limit);

    return data || [];
  } catch (error) {
    console.error("Error fetching trending deals:", error);
    return [];
  }
};

/**
 * Get recommended deals based on user profile
 */
export const getRecommendedDeals = async (
  userId: string,
  limit: number = 10
): Promise<any[]> => {
  try {
    // Get user's investment preferences
    const { data: profile } = await supabase
      .from("profiles")
      .select("preferred_stages, preferred_industries, preferred_locations")
      .eq("id", userId)
      .single();

    if (!profile) return [];

    let query = supabase.from("deals").select("*");

    // Match preferences
    if (profile.preferred_stages?.length > 0) {
      query = query.in("stage", profile.preferred_stages);
    }

    if (profile.preferred_industries?.length > 0) {
      query = query.in("industry", profile.preferred_industries);
    }

    if (profile.preferred_locations?.length > 0) {
      query = query.in("location", profile.preferred_locations);
    }

    const { data } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    return data || [];
  } catch (error) {
    console.error("Error fetching recommended deals:", error);
    return [];
  }
};

/**
 * Save deal to favorites
 */
export const saveDealToFavorites = async (userId: string, dealId: string) => {
  try {
    const { error } = await supabase.from("saved_deals").insert({
      user_id: userId,
      deal_id: dealId,
    });

    if (error && error.code !== "23505") throw error; // Ignore duplicate errors
    return true;
  } catch (error) {
    console.error("Error saving deal:", error);
    return false;
  }
};

/**
 * Remove deal from favorites
 */
export const removeDealFromFavorites = async (userId: string, dealId: string) => {
  try {
    const { error } = await supabase
      .from("saved_deals")
      .delete()
      .eq("user_id", userId)
      .eq("deal_id", dealId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error removing saved deal:", error);
    return false;
  }
};

/**
 * Get user's saved deals
 */
export const getUserSavedDeals = async (userId: string) => {
  try {
    const { data } = await supabase
      .from("saved_deals")
      .select("*, deals(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    return data || [];
  } catch (error) {
    console.error("Error fetching saved deals:", error);
    return [];
  }
};

/**
 * Track deal view for analytics
 */
export const trackDealView = async (dealId: string, userId?: string) => {
  try {
    await supabase.from("deal_view_analytics").insert({
      deal_id: dealId,
      user_id: userId,
      viewed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error tracking deal view:", error);
  }
};
