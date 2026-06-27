import { ShieldCheck, ShieldAlert, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VerifiedBadgeProps {
  className?: string;
  showLabel?: boolean;
  level?: "basic" | "verified" | "premium";
  verifiedDate?: string;
  compact?: boolean;
}

const VERIFICATION_CONFIG = {
  basic: {
    icon: ShieldAlert,
    label: "Basic",
    color: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
    description: "Identity verified with Smile ID",
  },
  verified: {
    icon: ShieldCheck,
    label: "Verified",
    color: "bg-green-500/15 text-green-500 border-green-500/30",
    description: "Identity and business verified",
  },
  premium: {
    icon: Award,
    label: "Premium",
    color: "bg-purple-500/15 text-purple-500 border-purple-500/30",
    description: "Fully verified with additional compliance checks",
  },
};

const VerifiedBadge = ({ 
  className, 
  showLabel = true, 
  level = "verified",
  verifiedDate,
  compact = false 
}: VerifiedBadgeProps) => {
  const config = VERIFICATION_CONFIG[level];
  const Icon = config.icon;

  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all hover:scale-105",
        config.color,
        compact ? "px-1.5 py-0.5" : "px-2 py-0.5",
        className,
      )}
    >
      <Icon className={cn("w-3 h-3", !compact && "w-3.5 h-3.5")} />
      {showLabel && config.label}
    </span>
  );

  if (compact) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{config.label} Account</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
            {verifiedDate && (
              <p className="text-xs text-muted-foreground">
                Verified: {new Date(verifiedDate).toLocaleDateString()}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default VerifiedBadge;
