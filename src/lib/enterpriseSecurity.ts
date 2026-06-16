import { supabase } from "@/integrations/supabase/client";

export interface SecurityPolicy {
  id: string;
  policy_name: string;
  policy_type: 'password' | 'mfa' | 'session' | 'data_retention' | 'access_control' | 'encryption';
  is_enabled: boolean;
  policy_config: any;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: any;
  status: 'success' | 'failure' | 'warning';
  error_message?: string;
  created_at: string;
}

export interface SecurityEvent {
  id: string;
  event_type: 'login_attempt' | 'password_change' | 'mfa_enabled' | 'mfa_disabled' | 'suspicious_activity' | 'data_access' | 'permission_change' | 'api_key_created' | 'api_key_revoked';
  severity: 'info' | 'warning' | 'critical';
  user_id?: string;
  description: string;
  metadata?: any;
  is_resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  ip_address?: string;
  user_agent?: string;
  device_type?: string;
  location_country?: string;
  location_city?: string;
  is_active: boolean;
  last_activity: string;
  expires_at: string;
  created_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  key_name: string;
  key_hash: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  last_used?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all security policies
 */
export const getSecurityPolicies = async (): Promise<SecurityPolicy[]> => {
  try {
    const { data, error } = await (supabase.from("security_policies" as any) as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as SecurityPolicy[]) || [];
  } catch (error) {
    console.error("Error fetching security policies:", error);
    return [];
  }
};

/**
 * Get security policy by name
 */
export const getSecurityPolicy = async (policyName: string): Promise<SecurityPolicy | null> => {
  try {
    const { data, error } = await (supabase.from("security_policies" as any) as any)
      .select("*")
      .eq("policy_name", policyName)
      .single();

    if (error) throw error;
    return data as SecurityPolicy;
  } catch (error) {
    console.error("Error fetching security policy:", error);
    return null;
  }
};

/**
 * Update security policy
 */
export const updateSecurityPolicy = async (
  policyId: string,
  updates: Partial<Omit<SecurityPolicy, 'id' | 'created_at'>>
): Promise<boolean> => {
  try {
    const { error } = await (supabase.from("security_policies" as any) as any)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", policyId);

    return !error;
  } catch (error) {
    console.error("Error updating security policy:", error);
    return false;
  }
};

/**
 * Log audit event
 */
export const logAuditEvent = async (
  userId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  metadata?: any,
  status: 'success' | 'failure' | 'warning' = 'success',
  errorMessage?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('log_audit_event' as any, {
      p_user_id: userId,
      p_action: action,
      p_resource_type: resourceType,
      p_resource_id: resourceId,
      p_metadata: metadata || {},
      p_status: status,
      p_error_message: errorMessage,
    });

    return !error;
  } catch (error) {
    console.error("Error logging audit event:", error);
    return false;
  }
};

/**
 * Get audit logs for a user
 */
export const getUserAuditLogs = async (
  userId: string,
  limit: number = 50
): Promise<AuditLog[]> => {
  try {
    const { data, error } = await (supabase.from("audit_log" as any) as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data as AuditLog[]) || [];
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return [];
  }
};

/**
 * Get all audit logs (admin only)
 */
export const getAllAuditLogs = async (
  limit: number = 100,
  offset: number = 0
): Promise<AuditLog[]> => {
  try {
    const { data, error } = await (supabase.from("audit_log" as any) as any)
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return (data as AuditLog[]) || [];
  } catch (error) {
    console.error("Error fetching all audit logs:", error);
    return [];
  }
};

/**
 * Create security event
 */
export const createSecurityEvent = async (
  eventType: SecurityEvent['event_type'],
  description: string,
  severity: SecurityEvent['severity'] = 'info',
  userId?: string,
  metadata?: any
): Promise<string | null> => {
  try {
    const { data, error } = await supabase.rpc('create_security_event' as any, {
      p_event_type: eventType,
      p_severity: severity,
      p_user_id: userId,
      p_description: description,
      p_metadata: metadata || {},
    });

    if (error) throw error;
    return data as string;
  } catch (error) {
    console.error("Error creating security event:", error);
    return null;
  }
};

/**
 * Get security events for a user
 */
