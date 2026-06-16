import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Download,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { getDealRoomActivityHistory, exportActivityAuditTrail } from "@/lib/activityTracking";
import { getComplianceFlags, generateComplianceReport } from "@/lib/complianceChecks";

interface ActivityDashboardProps {
  dealRoomId: string;
  isAdmin?: boolean;
}

export const ActivityAuditDashboard = ({
  dealRoomId,
  isAdmin = false,
}: ActivityDashboardProps) => {
  const [activities, setActivities] = useState<any[]>([]);
  const [complianceFlags, setComplianceFlags] = useState<any[]>([]);
  const [activitySummary, setActivitySummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Load activity history
      const activityData = await getDealRoomActivityHistory(dealRoomId, 100);
      setActivities(activityData);

      // Calculate activity summary
      const summary: Record<string, number> = {};
      activityData.forEach((activity) => {
        summary[activity.action] = (summary[activity.action] || 0) + 1;
      });
      setActivitySummary(summary);

      // Load compliance flags
      if (isAdmin) {
        const flagData = await getComplianceFlags(undefined, dealRoomId);
        setComplianceFlags(flagData);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load audit data");
    } finally {
      setLoading(false);
    }
  }, [dealRoomId, isAdmin]);

  const handleExportAuditTrail = async () => {
    try {
      const csv = await exportActivityAuditTrail(dealRoomId, "csv");
      if (!csv) {
        toast.error("No data to export");
        return;
      }

      // Create download link
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-trail-${dealRoomId}-${Date.now()}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success("Audit trail exported successfully");
    } catch (error) {
      console.error("Error exporting audit trail:", error);
      toast.error("Failed to export audit trail");
    }
  };

  const handleGenerateComplianceReport = async () => {
    try {
      const report = await generateComplianceReport(dealRoomId);
      if (!report) {
        toast.error("Failed to generate report");
        return;
      }

      // Download as JSON
      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `compliance-report-${dealRoomId}-${Date.now()}.json`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success("Compliance report generated");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    }
  };

  const chartData = Object.entries(activitySummary).map(([action, count]) => ({
    name: action,
    count,
  }));

  const severityData = [
    { name: "Critical", value: complianceFlags.filter((f) => f.severity === "critical").length },
    { name: "High", value: complianceFlags.filter((f) => f.severity === "high").length },
    { name: "Medium", value: complianceFlags.filter((f) => f.severity === "medium").length },
    { name: "Low", value: complianceFlags.filter((f) => f.severity === "low").length },
  ];

  const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Audit & Compliance Dashboard
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time activity tracking and compliance monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportAuditTrail} className="gap-2">
            <Download className="w-4 h-4" />
            Export Audit Trail
          </Button>
          {isAdmin && (
            <Button onClick={handleGenerateComplianceReport} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Compliance Report
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Total Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activities.length}</div>
            <p className="text-xs text-muted-foreground">audit events logged</p>
          </CardContent>
        </Card>

        {isAdmin && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Compliance Flags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{complianceFlags.length}</div>
                <p className="text-xs text-muted-foreground">
                  {complianceFlags.filter((f) => f.status === "pending").length} pending review
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  Critical Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {complianceFlags.filter((f) => f.severity === "critical").length}
                </div>
                <p className="text-xs text-muted-foreground">require immediate action</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Cleared
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {complianceFlags.filter((f) => f.status === "cleared").length}
                </div>
                <p className="text-xs text-muted-foreground">compliance checks</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No activity data
              </div>
            )}
          </CardContent>
        </Card>

        {/* Compliance Severity */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Compliance Flags by Severity</CardTitle>
            </CardHeader>
            <CardContent>
              {severityData.some((d) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => (value > 0 ? `${name}: ${value}` : null)}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No compliance flags
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : activities.length > 0 ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {activities.slice(0, 20).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.user?.full_name} •{" "}
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline">{activity.action.replace(/_/g, " ")}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No activities recorded yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compliance Flags */}
      {isAdmin && complianceFlags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Compliance Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {complianceFlags.map((flag) => (
                <div
                  key={flag.id}
                  className="flex items-start justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      <p className="font-medium text-sm">{flag.flag_type}</p>
                      <Badge
                        variant={
                          flag.severity === "critical"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {flag.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {flag.description}
                    </p>
                  </div>
                  <Badge variant="outline">{flag.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ActivityAuditDashboard;
