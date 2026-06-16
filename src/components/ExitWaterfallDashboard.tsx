/**
 * Exit & Waterfall Analysis Dashboard Component
 * Displays exit events and waterfall distribution analysis
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Download,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getPortfolioExits,
  getExitMetrics,
  getDistributionSummary,
  recordExitEvent,
  ExitEvent,
} from "@/lib/exitTracking";

interface ExitWaterfallDashboardProps {
  portfolioId: string;
  investmentId?: string;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export function ExitWaterfallDashboard({
  portfolioId,
  investmentId,
}: ExitWaterfallDashboardProps) {
  const [selectedExit, setSelectedExit] = useState<string | null>(null);
  const [isRecordingExit, setIsRecordingExit] = useState(false);
  const [newExitData, setNewExitData] = useState({
    exitType: "acquisition" as const,
    exitValuation: "",
    exitDate: new Date().toISOString().split("T")[0],
    buyers: "",
    notes: "",
  });

  // Fetch portfolio exits
  const { data: exits, refetch: refetchExits } = useQuery({
    queryKey: ["portfolio-exits", portfolioId],
    queryFn: () => getPortfolioExits(portfolioId),
  });

  // Fetch exit metrics for selected exit
  const { data: exitMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["exit-metrics", selectedExit],
    queryFn: () => (selectedExit ? getExitMetrics(selectedExit) : null),
    enabled: !!selectedExit,
  });

  // Fetch distribution summary for selected exit
  const { data: distributionSummary } = useQuery({
    queryKey: ["distribution-summary", selectedExit],
    queryFn: () => (selectedExit ? getDistributionSummary(selectedExit) : null),
    enabled: !!selectedExit,
  });

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  // Get status color
  const getStatusColor = (exitType: string) => {
    switch (exitType) {
      case "acquisition":
        return "bg-blue-100 text-blue-800";
      case "ipo":
        return "bg-green-100 text-green-800";
      case "liquidation":
        return "bg-red-100 text-red-800";
      case "secondary":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get status icon
  const getStatusIcon = (exitType: string) => {
    switch (exitType) {
      case "acquisition":
        return <Target className="w-4 h-4" />;
      case "ipo":
        return <TrendingUp className="w-4 h-4" />;
      case "liquidation":
        return <XCircle className="w-4 h-4" />;
      case "secondary":
        return <DollarSign className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // Handle record exit
  const handleRecordExit = async () => {
    if (!newExitData.exitValuation || !investmentId) return;

    try {
      await recordExitEvent(
        investmentId,
        portfolioId,
        newExitData.exitType,
        parseFloat(newExitData.exitValuation),
        newExitData.exitDate,
        newExitData.buyers
          .split(",")
          .map((b) => b.trim())
          .filter((b) => b),
        newExitData.notes
      );
      await refetchExits();
      setIsRecordingExit(false);
      setNewExitData({
        exitType: "acquisition",
        exitValuation: "",
        exitDate: new Date().toISOString().split("T")[0],
        buyers: "",
        notes: "",
      });
    } catch (error) {
      console.error("Error recording exit:", error);
    }
  };

  // Export report
  const handleExportReport = () => {
    if (!exits) return;

    const csv = [
      ["Exit Event Report", portfolioId],
      ["Generated", new Date().toLocaleDateString()],
      [],
      ["Exit Type", "Date", "Valuation", "Buyers", "Status"],
      ...exits.map((exit) => [
        exit.exit_type,
        exit.exit_date,
        formatCurrency(exit.exit_valuation),
        exit.buyers?.join(", ") || "N/A",
        "Completed",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exit-report-${portfolioId}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  // Calculate portfolio metrics from exits
  const portfolioMetrics = {
    totalExits: exits?.length || 0,
    totalExitValue:
      exits?.reduce((sum, exit) => sum + (exit.exit_valuation || 0), 0) || 0,
    averageValuation:
      exits && exits.length > 0
        ? exits.reduce((sum, exit) => sum + (exit.exit_valuation || 0), 0) /
          exits.length
        : 0,
    exitTypeDistribution: exits
      ? Object.entries(
          exits.reduce(
            (acc, exit) => {
              acc[exit.exit_type] = (acc[exit.exit_type] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          )
        ).map(([type, count]) => ({
          name: type.charAt(0).toUpperCase() + type.slice(1),
          value: count,
        }))
      : [],
  };

  // Calculate waterfall data for visualization
  const waterfallData = distributionSummary
    ? Object.entries(distributionSummary.byShareClass || {}).map(
        ([shareClass, data]) => ({
          name: shareClass,
          amount: (data as any).amount || 0,
          holders: (data as any).holders || 0,
        })
      )
    : [];

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Exit & Waterfall Analysis</h2>
          <p className="text-gray-600 mt-1">Track exits and analyze distributions</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportReport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          {investmentId && (
            <Dialog open={isRecordingExit} onOpenChange={setIsRecordingExit}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Record Exit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Exit Event</DialogTitle>
                  <DialogDescription>
                    Log a new exit event for your investment
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="exitType">Exit Type</Label>
                    <Select
                      value={newExitData.exitType}
                      onValueChange={(value: any) =>
                        setNewExitData({ ...newExitData, exitType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="acquisition">Acquisition</SelectItem>
                        <SelectItem value="ipo">IPO</SelectItem>
                        <SelectItem value="liquidation">Liquidation</SelectItem>
                        <SelectItem value="secondary">Secondary Sale</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="exitValuation">Exit Valuation</Label>
                    <Input
                      id="exitValuation"
                      type="number"
                      placeholder="0.00"
                      value={newExitData.exitValuation}
                      onChange={(e) =>
                        setNewExitData({
                          ...newExitData,
                          exitValuation: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="exitDate">Exit Date</Label>
                    <Input
                      id="exitDate"
                      type="date"
                      value={newExitData.exitDate}
                      onChange={(e) =>
                        setNewExitData({
                          ...newExitData,
                          exitDate: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="buyers">Buyers (comma-separated)</Label>
                    <Input
                      id="buyers"
                      placeholder="Company A, Company B"
                      value={newExitData.buyers}
                      onChange={(e) =>
                        setNewExitData({ ...newExitData, buyers: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Input
                      id="notes"
                      placeholder="Additional details..."
                      value={newExitData.notes}
                      onChange={(e) =>
                        setNewExitData({ ...newExitData, notes: e.target.value })
                      }
                    />
                  </div>

                  <Button onClick={handleRecordExit} className="w-full">
                    Record Exit
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Exits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolioMetrics.totalExits}</div>
            <div className="flex items-center text-xs text-gray-500 mt-1">
              <CheckCircle className="w-3 h-3 mr-1" />
              Completed events
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Exit Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(portfolioMetrics.totalExitValue)}
            </div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <TrendingUp className="w-3 h-3 mr-1" />
              From exits
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Average Valuation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(portfolioMetrics.averageValuation)}
            </div>
            <div className="flex items-center text-xs text-gray-500 mt-1">
              <Target className="w-3 h-3 mr-1" />
              Per exit
            </div>
          </CardContent>
        </Card>

        {exitMetrics && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Exit Multiple (MOIC)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{exitMetrics.exitMultiple.toFixed(2)}x</div>
              <div className="flex items-center text-xs text-green-600 mt-1">
                <TrendingUp className="w-3 h-3 mr-1" />
                {exitMetrics.roi.toFixed(1)}% ROI
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="exits" className="w-full">
        <TabsList>
          <TabsTrigger value="exits">Exit Events</TabsTrigger>
          <TabsTrigger value="distribution">Waterfall Distribution</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        {/* Exit Events Tab */}
        <TabsContent value="exits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Exit Events</CardTitle>
            </CardHeader>
            <CardContent>
              {exits && exits.length > 0 ? (
                <div className="space-y-3">
                  {exits.map((exit) => (
                    <div
                      key={exit.id}
                      className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                        selectedExit === exit.id ? "bg-blue-50 border-blue-300" : ""
                      }`}
                      onClick={() => setSelectedExit(exit.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(exit.exit_type)}>
                              {getStatusIcon(exit.exit_type)}
                              <span className="ml-1">
                                {exit.exit_type.charAt(0).toUpperCase() +
                                  exit.exit_type.slice(1)}
                              </span>
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {new Date(exit.exit_date).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="mt-2 text-2xl font-bold">
                            {formatCurrency(exit.exit_valuation)}
                          </div>
                          {exit.buyers && (
                            <p className="text-sm text-gray-600 mt-1">
                              Buyers: {exit.buyers.join(", ")}
                            </p>
                          )}
                          {exit.notes && (
                            <p className="text-sm text-gray-500 mt-1">{exit.notes}</p>
                          )}
                        </div>
                        <Eye className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No exit events recorded yet</p>
                  {investmentId && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => setIsRecordingExit(true)}
                    >
                      Record First Exit
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Waterfall Distribution Tab */}
        <TabsContent value="distribution" className="space-y-4">
          {selectedExit && exitMetrics ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Distribution Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribution by Share Class</CardTitle>
                </CardHeader>
                <CardContent>
                  {waterfallData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={waterfallData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="amount" fill="#3b82f6" name="Distribution" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-80 flex items-center justify-center text-gray-500">
                      No distribution data
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Distribution Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Exit Multiple</p>
                    <p className="text-2xl font-bold">
                      {exitMetrics.exitMultiple.toFixed(2)}x
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">ROI</p>
                    <p className="text-2xl font-bold">
                      {exitMetrics.roi.toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600">Time to Exit</p>
                    <p className="text-2xl font-bold">
                      {exitMetrics.timeToExit.toFixed(1)} months
                    </p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total Proceeds</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(exitMetrics.exitProceeds)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                Select an exit event to view waterfall distribution details
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Exit Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {portfolioMetrics.exitTypeDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={portfolioMetrics.exitTypeDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {portfolioMetrics.exitTypeDistribution.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center text-gray-500">
                  No exit data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
