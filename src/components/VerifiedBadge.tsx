import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerifiedBadgeProps {
  className?: string;
  showLabel?: boolean;
}

const VerifiedBadge = ({ className, showLabel = true }: VerifiedBadgeProps) => (
  <span
    title="Verified business"
    className={cn(
      "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent/15 text-accent",
      className,
    )}
  >
    <ShieldCheck className="w-3 h-3" />
    {showLabel && "Verified"}
  </span>
);

export default VerifiedBadge;
