import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShimmerSkeleton } from "@/components/ShimmerSkeleton";
import { Download } from "lucide-react";
import { downloadCSV } from "@/lib/export-csv";

const ActivityFeed = () => {
  const { user } = useAuth();

  const { data: logs, isLoading } = useQuery({
    queryKey: ["all-activity", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("usage_logs")
        .select("*, ai_platforms(name, color, icon_url)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: !!user,
  });

  const handleExport = () => {
    if (!logs?.length) return;
    downloadCSV(
      logs.map((l) => ({
        תאריך: new Date(l.created_at).toLocaleString("he-IL"),
        פלטפורמה: (l as any).ai_platforms?.name ?? "",
        יחידות: l.units_used,
        תיאור: l.action_description ?? "",
        מודל: l.model_name ?? "",
      })),
      "activity-export.csv"
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold golden-text">פעילות</h1>
            <p className="text-muted-foreground mt-1">כל הפעולות בכל הפלטפורמות</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport} disabled={!logs?.length}>
            <Download className="w-4 h-4" />
            ייצוא CSV
          </Button>
        </div>
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <ShimmerSkeleton key={i} className="h-16" />)}</div>
        ) : logs && logs.length > 0 ? (
          <Card className="glass-card">
            <CardContent className="p-0">
              {logs.map((log, i) => (
                <div key={log.id} className={`flex items-center justify-between p-4 ${i < logs.length - 1 ? "border-b border-border/50" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: (log as any).ai_platforms?.color ?? "hsl(var(--primary))" }} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{(log as any).ai_platforms?.name}</p>
                      <p className="text-xs text-muted-foreground">{log.action_description ?? "קריאת API"}</p>
                    </div>
                  </div>
                  <div className="text-start">
                    <span className="text-sm font-semibold text-foreground">{log.units_used}</span>
                    <p className="text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleString("he-IL")}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <p className="text-center text-muted-foreground">אין פעילות עדיין</p>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ActivityFeed;
