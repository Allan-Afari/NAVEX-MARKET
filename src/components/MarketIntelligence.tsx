import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, BarChart3, PieChart, LineChart } from "lucide-react";
import { toast } from "sonner";

interface MarketInsight {
  id: string;
  sector: string;
  region: string;
  metric_type: string;
  value: number;
  period_start: string;
  period_end: string;
}

interface DealStats {
  total_deals: number;
  active_deals: number;
  total_funding: number;
  average_funding: number;
  sectors: Record<string, number>;
}

interface IndustryReport {
  id: string;
  title: string;
  sector: string;
  summary: string;
  report_type: string;
  published_at: string;
  view_count: number;
}

const MarketIntelligence = () => {
  const [insights, setInsights] = useState<MarketInsight[]>([]);
  const [dealStats, setDealStats] = useState<DealStats | null>(null);
  const [reports, setReports] = useState<IndustryReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSector, setSelectedSector] = useState("all");

  useEffect(() => {
    fetchMarketData();
  }, [selectedSector]);

  const fetchMarketData = async () => {
    try {
      setLoading(true);

      // Fetch market insights
      const { data: insightsData, error: insightsError } = await supabase
        .from("market_insights")
        .select("*")
        .order("period_end", { ascending: false })
        .limit(20);

      if (insightsError) throw insightsError;

      // Fetch deal statistics
      const { data: dealsData, count } = await supabase
        .from("deals")
        .select("id, sector, funding_amount", { count: "exact" })
        .eq("stage", "published");

      if (dealsData) {
        const stats: DealStats = {
          total_deals: count || 0,
          active_deals: dealsData.length,
          total_funding: dealsData.reduce((sum, d) => sum + (d.funding_amount || 0), 0),
          average_funding:
            dealsData.length > 0
              ? Math.round(
                  dealsData.reduce((sum, d) => sum + (d.funding_amount || 0), 0) /
                    dealsData.length
                )
              : 0,
          sectors: dealsData.reduce(
            (acc, d) => {
              acc[d.sector || "Other"] = (acc[d.sector || "Other"] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          ),
        };
        setDealStats(stats);
      }

      // Fetch industry reports
      const { data: reportsData, error: reportsError } = await supabase
        .from("industry_reports")
        .select("*")
        .order("published_at", { ascending: false })
        .limit(10);

      if (reportsError) throw reportsError;

      setInsights(insightsData || []);
      setReports(reportsData || []);
    } catch (error) {
      console.error("Error fetching market data:", error);
      toast.error("Failed to load market intelligence");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `GH₵${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `GH₵${(amount / 1000).toFixed(0)}K`;
    return `GH₵${amount.toLocaleString()}`;
  };

  const topSectors = dealStats
    ? Object.entries(dealStats.sectors)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
    : [];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Market Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Market Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold mb-1">
              {dealStats?.total_deals || 0}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              Active Deals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold mb-1">
              {formatCurrency(dealStats?.total_funding || 0)}
            </div>
            <p className="text-sm text-muted-foreground">Total Volume</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold mb-1">
              {formatCurrency(dealStats?.average_funding || 0)}
            </div>
            <p className="text-sm text-muted-foreground">Avg Ticket Size</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold mb-1">
              {Object.keys(dealStats?.sectors || {}).length}
            </div>
            <p className="text-sm text-muted-foreground">Sectors Active</p>
          </CardContent>
        </Card>
      </div>

      {/* Sector Distribution */}
      {topSectors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Top Sectors by Deal Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topSectors.map(([sector, count]) => (
                <div key={sector} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{sector}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                        style={{
                          width: `${((count || 0) / (dealStats?.total_deals || 1)) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <Badge variant="outline">{count} deals</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Industry Reports */}
      {reports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="w-5 h-5" />
              Industry Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reports.slice(0, 5).map((report) => (
                <div
                  key={report.id}
                  className="p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{report.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {report.summary}
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-2 flex-shrink-0">
                      {report.report_type}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{report.sector}</span>
                    <span>👁 {report.view_count} views</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Market Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Market Metrics
              </CardTitle>
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="text-sm px-3 py-1 border rounded-lg"
              >
                <option value="all">All Sectors</option>
                {Array.from(
                  new Set(insights.map((i) => i.sector))
                ).map((sector) => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights
                .filter(
                  (i) => selectedSector === "all" || i.sector === selectedSector
                )
                .slice(0, 8)
                .map((insight) => (
                  <div
                    key={insight.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {insight.sector} - {insight.metric_type.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(insight.period_start).toLocaleDateString()} to{" "}
                        {new Date(insight.period_end).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">
                      {formatCurrency(insight.value)}
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MarketIntelligence;
