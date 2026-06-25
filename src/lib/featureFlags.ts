import type { User } from "@supabase/supabase-js";

export interface FeatureFlags {
  // Always available
  basicMarketplace: boolean;
  basicMessaging: boolean;
  
  // Available after verification
  advancedSearch: boolean;
  dealRooms: boolean;
  
  // Available after 3 days
  analytics: boolean;
  marketIntelligence: boolean;
  
  // Available after 7 days
  portfolioManagement: boolean;
  advancedCompliance: boolean;
  
  // Premium features
  bulkImport: boolean;
  apiAccess: boolean;
  
  // Admin only
  adminDashboard: boolean;
  adminCompliance: boolean;
}

export const getFeatureFlags = (user: User | null, profile?: any): FeatureFlags => {
  const daysSinceSignup = user?.created_at
    ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  
  const isVerified = profile?.verification_status === "verified";
  const isAdmin = profile?.user_role === "admin";
  const isPremium = profile?.subscription_tier === "premium" || profile?.subscription_tier === "enterprise";

  return {
    // Always available
    basicMarketplace: true,
    basicMessaging: true,
    
    // Available after verification
    advancedSearch: isVerified,
    dealRooms: isVerified,
    
    // Available after 3 days
    analytics: daysSinceSignup >= 3,
    marketIntelligence: daysSinceSignup >= 3,
    
    // Available after 7 days
    portfolioManagement: daysSinceSignup >= 7,
    advancedCompliance: daysSinceSignup >= 7,
    
    // Premium features
    bulkImport: isPremium,
    apiAccess: isPremium,
    
    // Admin only
    adminDashboard: isAdmin,
    adminCompliance: isAdmin,
  };
};

export const hasFeatureAccess = (flags: FeatureFlags, feature: keyof FeatureFlags): boolean => {
  return flags[feature];
};

export const getFeatureLockMessage = (feature: keyof FeatureFlags): string => {
  const messages: Record<keyof FeatureFlags, string> = {
    basicMarketplace: "",
    basicMessaging: "",
    advancedSearch: "Verify your identity to unlock advanced search",
    dealRooms: "Verify your identity to access deal rooms",
    analytics: "Available 3 days after signup",
    marketIntelligence: "Available 3 days after signup",
    portfolioManagement: "Available 7 days after signup",
    advancedCompliance: "Available 7 days after signup",
    bulkImport: "Upgrade to Premium to use bulk import",
    apiAccess: "Upgrade to Premium to access the API",
    adminDashboard: "Admin access only",
    adminCompliance: "Admin access only",
  };
  
  return messages[feature];
};
