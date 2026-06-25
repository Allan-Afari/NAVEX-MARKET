import { Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getFeatureLockMessage } from "@/lib/featureFlags";

interface FeatureLockProps {
  feature: string;
  onUpgrade?: () => void;
  onVerify?: () => void;
}

export const FeatureLock = ({ feature, onUpgrade, onVerify }: FeatureLockProps) => {
  const message = getFeatureLockMessage(feature as any);
  
  const isPremiumFeature = message.includes("Premium");
  const isVerificationFeature = message.includes("Verify");

  return (
    <Card className="border-dashed">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-muted">
            {isPremiumFeature ? (
              <Crown className="w-6 h-6 text-yellow-600" />
            ) : (
              <Lock className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <h4 className="font-semibold mb-1">Feature Locked</h4>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
          {isPremiumFeature && onUpgrade && (
            <Button size="sm" onClick={onUpgrade}>
              Upgrade
            </Button>
          )}
          {isVerificationFeature && onVerify && (
            <Button size="sm" onClick={onVerify}>
              Verify Now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FeatureLock;
