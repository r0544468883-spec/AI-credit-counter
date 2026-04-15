import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { ShimmerSkeleton } from "@/components/ShimmerSkeleton";

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

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold golden-text">Activity Feed</h1>
          <p className="text-muted-foreground mt-1">All actions across platforms</p>
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
                      <p className="text-xs text-muted-foreground">{log.action_description ?? "API call"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-foreground">{log.units_used}</span>
                    <p className="text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <p className="text-center text-muted-foreground">No activity recorded yet</p>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ActivityFeed;
