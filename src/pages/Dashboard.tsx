import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PlatformCard } from "@/components/PlatformCard";
import { DailyTipCard } from "@/components/DailyTipCard";
import { ShimmerSkeleton } from "@/components/ShimmerSkeleton";
import { GoldenProgressBar } from "@/components/GoldenProgressBar";
import { Activity, Cpu, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { UsageTrendChart } from "@/components/UsageTrendChart";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: platforms, isLoading: loadingPlatforms } = useQuery({
    queryKey: ["platforms"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_platforms").select("*").order("category");
      return data ?? [];
    },
  });

  const { data: usageLogs } = useQuery({
    queryKey: ["usage-summary", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("usage_logs")
        .select("platform_id, units_used, created_at")
        .eq("user_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: quotas } = useQuery({
    queryKey: ["user-quotas", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_platform_quotas")
        .select("platform_id, custom_quota_limit")
        .eq("user_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: tip } = useQuery({
    queryKey: ["daily-tip"],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_tips")
        .select("*")
        .order("tip_date", { ascending: false })
        .limit(1)
        .single();
      return data;
    },
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["recent-activity", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("usage_logs")
        .select("*, ai_platforms(name, color)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!user,
  });

  const getUsageForPlatform = (platformId: string) => {
    return (usageLogs ?? [])
      .filter((l) => l.platform_id === platformId)
      .reduce((sum, l) => sum + l.units_used, 0);
  };

  const getQuotaForPlatform = (platformId: string, defaultQuota: number) => {
    const custom = (quotas ?? []).find((q) => q.platform_id === platformId);
    return custom?.custom_quota_limit ?? defaultQuota;
  };

  const totalUsed = platforms?.reduce((sum, p) => sum + getUsageForPlatform(p.id), 0) ?? 0;
  const totalQuota = platforms?.reduce((sum, p) => sum + getQuotaForPlatform(p.id, p.default_quota_limit), 0) ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl">
        <div>
          <h1 className="text-3xl font-bold golden-text">לוח בקרה</h1>
          <p className="text-muted-foreground mt-1">סקירת השימוש שלך ב-AI במבט אחד</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Cpu className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{platforms?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">פלטפורמות פעילות</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalQuota - totalUsed}</p>
                <p className="text-xs text-muted-foreground">סה״כ נותרו</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">שימוש כולל</span>
              </div>
              <GoldenProgressBar value={totalUsed} max={totalQuota} size="md" />
            </CardContent>
          </Card>
        </div>

        {usageLogs && platforms && usageLogs.length > 0 && (
          <UsageTrendChart logs={usageLogs} platforms={platforms} />
        )}

        {tip && <DailyTipCard content={tip.content} category={tip.category ?? undefined} />}

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">הפלטפורמות שלך</h2>
          {loadingPlatforms ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <ShimmerSkeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {platforms?.map((platform) => (
                <PlatformCard
                  key={platform.id}
                  name={platform.name}
                  iconUrl={platform.icon_url}
                  used={getUsageForPlatform(platform.id)}
                  quota={getQuotaForPlatform(platform.id, platform.default_quota_limit)}
                  color={platform.color}
                  category={platform.category}
                  onClick={() => navigate(`/platforms/${platform.id}`)}
                />
              ))}
            </div>
          )}
        </div>

        {recentActivity && recentActivity.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">פעילות אחרונה</h2>
            <Card className="glass-card">
              <CardContent className="p-0">
                {recentActivity.map((log, i) => (
                  <div
                    key={log.id}
                    className={`flex items-center justify-between p-4 ${i < recentActivity.length - 1 ? "border-b border-border/50" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: (log as any).ai_platforms?.color ?? "hsl(var(--primary))" }}
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {(log as any).ai_platforms?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{log.action_description ?? "קריאת API"}</p>
                      </div>
                    </div>
                    <div className="text-start">
                      <span className="text-sm font-semibold text-foreground">{log.units_used}</span>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(log.created_at).toLocaleDateString("he-IL")}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
