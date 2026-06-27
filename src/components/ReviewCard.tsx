import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ReviewCardProps {
  reviewerName: string;
  reviewerAvatar?: string;
  rating: number;
  comment: string;
  date: string;
  dealTitle?: string;
  compact?: boolean;
}

const StarRating = ({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) => {
  const sizeClass = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        if (rating >= star) {
          return <Star key={star} className={cn(sizeClass, "fill-yellow-400 text-yellow-400")} />;
        } else if (rating >= star - 0.5) {
          return <StarHalf key={star} className={cn(sizeClass, "fill-yellow-400 text-yellow-400")} />;
        }
        return <Star key={star} className={cn(sizeClass, "text-gray-300")} />;
      })}
    </div>
  );
};

const ReviewCard = ({
  reviewerName,
  reviewerAvatar,
  rating,
  comment,
  date,
  dealTitle,
  compact = false,
}: ReviewCardProps) => {
  if (compact) {
    return (
      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
        <Avatar className="w-8 h-8">
          <AvatarImage src={reviewerAvatar} />
          <AvatarFallback className="text-xs">
            {reviewerName.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm truncate">{reviewerName}</span>
            <StarRating rating={rating} size="sm" />
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{comment}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={reviewerAvatar} />
            <AvatarFallback>
              {reviewerName.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{reviewerName}</p>
            {dealTitle && (
              <p className="text-xs text-muted-foreground">Reviewed: {dealTitle}</p>
            )}
          </div>
        </div>
        <StarRating rating={rating} size="md" />
      </div>
      <p className="text-sm text-muted-foreground">{comment}</p>
      <p className="text-xs text-muted-foreground">
        {new Date(date).toLocaleDateString()}
      </p>
    </div>
  );
};

export default ReviewCard;
