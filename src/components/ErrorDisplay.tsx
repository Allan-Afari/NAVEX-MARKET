import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorDisplayProps {
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  showRetry?: boolean;
}

export const ErrorDisplay = ({
  message = "Something went wrong. Please try again.",
  onRetry,
  isRetrying = false,
  showRetry = true,
}: ErrorDisplayProps) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-6 rounded-lg bg-destructive/10 border border-destructive/30">
      <div className="flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
        <p className="text-sm text-foreground">{message}</p>
      </div>
      {showRetry && onRetry && (
        <Button
          size="sm"
          variant="outline"
          onClick={onRetry}
          disabled={isRetrying}
          className="gap-2"
        >
          <RotateCcw className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`} />
          {isRetrying ? "Retrying..." : "Try Again"}
        </Button>
      )}
    </div>
  );
};

export default ErrorDisplay;
