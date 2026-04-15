import { cn } from "@/lib/utils";

interface GoldenProgressBarProps {
  value: number;
  max: number;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

const getBarColor = (percentage: number) => {
  if (percentage >= 90) return "bg-destructive";
  if (percentage >= 70) return "bg-warning";
  return "bg-success";
};

const getGlowColor = (percentage: number) => {
  if (percentage >= 90) return "shadow-[0_0_12px_hsl(0_84%_60%/0.4)]";
  if (percentage >= 70) return "shadow-[0_0_12px_hsl(38_92%_50%/0.4)]";
  return "shadow-[0_0_12px_hsl(142_76%_36%/0.3)]";
};

export const GoldenProgressBar = ({
  value,
  max,
  className,
  showLabel = true,
  size = "md",
}: GoldenProgressBarProps) => {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const heights = { sm: "h-1.5", md: "h-2.5", lg: "h-4" };

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">
            {value} / {max} credits
          </span>
          <span
            className={cn(
              "font-semibold",
              percentage >= 90 ? "text-destructive" : percentage >= 70 ? "text-warning" : "text-success"
            )}
          >
            {percentage.toFixed(0)}%
          </span>
        </div>
      )}
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-muted/50",
          heights[size]
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            getBarColor(percentage),
            percentage === 100 && "animate-pulse-gold",
            getGlowColor(percentage)
          )}
          style={{ width: `${percentage}%` }}
        />
        {percentage === 100 && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-golden-shimmer" />
        )}
      </div>
    </div>
  );
};
