-- Enterprise Security Feature Migration
-- Creates tables for security policies, audit logging, and encryption management

-- Create security_policies table
CREATE TABLE IF NOT EXISTS security_policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_name VARCHAR(255) NOT NULL UNIQUE,
  policy_type VARCHAR(100) NOT NULL CHECK (policy_type IN ('password', 'mfa', 'session', 'data_retention', 'access_control', 'encryption')),
  is_enabled BOOLEAN DEFAULT true,
  policy_config JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_security_policies_type ON security_policies(policy_type);
CREATE INDEX idx_security_policies_enabled ON security_policies(is_enabled);

ALTER TABLE security_policies ENABLE ROW LEVEL SECURITY;

-- Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'success' CHECK (status IN ('success', 'failure', 'warning')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_resource_type ON audit_log(resource_type);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_status ON audit_log(status);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Create encryption_keys table
CREATE TABLE IF NOT EXISTS encryption_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key_name VARCHAR(255) NOT NULL UNIQUE,
  key_type VARCHAR(100) NOT NULL CHECK (key_type IN ('data_at_rest', 'data_in_transit', 'field_level')),
  algorithm VARCHAR(50) NOT NULL DEFAULT 'AES-256-GCM',
  key_version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  key_rotation_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_encryption_keys_type ON encryption_keys(key_type);
CREATE INDEX idx_encryption_keys_active ON encryption_keys(is_active);

ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;

-- Create security_events table for real-time monitoring
CREATE TABLE IF NOT EXISTS security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL CHECK (event_type IN ('login_attempt', 'password_change', 'mfa_enabled', 'mfa_disabled', 'suspicious_activity', 'data_access', 'permission_change', 'api_key_created', 'api_key_revoked')),
  severity VARCHAR(50) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_user_id ON security_events(user_id);
CREATE INDEX idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX idx_security_events_resolved ON security_events(is_resolved);

ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Create user_sessions table for session management
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  device_type VARCHAR(100),
  location_country VARCHAR(100),
  location_city VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Create api_keys table for API key management
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(20) NOT NULL,
  scopes TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_used TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies for security_policies
CREATE POLICY "Admins can view security policies"
  ON security_policies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create security policies"
  ON security_policies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update security policies"
  ON security_policies FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for audit_log
CREATE POLICY "Users can view their own audit logs"
  ON audit_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all audit logs"
  ON audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for encryption_keys
CREATE POLICY "Admins can manage encryption keys"
  ON encryption_keys FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for security_events
CREATE POLICY "Users can view their own security events"
  ON security_events FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all security events"
  ON security_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can resolve security events"
  ON security_events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for user_sessions
CREATE POLICY "Users can view their own sessions"
  ON user_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own sessions"
  ON user_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sessions"
  ON user_sessions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own sessions"
  ON user_sessions FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for api_keys
CREATE POLICY "Users can view their own API keys"
  ON api_keys FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own API keys"
  ON api_keys FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own API keys"
  ON api_keys FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own API keys"
  ON api_keys FOR DELETE
  USING (user_id = auth.uid());

-- Insert default security policies
INSERT INTO security_policies (policy_name, policy_type, is_enabled, policy_config, description) VALUES
('password_complexity', 'password', true, '{"min_length": 12, "require_uppercase": true, "require_lowercase": true, "require_numbers": true, "require_special_chars": true, "password_history": 5, "expiry_days": 90}', 'Enforces strong password requirements'),
('mfa_required', 'mfa', false, '{"required_for_all": false, "required_for_admins": true, "allowed_methods": ["totp", "sms"]}', 'Multi-factor authentication requirements'),
('session_timeout', 'session', true, '{"timeout_minutes": 30, "max_concurrent_sessions": 5, "remember_me_days": 30}', 'Session management policies'),
('data_retention', 'data_retention', true, '{"audit_log_retention_days": 365, "session_log_retention_days": 90, "deleted_data_retention_days": 30}', 'Data retention and cleanup policies'),
('access_control', 'access_control', true, '{"ip_whitelist_enabled": false, "geo_restriction_enabled": false, "allowed_countries": []}', 'Access control and restrictions'),
('encryption_at_rest', 'encryption', true, '{"algorithm": "AES-256-GCM", "key_rotation_days": 90, "field_level_encryption": true}', 'Encryption at rest policies')
ON CONFLICT (policy_name) DO NOTHING;

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id UUID,
  p_action VARCHAR(100),
  p_resource_type VARCHAR(100),
  p_resource_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_status VARCHAR(50) DEFAULT 'success',
  p_error_message TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO audit_log (
    user_id,
    action,
    resource_type,
    resource_id,
    ip_address,
    user_agent,
    metadata,
    status,
    error_message
  ) VALUES (
    p_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    inet_client_addr(),
    current_setting('request.headers.user-agent', true),
    p_metadata,
    p_status,
    p_error_message
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create security event
CREATE OR REPLACE FUNCTION create_security_event(
  p_event_type VARCHAR(100),
  p_severity VARCHAR(50) DEFAULT 'info',
  p_user_id UUID DEFAULT NULL,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO security_events (
    event_type,
    severity,
    user_id,
    description,
    metadata
  ) VALUES (
    p_event_type,
    p_severity,
    p_user_id,
    p_description,
    p_metadata
  ) RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for suspicious activity
CREATE OR REPLACE FUNCTION check_suspicious_activity(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_failed_attempts INTEGER;
  v_different_ips INTEGER;
  v_threshold INTEGER := 5;
BEGIN
  -- Check for multiple failed login attempts
  SELECT COUNT(*) INTO v_failed_attempts
  FROM audit_log
  WHERE user_id = p_user_id
  AND action = 'login_attempt'
  AND status = 'failure'
  AND created_at > now() - interval '15 minutes';

  -- Check for logins from different IPs
  SELECT COUNT(DISTINCT ip_address) INTO v_different_ips
  FROM audit_log
  WHERE user_id = p_user_id
  AND action = 'login_attempt'
  AND status = 'success'
  AND created_at > now() - interval '1 hour';

  -- Create security event if suspicious
  IF v_failed_attempts >= v_threshold THEN
    PERFORM create_security_event(
      'suspicious_activity',
      'critical',
      p_user_id,
      'Multiple failed login attempts detected',
      '{"failed_attempts": ' || v_failed_attempts || '}'::jsonb
    );
    RETURN true;
  END IF;

  IF v_different_ips > 3 THEN
    PERFORM create_security_event(
      'suspicious_activity',
      'warning',
      p_user_id,
      'Multiple login attempts from different IPs',
      '{"different_ips": ' || v_different_ips || '}'::jsonb
    );
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to rotate encryption keys
CREATE OR REPLACE FUNCTION rotate_encryption_key(p_key_name VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_version INTEGER;
BEGIN
  -- Get current version
  SELECT key_version INTO v_current_version
  FROM encryption_keys
  WHERE key_name = p_key_name
  AND is_active = true;

  IF v_current_version IS NULL THEN
    RETURN false;
  END IF;

  -- Deactivate current key
  UPDATE encryption_keys
  SET is_active = false,
      key_rotation_date = now()
  WHERE key_name = p_key_name
  AND is_active = true;

  -- Create new version
  INSERT INTO encryption_keys (key_name, key_type, algorithm, key_version, is_active)
  SELECT
    key_name,
    key_type,
    algorithm,
    v_current_version + 1,
    true
  FROM encryption_keys
  WHERE key_name = p_key_name
  AND key_version = v_current_version;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM user_sessions
  WHERE expires_at < now()
  OR (is_active = false AND last_activity < now() - interval '7 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically log changes to sensitive tables
CREATE OR REPLACE FUNCTION log_sensitive_data_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_event(
      auth.uid(),
      'create',
      TG_TABLE_NAME::text,
      NEW.id,
      jsonb_build_object('operation', 'insert', 'new_data', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_audit_event(
      auth.uid(),
      'update',
      TG_TABLE_NAME::text,
      NEW.id,
      jsonb_build_object('operation', 'update', 'old_data', to_jsonb(OLD), 'new_data', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit_event(
      auth.uid(),
      'delete',
      TG_TABLE_NAME::text,
      OLD.id,
      jsonb_build_object('operation', 'delete', 'old_data', to_jsonb(OLD))
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for sensitive tables
DROP TRIGGER IF EXISTS trigger_log_deals_changes ON deals;
CREATE TRIGGER trigger_log_deals_changes
AFTER INSERT OR UPDATE OR DELETE ON deals
FOR EACH ROW EXECUTE FUNCTION log_sensitive_data_changes();

DROP TRIGGER IF EXISTS trigger_log_deal_rooms_changes ON deal_rooms;
CREATE TRIGGER trigger_log_deal_rooms_changes
AFTER INSERT OR UPDATE OR DELETE ON deal_rooms
FOR EACH ROW EXECUTE FUNCTION log_sensitive_data_changes();

DROP TRIGGER IF EXISTS trigger_log_agreements_changes ON agreements;
CREATE TRIGGER trigger_log_agreements_changes
AFTER INSERT OR UPDATE OR DELETE ON agreements
FOR EACH ROW EXECUTE FUNCTION log_sensitive_data_changes();

-- Schedule cleanup job (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-expired-sessions', '0 * * * *', 'SELECT cleanup_expired_sessions();');
