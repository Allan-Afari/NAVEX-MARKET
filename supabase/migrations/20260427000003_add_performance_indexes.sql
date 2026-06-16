-- Add performance indexes for better query performance

-- Deals table indexes
CREATE INDEX IF NOT EXISTS idx_deals_sector ON public.deals(sector);
CREATE INDEX IF NOT EXISTS idx_deals_location ON public.deals(location);
CREATE INDEX IF NOT EXISTS idx_deals_funding_type ON public.deals(funding_type);
CREATE INDEX IF NOT EXISTS idx_deals_status ON public.deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON public.deals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_user_id ON public.deals(user_id);
CREATE INDEX IF NOT EXISTS idx_deals_featured ON public.deals(featured) WHERE featured = true;

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_sector ON public.profiles(sector);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(location);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON public.profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_profiles_trust_score ON public.profiles(trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);

-- Messages table indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Access unlocks table indexes
CREATE INDEX IF NOT EXISTS idx_access_unlocks_user_id ON public.access_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_access_unlocks_deal_id ON public.access_unlocks(deal_id);
CREATE INDEX IF NOT EXISTS idx_access_unlocks_created_at ON public.access_unlocks(created_at DESC);

-- Subscriptions table indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON public.subscriptions(tier);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- Full-text search index for deals
CREATE INDEX IF NOT EXISTS idx_deals_fts ON public.deals USING gin(to_tsvector('english', title || ' ' || description || ' ' || sector || ' ' || location));

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_deals_sector_location ON public.deals(sector, location);
CREATE INDEX IF NOT EXISTS idx_profiles_role_verification ON public.profiles(role, verification_status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at DESC);