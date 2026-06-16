import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  AlertTriangle,
  Activity,
  Key,
  Smartphone,
  FileText,
  Lock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getSecuritySummary,
  getUserSessions,
  getUserSecurityEvents,
  getUserApiKeys,
  getUserAuditLogs,
  terminateSession,
  revokeApiKey,
  resolveSecurityEvent,
  type UserSession,
  type SecurityEvent,
  type ApiKey,
  type AuditLog,
} from "@/lib/enterpriseSecurity";

interface SecurityDashboardProps {
  userId: string;
}

export default function SecurityDashboard({ userId }: SecurityDashboardProps) {
  const [summary, setSummary] = useState<any>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSecurityData();
  }, [loadSecurityData]);

  const loadSecurityData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryData, sessionsData, eventsData, apiKeysData, auditLogsData] =
        await Promise.all([
          getSecuritySummary(userId),
          getUserSessions(userId),
          getUserSecurityEvents(userId, true),
          getUserApiKeys(userId),
          getUserAuditLogs(userId, 20),
        ]);

      setSummary(summaryData);
      setSessions(sessionsData);
      setEvents(eventsData);
      setApiKeys(apiKeysData);
      setAuditLogs(auditLogsData);
    } catch (error) {
      console.error("Error loading security data:", error);
      toast.error("Failed to load security data");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const handleTerminateSession = async (sessionId: string) => {
    try {
      const success = await terminateSession(sessionId);
      if (success) {
        toast.success("Session terminated");
        loadSecurityData();
      } else {
        toast.error("Failed to terminate session");
      }
    } catch (error) {
      console.error("Error terminating session:", error);
      toast.error("Failed to terminate session");
    }
  };

  const handleRevokeApiKey = async (keyId: string) => {
    try {
      const success = await revokeApiKey(keyId);
      if (success) {
        toast.success("API key revoked");
        loadSecurityData();
      } else {
        toast.error("Failed to revoke API key");
      }
    } catch (error) {
      console.error("Error revoking API key:", error);
      toast.error("Failed to revoke API key");
    }
  };

  const handleResolveEvent = async (eventId: string) => {
    try {
      const success = await resolveSecurityEvent(eventId, userId);
      if (success) {
        toast.success("Security event resolved");
        loadSecurityData();
      } else {
        toast.error("Failed to resolve security event");
      }
    } catch (error) {
      console.error("Error resolving security event:", error);
      toast.error("Failed to resolve security event");
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500";
      case "warning":
        return "bg-yellow-500";
      default:
        return "bg-blue-500";
    }
  };

  const getStatusIcon = (status: string) => {
    return status === "success" ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading security data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <Smartphone className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.active_sessions}</div>
              <div className="text-xs text-muted-foreground">
                {summary.total_sessions} total
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Unresolved Events</CardTitle>
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.unresolved_events}</div>
              <div className="text-xs text-muted-foreground">Requires attention</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
              <Shield className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.recent_failed_logins}</div>
              <div className="text-xs text-muted-foreground">Last 10 attempts</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">API Keys</CardTitle>
              <Key className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{apiKeys.length}</div>
              <div className="text-xs text-muted-foreground">
                {apiKeys.filter(k => k.is_active).length} active
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="sessions">
        <TabsList>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="events">Security Events</TabsTrigger>
          <TabsTrigger value="apikeys">API Keys</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">
                            {session.device_type || "Unknown Device"}
                          </span>
                          {session.is_active && (
                            <Badge variant="outline" className="text-xs">
                              Active
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {session.ip_address && `IP: ${session.ip_address}`}
                          {session.location_country && ` • ${session.location_country}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Last active: {new Date(session.last_activity).toLocaleString()}
                        </div>
                      </div>
                      {session.is_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTerminateSession(session.id)}
                        >
                          Terminate
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Security Events</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {events.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No unresolved security events</p>
                    </div>
                  ) : (
                    events.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 p-4 border rounded-lg"
                      >
                        <div
                          className={`w-2 h-2 rounded-full mt-2 ${getSeverityColor(
                            event.severity
                          )}`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{event.description}</div>
                            <Badge
                              variant="outline"
                              className={`text-xs ${getSeverityColor(
                                event.severity
                              )} text-white`}
                            >
                              {event.severity}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(event.created_at).toLocaleString()}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolveEvent(event.id)}
                        >
                          Resolve
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apikeys">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>API Keys</CardTitle>
                <Button size="sm">
                  <Key className="w-4 h-4 mr-2" />
                  Generate Key
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {apiKeys.map((apiKey) => (
                    <div
                      key={apiKey.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Key className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{apiKey.key_name}</span>
                          {apiKey.is_active ? (
                            <Badge variant="outline" className="text-xs">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Revoked
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {apiKey.key_prefix}••••••••••••
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Created: {new Date(apiKey.created_at).toLocaleDateString()}
                          {apiKey.expires_at &&
                            ` • Expires: ${new Date(apiKey.expires_at).toLocaleDateString()}`}
                        </div>
                      </div>
                      {apiKey.is_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevokeApiKey(apiKey.id)}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Audit Log</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          <span className="font-medium">{log.action}</span>
                          <Badge variant="outline" className="text-xs">
                            {log.resource_type}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                        {log.ip_address && (
                          <div className="text-xs text-muted-foreground">
                            IP: {log.ip_address}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
