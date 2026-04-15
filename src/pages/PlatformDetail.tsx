import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PlanSelector } from "@/components/PlanSelector";
import { GoldenProgressBar } from "@/components/GoldenProgressBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsageTrendChart } from "@/components/UsageTrendChart";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const PlatformDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: platform } = useQuery({
    queryKey: ["platform", id],
    queryFn: async () => {
      const { data } = await supabase.from("ai_platforms").select("*").eq("id", id!).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: logs } = useQuery({
    queryKey: ["platform-logs", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("usage_logs")
        .select("*")
        .eq("user_id", user!.id)
        .eq("platform_id", id!)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!user && !!id,
  });

  const { data: quota } = useQuery({
    queryKey: ["platform-quota", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_platform_quotas")
        .select("custom_quota_limit, selected_plan_id")
        .eq("user_id", user!.id)
        .eq("platform_id", id!)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!id,
  });

  if (!platform) return null;

  const totalUsed = (logs ?? []).reduce((s, l) => s + l.units_used, 0);
  const maxQuota = quota?.custom_quota_limit ?? platform.default_quota_limit;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: platform.color ? `${platform.color}20` : "hsl(var(--muted))" }}>
            {platform.icon_url ? <img src={platform.icon_url} alt={platform.name} className="w-7 h-7" /> : <span className="text-2xl font-bold text-primary">{platform.name[0]}</span>}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{platform.name}</h1>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">{platform.category} • {platform.reset_cycle} reset</span>
          </div>
        </div>

        <Card className="glass-card">
          <CardContent className="p-6">
            <GoldenProgressBar value={totalUsed} max={maxQuota} size="lg" />
          </CardContent>
        </Card>

        {/* Usage Trend */}
        {logs && logs.length > 0 && (
          <UsageTrendChart
            logs={logs}
            color={platform.color ?? undefined}
            title={`מגמות שימוש — ${platform.name}`}
          />
        )}

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {logs && logs.length > 0 ? (
              logs.map((log, i) => (
                <div key={log.id} className={`flex items-center justify-between p-4 ${i < logs.length - 1 ? "border-b border-border/50" : ""}`}>
                  <div>
                    <p className="text-sm font-medium text-foreground">{log.action_description ?? "API call"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">-{log.units_used}</span>
                </div>
              ))
            ) : (
              <p className="p-6 text-center text-sm text-muted-foreground">No activity yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PlatformDetail;
