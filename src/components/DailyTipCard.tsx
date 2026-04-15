import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

interface DailyTipCardProps {
  content: string;
  category?: string;
}

export const DailyTipCard = ({ content, category }: DailyTipCardProps) => (
  <Card className="glass-card border-primary/20 overflow-hidden relative">
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
    <CardContent className="p-5 relative">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Lightbulb className="w-4 h-4 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold golden-text">הטיפ היומי</h4>
            {category && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                {category}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{content}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);
