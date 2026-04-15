import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GoldenProgressBar } from "@/components/GoldenProgressBar";
import { ManualUsageDialog } from "@/components/ManualUsageDialog";
import { UsageTrendChart } from "@/components/UsageTrendChart";
import { CheckCircle, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PlatformsSummary = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: platforms } = useQuery({
    queryKey: ["all-platforms"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_platforms").select("*");
      return data ?? [];
    },
  });

  const { data: usage } = useQuery({
    queryKey: ["all-usage", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("usage_logs")
        .select("platform_id, units_used, model_name, created_at")
        .eq("user_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: quotas } = useQuery({
    queryKey: ["all-quotas", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_platform_quotas")
        .select("platform_id, custom_quota_limit")
        .eq("user_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: snapshots } = useQuery({
    queryKey: ["all-snapshots", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_usage_snapshots")
        .select("*")
        .eq("user_id", user!.id)
        .order("scraped_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  // Build aggregated data
  const usageByPlatform: Record<string, { total: number; byModel: Record<string, number> }> = {};
  for (const log of usage ?? []) {
    if (!usageByPlatform[log.platform_id]) {
      usageByPlatform[log.platform_id] = { total: 0, byModel: {} };
    }
    usageByPlatform[log.platform_id].total += log.units_used;
    const model = log.model_name || "ללא מודל";
    usageByPlatform[log.platform_id].byModel[model] = (usageByPlatform[log.platform_id].byModel[model] || 0) + log.units_used;
  }

  const quotaMap: Record<string, number> = {};
  for (const q of quotas ?? []) {
    quotaMap[q.platform_id] = q.custom_quota_limit;
  }

  // Latest snapshot per platform
  const snapshotMap: Record<string, typeof snapshots extends (infer T)[] ? T : never> = {};
  for (const s of snapshots ?? []) {
    if (!snapshotMap[s.platform_id]) {
      snapshotMap[s.platform_id] = s;
    }
  }

  const totalUsed = Object.values(usageByPlatform).reduce((s, p) => s + p.total, 0);
  const totalQuota = (platforms ?? []).reduce((s, p) => s + (quotaMap[p.id] || p.default_quota_limit), 0);
  const alertCount = (platforms ?? []).filter((p) => {
    const used = usageByPlatform[p.id]?.total || 0;
    const quota = quotaMap[p.id] || p.default_quota_limit;
    return quota > 0 && (used / quota) >= 0.8;
  }).length;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">סיכום פלטפורמות</h1>
            <p className="text-sm text-muted-foreground">מבט כולל על השימוש בכל הפלטפורמות</p>
          </div>
          <ManualUsageDialog />
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalUsed}</p>
                <p className="text-xs text-muted-foreground">סה״כ שימוש</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{Object.keys(snapshotMap).length}</p>
                <p className="text-xs text-muted-foreground">נתונים מאומתים</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{alertCount}</p>
                <p className="text-xs text-muted-foreground">התראות מכסה</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Usage history chart - all platforms */}
        {(usage ?? []).length > 0 && platforms && (
          <UsageTrendChart
            logs={usage!}
            platforms={platforms.map((p) => ({ id: p.id, name: p.name, color: p.color }))}
            title="היסטוריית שימוש — כל הפלטפורמות"
          />
        )}

        {/* Per-platform breakdown */}
        <div className="space-y-4">
          {(platforms ?? []).map((platform) => {
            const pUsage = usageByPlatform[platform.id];
            const totalPlatformUsed = pUsage?.total || 0;
            const quota = quotaMap[platform.id] || platform.default_quota_limit;
            const snap = snapshotMap[platform.id];
            const snapFresh = snap?.scraped_at
              ? (Date.now() - new Date(snap.scraped_at).getTime()) < 30 * 60 * 1000
              : false;

            const displayUsed = snapFresh && snap?.actual_limit && snap?.actual_remaining != null
              ? snap.actual_limit - snap.actual_remaining
              : totalPlatformUsed;
            const displayMax = snapFresh && snap?.actual_limit ? snap.actual_limit : quota;
            const pct = displayMax > 0 ? (displayUsed / displayMax) * 100 : 0;

            return (
              <Card
                key={platform.id}
                className="glass-card cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => navigate(`/platforms/${platform.id}`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
                        style={{
                          backgroundColor: platform.color ? `${platform.color}20` : "hsl(var(--muted))",
                          color: platform.color || "hsl(var(--primary))",
                        }}
                      >
                        {platform.name[0]}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{platform.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          {snapFresh ? (
                            <Badge variant="outline" className="text-[10px] gap-1 py-0 text-emerald-400 border-emerald-400/30">
                              <CheckCircle className="w-2.5 h-2.5" />
                              מאומת
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] gap-1 py-0 text-muted-foreground">
                              <Clock className="w-2.5 h-2.5" />
                              הערכה
                            </Badge>
                          )}
                          {pct >= 80 && (
                            <Badge variant="destructive" className="text-[10px] py-0">
                              {pct >= 100 ? "נגמר!" : "מתקרב למכסה"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-mono text-muted-foreground">
                      {displayUsed}/{displayMax}
                    </span>
                  </div>

                  <GoldenProgressBar value={displayUsed} max={displayMax} size="sm" />

                  {/* Model breakdown */}
                  {pUsage && Object.keys(pUsage.byModel).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Object.entries(pUsage.byModel)
                        .sort(([, a], [, b]) => b - a)
                        .map(([model, count]) => (
                          <Badge key={model} variant="secondary" className="text-[10px] font-normal">
                            {model}: {count}
                          </Badge>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PlatformsSummary;
