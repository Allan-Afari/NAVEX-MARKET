import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Gift, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface ReferralBannerProps {
  user: User;
}

const ReferralBanner = ({ user }: ReferralBannerProps) => {
  const [copied, setCopied] = useState(false);
  const referralCode = user?.id?.slice(0, 8).toUpperCase() || "REFERRAL";
  const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Referral link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Gift className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Invite & Earn</h4>
              <p className="text-xs text-muted-foreground">
                Get GH₵50 credit for each referral who joins
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Share Link
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralBanner;
