-- Portfolio Management Feature Migration
-- Creates tables for investment portfolio tracking and cap table management

-- Create portfolios table
CREATE TABLE IF NOT EXISTS portfolios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'investment' CHECK (type IN ('investment', 'fund', 'syndicate', 'spv')),
  total_value DECIMAL(20, 2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX idx_portfolios_type ON portfolios(type);

ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;

-- Create portfolio_investments table
CREATE TABLE IF NOT EXISTS portfolio_investments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  deal_room_id UUID REFERENCES deal_rooms(id) ON DELETE SET NULL,
  company_name VARCHAR(255) NOT NULL,
  investment_amount DECIMAL(20, 2) NOT NULL,
  shares_count DECIMAL(20, 4),
  share_price DECIMAL(20, 4),
  ownership_percentage DECIMAL(5, 2),
  investment_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'exited', 'written_off')),
  exit_date DATE,
  exit_amount DECIMAL(20, 2),
  exit_multiple DECIMAL(5, 2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_portfolio_investments_portfolio_id ON portfolio_investments(portfolio_id);
CREATE INDEX idx_portfolio_investments_deal_id ON portfolio_investments(deal_id);
CREATE INDEX idx_portfolio_investments_status ON portfolio_investments(status);
CREATE INDEX idx_portfolio_investments_investment_date ON portfolio_investments(investment_date DESC);

ALTER TABLE portfolio_investments ENABLE ROW LEVEL SECURITY;

-- Create cap_table_entries table for equity tracking
CREATE TABLE IF NOT EXISTS cap_table_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_investment_id UUID REFERENCES portfolio_investments(id) ON DELETE CASCADE,
  shareholder_name VARCHAR(255) NOT NULL,
  shareholder_type VARCHAR(50) CHECK (shareholder_type IN ('founder', 'investor', 'employee', 'advisor', 'other')),
  share_class VARCHAR(100) NOT NULL, -- Common, Preferred A, Preferred B, etc.
  shares_issued DECIMAL(20, 4) NOT NULL,
  share_price DECIMAL(20, 4) NOT NULL,
  fully_diluted_shares DECIMAL(20, 4),
  ownership_percentage DECIMAL(5, 2),
  voting_rights DECIMAL(5, 2),
  liquidation_preference DECIMAL(5, 2),
  anti_dilution BOOLEAN DEFAULT false,
  board_seat BOOLEAN DEFAULT false,
  information_rights BOOLEAN DEFAULT false,
  pro_rata_rights BOOLEAN DEFAULT false,
  vesting_schedule JSONB, -- Store vesting details
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_cap_table_entries_investment_id ON cap_table_entries(portfolio_investment_id);
CREATE INDEX idx_cap_table_entries_shareholder_type ON cap_table_entries(shareholder_type);
CREATE INDEX idx_cap_table_entries_share_class ON cap_table_entries(share_class);

ALTER TABLE cap_table_entries ENABLE ROW LEVEL SECURITY;

-- Create funding_rounds table
CREATE TABLE IF NOT EXISTS funding_rounds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  deal_room_id UUID REFERENCES deal_rooms(id) ON DELETE SET NULL,
  round_type VARCHAR(100) NOT NULL, -- Seed, Series A, Series B, etc.
  round_name VARCHAR(255),
  pre_money_valuation DECIMAL(20, 2),
  post_money_valuation DECIMAL(20, 2),
  amount_raised DECIMAL(20, 2) NOT NULL,
  lead_investor VARCHAR(255),
  investors_count INTEGER,
  announcement_date DATE,
  closed_date DATE,
  status VARCHAR(50) DEFAULT 'announced' CHECK (status IN ('announced', 'closed', 'cancelled')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_funding_rounds_deal_id ON funding_rounds(deal_id);
CREATE INDEX idx_funding_rounds_round_type ON funding_rounds(round_type);
CREATE INDEX idx_funding_rounds_closed_date ON funding_rounds(closed_date DESC);

ALTER TABLE funding_rounds ENABLE ROW LEVEL SECURITY;

-- Create portfolio_performance table for tracking metrics
CREATE TABLE IF NOT EXISTS portfolio_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  total_invested DECIMAL(20, 2) DEFAULT 0,
  current_value DECIMAL(20, 2) DEFAULT 0,
  unrealized_gains DECIMAL(20, 2) DEFAULT 0,
  realized_gains DECIMAL(20, 2) DEFAULT 0,
  total_returns DECIMAL(20, 2) DEFAULT 0,
  irr DECIMAL(5, 2),
  multiple DECIMAL(5, 2),
  active_investments INTEGER DEFAULT 0,
  exited_investments INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(portfolio_id, metric_date)
);

CREATE INDEX idx_portfolio_performance_portfolio_id ON portfolio_performance(portfolio_id);
CREATE INDEX idx_portfolio_performance_metric_date ON portfolio_performance(metric_date DESC);

ALTER TABLE portfolio_performance ENABLE ROW LEVEL SECURITY;

-- Create portfolio_alerts table for notifications
CREATE TABLE IF NOT EXISTS portfolio_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  investment_id UUID REFERENCES portfolio_investments(id) ON DELETE CASCADE,
  alert_type VARCHAR(100) NOT NULL CHECK (alert_type IN ('valuation_change', 'exit_opportunity', 'down_round', 'upcoming_milestone', 'compliance_issue', 'other')),
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  action_required BOOLEAN DEFAULT false,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_portfolio_alerts_portfolio_id ON portfolio_alerts(portfolio_id);
CREATE INDEX idx_portfolio_alerts_is_read ON portfolio_alerts(is_read);
CREATE INDEX idx_portfolio_alerts_created_at ON portfolio_alerts(created_at DESC);

ALTER TABLE portfolio_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for portfolios
CREATE POLICY "Users can view their own portfolios"
  ON portfolios FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own portfolios"
  ON portfolios FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own portfolios"
  ON portfolios FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own portfolios"
  ON portfolios FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for portfolio_investments
CREATE POLICY "Users can view investments in their portfolios"
  ON portfolio_investments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM portfolios
      WHERE portfolios.id = portfolio_investments.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create investments in their portfolios"
  ON portfolio_investments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM portfolios
      WHERE portfolios.id = portfolio_investments.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update investments in their portfolios"
  ON portfolio_investments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM portfolios
      WHERE portfolios.id = portfolio_investments.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- RLS Policies for cap_table_entries
CREATE POLICY "Users can view cap table entries for their investments"
  ON cap_table_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM portfolio_investments
      JOIN portfolios ON portfolios.id = portfolio_investments.portfolio_id
      WHERE portfolio_investments.id = cap_table_entries.portfolio_investment_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- RLS Policies for funding_rounds
CREATE POLICY "Users can view funding rounds for their investments"
  ON funding_rounds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM portfolio_investments
      JOIN portfolios ON portfolios.id = portfolio_investments.portfolio_id
      WHERE portfolio_investments.deal_id = funding_rounds.deal_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- RLS Policies for portfolio_performance
CREATE POLICY "Users can view performance for their portfolios"
  ON portfolio_performance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM portfolios
      WHERE portfolios.id = portfolio_performance.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- RLS Policies for portfolio_alerts
CREATE POLICY "Users can view alerts for their portfolios"
  ON portfolio_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM portfolios
      WHERE portfolios.id = portfolio_alerts.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own alerts"
  ON portfolio_alerts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM portfolios
      WHERE portfolios.id = portfolio_alerts.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- Function to update portfolio total value
CREATE OR REPLACE FUNCTION update_portfolio_total_value()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE portfolios
  SET total_value = (
    SELECT COALESCE(SUM(CASE 
      WHEN status = 'exited' THEN COALESCE(exit_amount, 0)
      ELSE investment_amount
    END), 0)
    FROM portfolio_investments
    WHERE portfolio_id = NEW.portfolio_id
  ),
  updated_at = now()
  WHERE id = NEW.portfolio_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update portfolio value on investment changes
CREATE TRIGGER trigger_update_portfolio_total_value
AFTER INSERT OR UPDATE ON portfolio_investments
FOR EACH ROW
EXECUTE FUNCTION update_portfolio_total_value();

-- Function to calculate portfolio performance metrics
CREATE OR REPLACE FUNCTION calculate_portfolio_performance(portfolio_id UUID, metric_date DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO portfolio_performance (
    portfolio_id,
    metric_date,
    total_invested,
    current_value,
    unrealized_gains,
    realized_gains,
    total_returns,
    active_investments,
    exited_investments
  )
  SELECT
    portfolio_id,
    metric_date,
    COALESCE(SUM(CASE WHEN status IN ('active', 'pending') THEN investment_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE 
      WHEN status = 'exited' THEN COALESCE(exit_amount, 0)
      ELSE investment_amount
    END), 0),
    0, -- Calculate based on current valuations
    COALESCE(SUM(CASE WHEN status = 'exited' THEN COALESCE(exit_amount, 0) - investment_amount ELSE 0 END), 0),
    0, -- Total returns
    COUNT(*) FILTER (WHERE status IN ('active', 'pending')),
    COUNT(*) FILTER (WHERE status = 'exited')
  FROM portfolio_investments
  WHERE portfolio_id = portfolio_id
  ON CONFLICT (portfolio_id, metric_date) DO UPDATE SET
    total_invested = EXCLUDED.total_invested,
    current_value = EXCLUDED.current_value,
    unrealized_gains = EXCLUDED.unrealized_gains,
    realized_gains = EXCLUDED.realized_gains,
    total_returns = EXCLUDED.total_returns,
    active_investments = EXCLUDED.active_investments,
    exited_investments = EXCLUDED.exited_investments;
END;
$$ LANGUAGE plpgsql;
