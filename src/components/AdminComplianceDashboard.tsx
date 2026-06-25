import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Download,
  CheckSquare,
  ArrowUp,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import {
  getPendingComplianceFlags,
  getComplianceStats,
  resolveComplianceFlag,
  escalateComplianceFlag,
} from "@/lib/complianceWorkflow";

interface ComplianceFlag {
  id: string;
  user_id: string;
  deal_room_id: string | null;
  flag_type: string;
  severity: "low" | "medium" | "high" | "critical";
  status: string;
  description: string;
  created_at: string;
  resolved_at?: string;
  user?: { full_name: string; email: string };
  deal_room?: { title: string };
}

const AdminComplianceDashboard = () => {
  const [flags, setFlags] = useState<ComplianceFlag[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "critical">("open");
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const flagsData = await getPendingComplianceFlags(
        filter === "all" ? undefined : filter === "critical" ? "open" : filter
      );

      if (filter === "critical") {
        setFlags(
          flagsData.filter((f: ComplianceFlag) => f.severity === "critical")
        );
      } else {
        setFlags(flagsData);
      }

      const statsData = await getComplianceStats();
      setStats(statsData);
    } catch (error) {
      console.error("Error loading compliance dashboard:", error);
      toast.error("Failed to load compliance data");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleResolveFlag = async (flagId: string) => {
    setResolvingId(flagId);
    try {
      const success = await resolveComplianceFlag(
        flagId,
        "Manually resolved by admin",
        "Reviewed and cleared"
      );

      if (success) {
        toast.success("Flag resolved");
        await loadDashboardData();
      } else {
        toast.error("Failed to resolve flag");
      }
    } finally {
      setResolvingId(null);
    }
  };

  const handleEscalateFlag = async (flagId: string) => {
    try {
      const success = await escalateComplianceFlag(
        flagId,
        "Escalated for further investigation"
      );

      if (success) {
        toast.success("Flag escalated");
        await loadDashboardData();
      } else {
        toast.error("Failed to escalate flag");
      }
    } catch (error) {
      console.error("Error escalating flag:", error);
      toast.error("Failed to escalate flag");
    }
  };

  const handleExportReport = async () => {
    try {
      const reportData = {
        exportDate: new Date().toISOString(),
        stats,
        flags,
      };

      const dataStr = JSON.stringify(reportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `compliance-report-${new Date().toISOString().split("T")[0]}.json`;
      link.click();

      toast.success("Report exported");
    } catch (error) {
      console.error("Error exporting report:", error);
      toast.error("Failed to export report");
    }
  };

  const severityColor = {
    critical: "bg-red-100 text-red-800",
    high: "bg-orange-100 text-orange-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-blue-100 text-blue-800",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Flags</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats?.critical || 0}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats?.open || 0}
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats?.resolved || 0}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Severity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Severity Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Critical", value: stats?.critical || 0 },
                    { name: "High", value: stats?.high || 0 },
                    { name: "Medium", value: stats?.medium || 0 },
                    { name: "Low", value: stats?.low || 0 },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  <Cell fill="#ef4444" />
                  <Cell fill="#f97316" />
                  <Cell fill="#eab308" />
                  <Cell fill="#3b82f6" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Open</span>
                  <span className="font-bold">{stats?.open || 0}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full"
                    style={{
                      width: `${((stats?.open || 0) / (stats?.total || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Resolved</span>
                  <span className="font-bold">{stats?.resolved || 0}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${((stats?.resolved || 0) / (stats?.total || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Resolution Rate:{" "}
                  <span className="font-bold text-foreground">
                    {stats?.total > 0
                      ? Math.round(
                          ((stats?.resolved || 0) / stats?.total) * 100
                        )
                      : 0}
                    %
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Flags Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Compliance Flags</CardTitle>
          <div className="flex gap-2">
            <div className="flex gap-1">
              {(["open", "all", "critical"] as const).map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(f)}
                >
                  {f === "open" ? "Open" : f === "critical" ? "Critical" : "All"}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportReport}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {flags.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 opacity-30 mb-2" />
              <p className="text-muted-foreground">No compliance flags</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {flags.map((flag) => (
                <div
                  key={flag.id}
                  className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={severityColor[flag.severity]}>
                          {flag.severity.toUpperCase()}
                        </Badge>
                        <span className="font-medium text-sm">
                          {flag.user?.full_name || flag.user_id}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {flag.description}
                      </p>
                      {flag.deal_room && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Deal Room: <span className="font-medium">{flag.deal_room.title}</span>
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {new Date(flag.created_at).toLocaleDateString()}
                      </p>
                      <Badge variant="outline" className="mt-1">
                        {flag.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2 border-t">
                    {flag.status === "open" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEscalateFlag(flag.id)}
                          className="gap-1 text-xs"
                        >
                          <ArrowUp className="w-3 h-3" />
                          Escalate
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleResolveFlag(flag.id)}
                          disabled={resolvingId === flag.id}
                          className="gap-1 text-xs"
                        >
                          <CheckSquare className="w-3 h-3" />
                          Resolve
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Critical Alerts */}
      {stats?.critical > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>{stats.critical} critical compliance flag(s)</strong> require
            immediate attention. Review and take action to maintain regulatory
            compliance.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default AdminComplianceDashboard;
