import { Card, CardContent } from "@/components/ui/card";
import { GoldenProgressBar } from "./GoldenProgressBar";
import { cn } from "@/lib/utils";

interface PlatformCardProps {
  name: string;
  iconUrl?: string | null;
  used: number;
  quota: number;
  color?: string | null;
  category?: string;
  onClick?: () => void;
}

export const PlatformCard = ({
  name,
  iconUrl,
  used,
  quota,
  color,
  category,
  onClick,
}: PlatformCardProps) => {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "glass-card cursor-pointer transition-all duration-300",
        "hover:border-primary/40 hover:shadow-[0_0_20px_hsl(48_97%_54%/0.1)]",
        "animate-fade-in-up"
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: color ? `${color}20` : "hsl(var(--muted))" }}
          >
            {iconUrl ? (
              <img src={iconUrl} alt={name} className="w-5 h-5" />
            ) : (
              <span className="text-lg font-bold text-primary">{name[0]}</span>
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm text-foreground">{name}</h3>
            {category && (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {category}
              </span>
            )}
          </div>
          <div className="text-start">
            <span className="text-lg font-bold text-foreground">{quota - used}</span>
            <p className="text-[10px] text-muted-foreground">נותרו</p>
          </div>
        </div>
        <GoldenProgressBar value={used} max={quota} size="sm" />
      </CardContent>
    </Card>
  );
};
