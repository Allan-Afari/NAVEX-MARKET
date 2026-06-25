import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export const LoadingSpinner = ({ size = "md", text, className = "" }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Loader2 className={`animate-spin ${sizeClasses[size]}`} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
};

export const PageLoader = ({ text = "Loading..." }: { text?: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <LoadingSpinner size="lg" text={text} />
  </div>
);

export const CardLoader = () => (
  <div className="glass rounded-xl p-6 animate-pulse">
    <div className="h-4 bg-muted rounded w-3/4 mb-3"></div>
    <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
    <div className="h-3 bg-muted rounded w-2/3"></div>
  </div>
);

export const TableLoader = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 p-3 bg-muted/30 rounded-lg animate-pulse">
        <div className="h-4 bg-muted rounded w-1/4"></div>
        <div className="h-4 bg-muted rounded w-1/3"></div>
        <div className="h-4 bg-muted rounded w-1/4"></div>
      </div>
    ))}
  </div>
);
