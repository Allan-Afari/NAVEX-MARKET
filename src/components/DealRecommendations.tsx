import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building2, Target } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface DealRecommendation {
  id: string;
  deal_id: string;
  match_score: number;
  match_reasons: Array<{
    reason: string;
    weight: number;
  }>;
  deal: {
    id: string;
    title: string;
    description: string | null;
    sector: string | null;
    location: string | null;
    funding_amount: number | null;
    funding_type: string;
    industry: string | null;
  };
}

interface DealRecommendationsProps {
  user: User;
  limit?: number;
}

const DealRecommendations = ({ user, limit = 5 }: DealRecommendationsProps) => {
  const [recommendations, setRecommendations] = useState<DealRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isMounted = useRef(true);
  const fetchRecommendationsRef = useRef<(() => Promise<void>) | null>(null);
  const navigate = useNavigate();

  async function fetchRecommendations() {
    try {
      const { data: existingRecs, error: recError } = await supabase
        .from("deal_recommendations")
        .select(`
          id,
          deal_id,
          match_score,
          match_reasons,
          deal:deals(
            id,
            title,
            description,
            sector,
            location,
            funding_amount,
            funding_type,
            industry
          )
        `)
        .eq("investor_id", user.id)
        .order("match_score", { ascending: false })
        .limit(limit);

      if (recError) throw recError;

      if (!isMounted.current) return;

      if (existingRecs && existingRecs.length > 0) {
        setRecommendations(existingRecs as DealRecommendation[]);
      } else {
        await generateRecommendations();
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      if (isMounted.current) {
        toast.error("Failed to load recommendations");
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }

  async function generateRecommendations() {
    setRefreshing(true);
    try {
      const { error } = await supabase.rpc("refresh_deal_recommendations", {
        investor_uuid: user.id,
      });

      if (error) throw error;

      await fetchRecommendationsRef.current?.();
      toast.success("Recommendations updated!");
    } catch (error) {
      console.error("Error generating recommendations:", error);
      if (isMounted.current) {
        toast.error("Failed to generate recommendations");
      }
    } finally {
      if (isMounted.current) {
        setRefreshing(false);
      }
    }
  }

  fetchRecommendationsRef.current = fetchRecommendations;

  useEffect(() => {
    isMounted.current = true;
    fetchRecommendationsRef.current?.();

    return () => {
      isMounted.current = false;
    };
  }, [user.id, limit]);

  const getMatchColor = (score: number) => {
    if (score >= 0.8) return "text-green-600 bg-green-100";
    if (score >= 0.6) return "text-blue-600 bg-blue-100";
    if (score >= 0.4) return "text-yellow-600 bg-yellow-100";
    return "text-gray-600 bg-gray-100";
  };

  const formatFundingAmount = (amount: number | null) => {
    if (!amount) return "Undisclosed";
    if (amount >= 1000000) return `GH₵${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `GH₵${(amount / 1000).toFixed(0)}K`;
    return `GH₵${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            AI Deal Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            AI Deal Recommendations
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={generateRecommendations}
            disabled={refreshing}
          >
            {refreshing ? "Updating..." : "Refresh"}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Personalized deals matched to your investment preferences
        </p>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <div className="text-center py-8">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              No recommendations available yet. Complete your investor profile to get better matches!
            </p>
            <Button onClick={() => navigate("/profile")}>
              Update Profile
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <button
                type="button"
                key={rec.id}
                aria-label={`View details for ${rec.deal.title}`}
                className="w-full text-left border rounded-lg p-4 hover:shadow-md transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                onClick={() => navigate(`/deals/${rec.deal.id}`)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{rec.deal.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                      {rec.deal.sector && (
                        <div className="flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          {rec.deal.sector}
                        </div>
                      )}
                      {rec.deal.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {rec.deal.location}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge className={getMatchColor(rec.match_score)}>
                    {Math.round(rec.match_score * 100)}% Match
                  </Badge>
                </div>

                {rec.deal.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {rec.deal.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {formatFundingAmount(rec.deal.funding_amount)}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {rec.deal.funding_type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {rec.match_reasons.length} matching factors
                  </div>
                </div>

                {rec.match_reasons.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {rec.match_reasons.slice(0, 3).map((reason, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {reason.reason}
                      </Badge>
                    ))}
                  </div>
                )}
              </button>
            ))}

            {recommendations.length >= limit && (
              <div className="text-center pt-4">
                <Button variant="outline" onClick={() => navigate("/marketplace")}>
                  View All Opportunities
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DealRecommendations;