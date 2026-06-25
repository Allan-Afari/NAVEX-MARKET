import { describe, it, expect } from 'vitest';
import { getFeatureFlags, hasFeatureAccess, getFeatureLockMessage } from './featureFlags';

describe('Feature Flags', () => {
  it('should grant basic features to all users', () => {
    const user = { id: 'test-id', created_at: new Date().toISOString() } as any;
    const flags = getFeatureFlags(user);
    
    expect(flags.basicMarketplace).toBe(true);
    expect(flags.basicMessaging).toBe(true);
  });

  it('should grant advanced features to verified users', () => {
    const user = { id: 'test-id', created_at: new Date().toISOString() } as any;
    const profile = { verification_status: 'verified' };
    const flags = getFeatureFlags(user, profile);
    
    expect(flags.advancedSearch).toBe(true);
    expect(flags.dealRooms).toBe(true);
  });

  it('should not grant advanced features to unverified users', () => {
    const user = { id: 'test-id', created_at: new Date().toISOString() } as any;
    const profile = { verification_status: 'pending' };
    const flags = getFeatureFlags(user, profile);
    
    expect(flags.advancedSearch).toBe(false);
    expect(flags.dealRooms).toBe(false);
  });

  it('should grant analytics after 3 days', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const user = { id: 'test-id', created_at: threeDaysAgo } as any;
    const flags = getFeatureFlags(user);
    
    expect(flags.analytics).toBe(true);
    expect(flags.marketIntelligence).toBe(true);
  });

  it('should not grant analytics before 3 days', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const user = { id: 'test-id', created_at: twoDaysAgo } as any;
    const flags = getFeatureFlags(user);
    
    expect(flags.analytics).toBe(false);
    expect(flags.marketIntelligence).toBe(false);
  });

  it('should grant portfolio management after 7 days', () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const user = { id: 'test-id', created_at: sevenDaysAgo } as any;
    const flags = getFeatureFlags(user);
    
    expect(flags.portfolioManagement).toBe(true);
    expect(flags.advancedCompliance).toBe(true);
  });

  it('should grant premium features to premium users', () => {
    const user = { id: 'test-id', created_at: new Date().toISOString() } as any;
    const profile = { subscription_tier: 'premium' };
    const flags = getFeatureFlags(user, profile);
    
    expect(flags.bulkImport).toBe(true);
    expect(flags.apiAccess).toBe(true);
  });

  it('should grant admin features to admin users', () => {
    const user = { id: 'test-id', created_at: new Date().toISOString() } as any;
    const profile = { user_role: 'admin' };
    const flags = getFeatureFlags(user, profile);
    
    expect(flags.adminDashboard).toBe(true);
    expect(flags.adminCompliance).toBe(true);
  });

  it('should check feature access correctly', () => {
    const flags = {
      basicMarketplace: true,
      basicMessaging: true,
      advancedSearch: false,
      dealRooms: false,
      analytics: false,
      marketIntelligence: false,
      portfolioManagement: false,
      advancedCompliance: false,
      bulkImport: false,
      apiAccess: false,
      adminDashboard: false,
      adminCompliance: false,
    };
    expect(hasFeatureAccess(flags, 'basicMarketplace')).toBe(true);
    expect(hasFeatureAccess(flags, 'advancedSearch')).toBe(false);
  });

  it('should return lock messages for features', () => {
    const message = getFeatureLockMessage('advancedSearch');
    expect(message).toContain('Verify your identity');
    
    const premiumMessage = getFeatureLockMessage('bulkImport');
    expect(premiumMessage).toContain('Premium');
  });
});
