import { cn } from "@/lib/utils";

interface ShimmerSkeletonProps {
  className?: string;
}

export const ShimmerSkeleton = ({ className }: ShimmerSkeletonProps) => (
  <div
    className={cn(
      "rounded-lg bg-muted/50 animate-golden-shimmer",
      "bg-gradient-to-r from-muted/50 via-muted/80 to-muted/50",
      "bg-[length:200%_auto]",
      className
    )}
  />
);
