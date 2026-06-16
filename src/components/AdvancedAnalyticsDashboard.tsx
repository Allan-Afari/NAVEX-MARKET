/**
 * Advanced Analytics Dashboard Component
 * Displays comprehensive deal metrics, trends, and market insights
 */

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, HeatMap } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Users, Target, Activity, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getDealMetrics,
  getTrendData,
  getDealStageDistribution,
  getConcentrationHeatmap,
  getMarketSentiment,
  getUserAnalytics,
  DealMetrics,
  TrendData,
} from "@/lib/advancedAnalytics";

interface AnalyticsDashboardProps {
  userId?: string;
  viewMode?: "overview" | "detailed";
}

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

export function AdvancedAnalyticsDashboard({
  userId,
  viewMode = "overview",
}: AnalyticsDashboardProps) {
  const [selectedMetric, setSelectedMetric] = useState<"deals" | "funding" | "activity">("deals");
  const [timeframe, setTimeframe] = useState(30);

  // Fetch deal metrics
  const { data: dealMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["deal-metrics"],
    queryFn: getDealMetrics,
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch trend data
  const { data: trendData, isLoading: trendsLoading } = useQuery({
    queryKey: ["trend-data", selectedMetric, timeframe],
    queryFn: () => getTrendData(selectedMetric, timeframe),
    refetchInterval: 60000,
  });

  // Fetch stage distribution
  const { data: stageDistribution, isLoading: stageLoading } = useQuery({
    queryKey: ["stage-distribution"],
    queryFn: getDealStageDistribution,
    refetchInterval: 60000,
  });

  // Fetch concentration heatmap
  const { data: heatmapData, isLoading: heatmapLoading } = useQuery({
    queryKey: ["concentration-heatmap"],
    queryFn: getConcentrationHeatmap,
    refetchInterval: 120000, // Refresh every 2 minutes
  });

  // Fetch market sentiment
  const { data: sentiment, isLoading: sentimentLoading } = useQuery({
    queryKey: ["market-sentiment"],
    queryFn: getMarketSentiment,
    refetchInterval: 60000,
  });

  // Fetch user analytics if userId provided
  const { data: userAnalytics } = useQuery({
    queryKey: ["user-analytics", userId],
    queryFn: () => (userId ? getUserAnalytics(userId) : null),
    enabled: !!userId,
  });

  // Transform stage distribution for pie chart
  const stageChartData = stageDistribution
    ? Object.entries(stageDistribution).map(([stage, count]) => ({
        name: stage,
        value: count as number,
      }))
    : [];

  // Transform heatmap data for display
  const heatmapRows = heatmapData
    ? Array.from(
        new Set(heatmapData.map((d) => d.industry))
      ).map((industry) => ({
        industry,
        locations: heatmapData
          .filter((d) => d.industry === industry)
          .reduce(
            (acc, d) => {
              acc[d.location] = d.count;
              return acc;
            },
            {} as Record<string, number>
          ),
      }))
    : [];

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  // Export data as CSV
  const handleExportData = () => {
    if (!dealMetrics) return;

    const csv = [
      ["Metric", "Value"],
      ["Total Deals", dealMetrics.totalDeals],
      ["Active Deals", dealMetrics.activeDeals],
      ["Completed Deals", dealMetrics.completedDeals],
      ["Success Rate", `${dealMetrics.successRate.toFixed(2)}%`],
      ["Total Funded", formatCurrency(dealMetrics.totalFunded)],
      ["Average Funding", formatCurrency(dealMetrics.averageFundingAmount)],
      ["Average Time to Close", `${dealMetrics.averageTimeToClose.toFixed(1)} days`],
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Analytics Dashboard</h2>
          <p className="text-gray-600 mt-1">Market insights and deal performance metrics</p>
        </div>
        <Button onClick={handleExportData} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricsLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-100 h-24 rounded-lg animate-pulse" />
            ))}
          </>
        ) : dealMetrics ? (
          <>
            {/* Total Deals */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Deals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dealMetrics.totalDeals}</div>
                <div className="flex items-center text-xs text-gray-500 mt-1">
                  <Activity className="w-3 h-3 mr-1" />
                  {dealMetrics.activeDeals} active
                </div>
              </CardContent>
            </Card>

            {/* Success Rate */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Success Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPercent(dealMetrics.successRate)}
                </div>
                <div className="flex items-center text-xs text-green-600 mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {dealMetrics.completedDeals} completed
                </div>
              </CardContent>
            </Card>

            {/* Total Funded */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Funded
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(dealMetrics.totalFunded)}
                </div>
                <div className="flex items-center text-xs text-gray-500 mt-1">
                  <DollarSign className="w-3 h-3 mr-1" />
                  Across all deals
                </div>
              </CardContent>
            </Card>

            {/* Market Sentiment */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Market Sentiment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">
                  {sentimentLoading ? "..." : sentiment}
                </div>
                <Badge
                  className={`mt-2 ${
                    sentiment === "bullish"
                      ? "bg-green-100 text-green-800"
                      : sentiment === "bearish"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {sentiment === "bullish" && <TrendingUp className="w-3 h-3 mr-1" />}
                  {sentiment === "bearish" && <TrendingDown className="w-3 h-3 mr-1" />}
                  {sentiment}
                </Badge>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Tabs for Different Views */}
      <Tabs defaultValue="trends" className="w-full">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="heatmap">Industry Map</TabsTrigger>
          {userId && <TabsTrigger value="portfolio">My Portfolio</TabsTrigger>}
        </TabsList>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deal Trends (Last {timeframe} Days)</CardTitle>
              <div className="flex gap-2 mt-4">
                {(["deals", "funding", "activity"] as const).map((metric) => (
                  <Badge
                    key={metric}
                    variant={selectedMetric === metric ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedMetric(metric)}
                  >
                    {metric.charAt(0).toUpperCase() + metric.slice(1)}
                  </Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <div className="h-80 bg-gray-100 rounded animate-pulse" />
              ) : trendData && trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(date) => new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    />
                    <YAxis />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#fff", border: "1px solid #ccc" }}
                      formatter={(value: number) =>
                        selectedMetric === "funding"
                          ? formatCurrency(value)
                          : value.toLocaleString()
                      }
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name={selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center text-gray-500">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deal Stage Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {stageLoading ? (
                <div className="h-80 bg-gray-100 rounded animate-pulse" />
              ) : stageChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stageChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stageChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center text-gray-500">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Heatmap Tab */}
        <TabsContent value="heatmap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Industry × Location Concentration</CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Top deal concentration areas by industry and geography
              </p>
            </CardHeader>
            <CardContent>
              {heatmapLoading ? (
                <div className="h-80 bg-gray-100 rounded animate-pulse" />
              ) : heatmapData && heatmapData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Industry</th>
                        {Array.from(
                          new Set(heatmapData.map((d) => d.location))
                        )
                          .slice(0, 8)
                          .map((location) => (
                            <th key={location} className="text-center p-2 font-medium text-sm">
                              {location}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {heatmapData
                        .reduce(
                          (acc, item) => {
                            const industry = acc.find(
                              (i) => i.industry === item.industry
                            );
                            if (industry) {
                              industry[item.location] = item.count;
                            } else {
                              acc.push({
                                industry: item.industry,
                                [item.location]: item.count,
                              });
                            }
                            return acc;
                          },
                          [] as any[]
                        )
                        .slice(0, 10)
                        .map((row) => (
                          <tr key={row.industry} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-medium text-sm">{row.industry}</td>
                            {Array.from(
                              new Set(heatmapData.map((d) => d.location))
                            )
                              .slice(0, 8)
                              .map((location) => {
                                const count = row[location] || 0;
                                const maxCount = Math.max(
                                  ...heatmapData.map((d) => d.count)
                                );
                                const intensity = count / maxCount;
                                return (
                                  <td
                                    key={`${row.industry}-${location}`}
                                    className="text-center p-2"
                                  >
                                    <div
                                      className="rounded px-2 py-1 text-white text-xs font-medium inline-block"
                                      style={{
                                        backgroundColor: `rgba(59, 130, 246, ${intensity})`,
                                      }}
                                    >
                                      {count}
                                    </div>
                                  </td>
                                );
                              })}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-gray-500">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Portfolio Tab */}
        {userId && (
          <TabsContent value="portfolio" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                {userAnalytics ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600">Deals Created</p>
                      <p className="text-2xl font-bold">{userAnalytics.totalDealsCreated}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600">Deals Joined</p>
                      <p className="text-2xl font-bold">{userAnalytics.totalDealsJoined}</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <p className="text-sm text-gray-600">Total Invested</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(userAnalytics.totalInvested)}
                      </p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <p className="text-sm text-gray-600">Success Rate</p>
                      <p className="text-2xl font-bold">
                        {formatPercent(userAnalytics.successRate)}
                      </p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg">
                      <p className="text-sm text-gray-600">Trust Score</p>
                      <p className="text-2xl font-bold">
                        {userAnalytics.trustScore.toFixed(1)}/100
                      </p>
                    </div>
                    <div className="p-3 bg-indigo-50 rounded-lg">
                      <p className="text-sm text-gray-600">Reputation</p>
                      <p className="text-2xl font-bold">
                        {userAnalytics.reputationRating.toFixed(1)}★
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">No data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
