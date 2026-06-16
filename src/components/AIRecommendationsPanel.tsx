import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, TrendingUp, RefreshCw, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import {
  getAIRecommendations,
  getTrendingDeals,
  getSimilarDeals,
  type RecommendationScore,
} from "@/lib/aiRecommendations";

interface AIRecommendationsPanelProps {
  userId: string;
  currentDealId?: string;
  onSelectDeal?: (dealId: string) => void;
}

export default function AIRecommendationsPanel({
  userId,
  currentDealId,
  onSelectDeal,
}: AIRecommendationsPanelProps) {
  const [recommendations, setRecommendations] = useState<RecommendationScore[]>([]);
  const [trendingDeals, setTrendingDeals] = useState<any[]>([]);
  const [similarDeals, setSimilarDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"recommended" | "trending" | "similar">("recommended");

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const loadRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      const [recs, trending, similar] = await Promise.all([
        getAIRecommendations(userId, 10),
        getTrendingDeals(5),
        currentDealId ? getSimilarDeals(currentDealId, 5) : Promise.resolve([]),
      ]);

      setRecommendations(recs);
      setTrendingDeals(trending);
      setSimilarDeals(similar);
    } catch (error) {
      console.error("Error loading recommendations:", error);
      toast.error("Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  }, [userId, currentDealId]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return "Excellent Match";
    if (score >= 60) return "Good Match";
    if (score >= 40) return "Fair Match";
    return "Low Match";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            AI Recommendations
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadRecommendations}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Button
            variant={activeTab === "recommended" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("recommended")}
          >
            <Lightbulb className="w-4 h-4 mr-2" />
            For You
          </Button>
          <Button
            variant={activeTab === "trending" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("trending")}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Trending
          </Button>
          {currentDealId && (
            <Button
              variant={activeTab === "similar" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("similar")}
            >
              Similar
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Loading recommendations...
            </div>
          ) : activeTab === "recommended" ? (
            recommendations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Lightbulb className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No recommendations yet</p>
                <p className="text-sm">View more deals to get personalized recommendations</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recommendations.map((rec) => (
                  <RecommendationCard
                    key={rec.dealId}
                    recommendation={rec}
                    onSelect={() => onSelectDeal?.(rec.dealId)}
                  />
                ))}
              </div>
            )
          ) : activeTab === "trending" ? (
            trendingDeals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No trending deals
              </div>
            ) : (
              <div className="space-y-3">
                {trendingDeals.map((deal) => (
                  <TrendingDealCard
                    key={deal.id}
                    deal={deal}
                    onSelect={() => onSelectDeal?.(deal.id)}
                  />
                ))}
              </div>
            )
          ) : (
            similarDeals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No similar deals found
              </div>
            ) : (
              <div className="space-y-3">
                {similarDeals.map((deal) => (
                  <SimilarDealCard
                    key={deal.id}
                    deal={deal}
                    onSelect={() => onSelectDeal?.(deal.id)}
                  />
                ))}
              </div>
            )
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function RecommendationCard({
  recommendation,
  onSelect,
}: {
  recommendation: RecommendationScore;
  onSelect?: () => void;
}) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return "Excellent Match";
    if (score >= 60) return "Good Match";
    if (score >= 40) return "Fair Match";
    return "Low Match";
  };

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onSelect}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h4 className="font-medium mb-1">Deal #{recommendation.dealId.slice(0, 8)}</h4>
            <div className="flex flex-wrap gap-1">
              {recommendation.reasons.slice(0, 2).map((reason, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {reason}
                </Badge>
              ))}
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${getScoreColor(recommendation.score)}`}>
              {recommendation.score}%
            </div>
            <Badge variant="outline" className="text-xs">
              {getScoreBadge(recommendation.score)}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TrendingDealCard({
  deal,
  onSelect,
}: {
  deal: any;
  onSelect?: () => void;
}) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onSelect}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h4 className="font-medium mb-1">{deal.title || deal.description?.slice(0, 50)}</h4>
            <div className="flex gap-2 text-sm text-muted-foreground">
              <span>{deal.industry}</span>
              <span>•</span>
              <span>{deal.stage}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              {deal.view_count || 0} views
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SimilarDealCard({
  deal,
  onSelect,
}: {
  deal: any;
  onSelect?: () => void;
}) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onSelect}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h4 className="font-medium mb-1">{deal.title || deal.description?.slice(0, 50)}</h4>
            <div className="flex gap-2 text-sm text-muted-foreground">
              <span>{deal.industry}</span>
              <span>•</span>
              <span>{deal.stage}</span>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            Similar
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
