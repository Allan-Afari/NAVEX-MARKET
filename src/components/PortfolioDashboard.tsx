import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Briefcase,
  TrendingUp,
  DollarSign,
  PieChart,
  Plus,
  Download,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getUserPortfolios,
  getPortfolioInvestments,
  getPortfolioSummary,
  getPortfolioAlerts,
  type Portfolio,
  type PortfolioInvestment,
} from "@/lib/portfolioManagement";

interface PortfolioDashboardProps {
  userId: string;
}

export default function PortfolioDashboard({ userId }: PortfolioDashboardProps) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [investments, setInvestments] = useState<PortfolioInvestment[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPortfolios();
  }, [loadPortfolios]);

  useEffect(() => {
    if (selectedPortfolio) {
      loadPortfolioData(selectedPortfolio.id);
    }
  }, [selectedPortfolio]);

  const loadPortfolios = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUserPortfolios(userId);
      setPortfolios(data);
      if (data.length > 0) {
        setSelectedPortfolio(data[0]);
      }
    } catch (error) {
      console.error("Error loading portfolios:", error);
      toast.error("Failed to load portfolios");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadPortfolioData = async (portfolioId: string) => {
    try {
      const [investmentsData, summaryData, alertsData] = await Promise.all([
        getPortfolioInvestments(portfolioId),
        getPortfolioSummary(portfolioId),
        getPortfolioAlerts(portfolioId, true),
      ]);

      setInvestments(investmentsData);
      setSummary(summaryData);
      setAlerts(alertsData);
    } catch (error) {
      console.error("Error loading portfolio data:", error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "exited":
        return "bg-blue-500";
      case "pending":
        return "bg-yellow-500";
      case "written_off":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading portfolio...</div>
      </div>
    );
  }

  if (portfolios.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64">
          <Briefcase className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Portfolios Yet</h3>
          <p className="text-muted-foreground text-center mb-4">
            Create your first portfolio to start tracking your investments
          </p>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Portfolio
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Selector */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {portfolios.map((portfolio) => (
            <Button
              key={portfolio.id}
              variant={selectedPortfolio?.id === portfolio.id ? "default" : "outline"}
              onClick={() => setSelectedPortfolio(portfolio)}
            >
              {portfolio.name}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Portfolio
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.total_invested)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Current Value</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.current_value)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
              <PieChart className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.total_returns >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(summary.total_returns)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Investments</CardTitle>
              <Briefcase className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.active_investments}</div>
              <div className="text-xs text-muted-foreground">
                {summary.exited_investments} exited
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Portfolio Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-3 rounded-lg border"
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      alert.severity === "critical"
                        ? "bg-red-500"
                        : alert.severity === "warning"
                        ? "bg-yellow-500"
                        : "bg-blue-500"
                    }`}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{alert.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {alert.message}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="investments">
        <TabsList>
          <TabsTrigger value="investments">Investments</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="captable">Cap Table</TabsTrigger>
        </TabsList>

        <TabsContent value="investments">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Investments</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Investment
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {investments.map((investment) => (
                    <div
                      key={investment.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{investment.company_name}</div>
                        <div className="text-sm text-muted-foreground">
                          Invested: {new Date(investment.investment_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {formatCurrency(investment.investment_amount)}
                        </div>
                        {investment.ownership_percentage && (
                          <div className="text-sm text-muted-foreground">
                            {investment.ownership_percentage}% ownership
                          </div>
                        )}
                      </div>
                      <Badge
                        className={`ml-4 ${getStatusColor(investment.status)} text-white`}
                      >
                        {investment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                <PieChart className="w-16 h-16 mb-4" />
                <div className="text-center">
                  <p>Performance charts coming soon</p>
                  <p className="text-sm">Track IRR, multiples, and returns over time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="captable">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Capitalization Table</CardTitle>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Entry
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                <Briefcase className="w-16 h-16 mb-4" />
                <div className="text-center">
                  <p>Select an investment to view its cap table</p>
                  <p className="text-sm">Track share classes, ownership, and rights</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
