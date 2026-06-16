import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getDealScore, getScoreBadge } from "@/lib/dealQualityScoring";
import { TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import type { DealScore } from "@/lib/dealQualityScoring";

interface DealQualityScoreDisplayProps {
  dealId: string;
  compact?: boolean;
}

const DealQualityScoreDisplay = ({
  dealId,
  compact = false,
}: DealQualityScoreDisplayProps) => {
  const [score, setScore] = useState<DealScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadScore = async () => {
      try {
        setLoading(true);
        const data = await getDealScore(dealId);
        setScore(data);
      } catch (error) {
        console.error("Error loading deal score:", error);
      } finally {
        setLoading(false);
      }
    };

    loadScore();
  }, [dealId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="h-6 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!score) {
    return null;
  }

  const badge = getScoreBadge(score.totalScore);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <div className="text-2xl font-bold">{score.totalScore}</div>
          <p className="text-xs text-muted-foreground">Quality Score</p>
        </div>
        <Badge className={badge.bgColor + " " + badge.color}>
          {badge.text}
        </Badge>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Deal Quality Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg font-semibold">{score.totalScore}/100</span>
            <Badge className={badge.bgColor + " " + badge.color}>
              {badge.text}
            </Badge>
          </div>
          <Progress value={score.totalScore} className="h-3" />
        </div>

        <div className="space-y-3">
          {score.factors.map((factor) => (
            <div key={factor.name}>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="text-sm font-medium">{factor.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {factor.description}
                  </p>
                </div>
                <span className="text-sm font-semibold">{factor.score}%</span>
              </div>
              <Progress value={factor.score} className="h-2" />
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Tips to improve:</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              {score.completenessScore < 80 && (
                <li>Complete all deal information</li>
              )}
              {score.documentationScore < 80 && (
                <li>Upload more supporting documents</li>
              )}
              {score.participationScore < 80 && (
                <li>Invite more participants to your deal room</li>
              )}
            </ul>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Last updated: {new Date(score.lastUpdated).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
};

export default DealQualityScoreDisplay;