export const getUserSecurityEvents = async (
  userId: string,
  unresolvedOnly: boolean = false
): Promise<SecurityEvent[]> => {
  try {
    let query = (supabase.from("security_events" as any) as any)
      .select("*")
      .eq("user_id", userId);

    if (unresolvedOnly) {
      query = query.eq("is_resolved", false);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return (data as SecurityEvent[]) || [];
  } catch (error) {
    console.error("Error fetching security events:", error);
    return [];
  }
};

/**
 * Get all security events (admin only)
 */
export const getAllSecurityEvents = async (
  unresolvedOnly: boolean = false
): Promise<SecurityEvent[]> => {
  try {
    let query = (supabase.from("security_events" as any) as any)
      .select("*");

    if (unresolvedOnly) {
      query = query.eq("is_resolved", false);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    return (data as SecurityEvent[]) || [];
  } catch (error) {
    console.error("Error fetching all security events:", error);
    return [];
  }
};

/**
 * Resolve security event
 */
export const resolveSecurityEvent = async (
  eventId: string,
  resolvedBy: string
): Promise<boolean> => {
  try {
    const { error } = await (supabase.from("security_events" as any) as any)
      .update({
        is_resolved: true,
        resolved_by: resolvedBy,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", eventId);

    return !error;
  } catch (error) {
    console.error("Error resolving security event:", error);
    return false;
  }
};

/**
 * Get user sessions
 */
export const getUserSessions = async (userId: string): Promise<UserSession[]> => {
  try {
    const { data, error } = await (supabase.from("user_sessions" as any) as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as UserSession[]) || [];
  } catch (error) {
    console.error("Error fetching user sessions:", error);
    return [];
  }
};

/**
 * Terminate user session
 */
export const terminateSession = async (sessionId: string): Promise<boolean> => {
  try {
    const { error } = await (supabase.from("user_sessions" as any) as any)
      .update({
        is_active: false,
        last_activity: new Date().toISOString(),
      })
      .eq("id", sessionId);

    return !error;
  } catch (error) {
    console.error("Error terminating session:", error);
    return false;
  }
};

/**
 * Terminate all user sessions except current
 */
export const terminateAllOtherSessions = async (userId: string, currentSessionId: string): Promise<boolean> => {
  try {
    const { error } = await (supabase.from("user_sessions" as any) as any)
      .update({
        is_active: false,
        last_activity: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .neq("id", currentSessionId);

    return !error;
  } catch (error) {
    console.error("Error terminating all other sessions:", error);
    return false;
  }
};

/**
 * Get user API keys
 */
export const getUserApiKeys = async (userId: string): Promise<ApiKey[]> => {
  try {
    const { data, error } = await (supabase.from("api_keys" as any) as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as ApiKey[]) || [];
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return [];
  }
};

/**
 * Create API key
 */
export const createApiKey = async (
  userId: string,
  keyName: string,
  keyHash: string,
  keyPrefix: string,
  scopes: string[] = [],
  expiresAt?: string
): Promise<ApiKey | null> => {
  try {
    const { data, error } = await (supabase.from("api_keys" as any) as any)
      .insert({
        user_id: userId,
        key_name: keyName,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        scopes,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) throw error;
    return data as ApiKey;
  } catch (error) {
    console.error("Error creating API key:", error);
    return null;
  }
};

/**
 * Revoke API key
 */
export const revokeApiKey = async (keyId: string): Promise<boolean> => {
  try {
    const { error } = await (supabase.from("api_keys" as any) as any)
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", keyId);

    return !error;
  } catch (error) {
    console.error("Error revoking API key:", error);
    return false;
  }
};

/**
 * Update API key last used timestamp
 */
export const updateApiKeyLastUsed = async (keyId: string): Promise<boolean> => {
  try {
    const { error } = await (supabase.from("api_keys" as any) as any)
      .update({
        last_used: new Date().toISOString(),
      })
      .eq("id", keyId);

    return !error;
  } catch (error) {
    console.error("Error updating API key last used:", error);
    return false;
  }
};

/**
 * Check for suspicious activity
 */
export const checkSuspiciousActivity = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('check_suspicious_activity' as any, {
      p_user_id: userId,
    });

    if (error) throw error;
    return data as boolean;
  } catch (error) {
    console.error("Error checking suspicious activity:", error);
    return false;
  }
};

/**
 * Get security summary for dashboard
 */
export const getSecuritySummary = async (userId: string) => {
  try {
    const [sessions, events, auditLogs] = await Promise.all([
      getUserSessions(userId),
      getUserSecurityEvents(userId, true),
      getUserAuditLogs(userId, 10),
    ]);

    const activeSessions = sessions.filter(s => s.is_active).length;
    const unresolvedEvents = events.length;
    const recentFailedLogins = auditLogs.filter(
      log => log.action === 'login_attempt' && log.status === 'failure'
    ).length;

    return {
      active_sessions: activeSessions,
      unresolved_events: unresolvedEvents,
      recent_failed_logins: recentFailedLogins,
      total_sessions: sessions.length,
    };
  } catch (error) {
    console.error("Error getting security summary:", error);
    return null;
  }
};
