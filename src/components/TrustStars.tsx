import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TrustStarsProps {
  score: number;
  showLabel?: boolean;
  size?: "sm" | "md";
}

const getStarCount = (score: number) => {
  if (score >= 90) return 5;
  if (score >= 70) return 4;
  if (score >= 50) return 3;
  if (score >= 30) return 2;
  return 1;
};

export const TrustStars = ({ score, showLabel = false, size = "sm" }: TrustStarsProps) => {
  const stars = getStarCount(score);
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1">
            <span className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    iconSize,
                    i < stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                  )}
                />
              ))}
            </span>
            {showLabel && (
              <span className="text-[10px] text-muted-foreground ml-1">
                Trust: {score}%
              </span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs">
          Trust Score: {score}%. Based on data source consistency, session volume, and profile verification.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
