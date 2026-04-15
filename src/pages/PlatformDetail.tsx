import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PlanSelector } from "@/components/PlanSelector";
import { GoldenProgressBar } from "@/components/GoldenProgressBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsageTrendChart } from "@/components/UsageTrendChart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ManualUsageDialog } from "@/components/ManualUsageDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowRight, CheckCircle, Clock, Pencil } from "lucide-react";
import { toast } from "sonner";

const PlatformDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [customQuota, setCustomQuota] = useState("");

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

  const { data: latestSnapshot } = useQuery({
    queryKey: ["platform-snapshot", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_usage_snapshots")
        .select("*")
        .eq("user_id", user!.id)
        .eq("platform_id", id!)
        .order("scraped_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!id,
  });

  const updateQuota = useMutation({
    mutationFn: async (newQuota: number) => {
      const { data: existing } = await supabase
        .from("user_platform_quotas")
        .select("id")
        .eq("user_id", user!.id)
        .eq("platform_id", id!)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from("user_platform_quotas").update({ custom_quota_limit: newQuota }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_platform_quotas").insert({
          user_id: user!.id,
          platform_id: id!,
          custom_quota_limit: newQuota,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("המכסה עודכנה");
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["platform-quota", id] });
      queryClient.invalidateQueries({ queryKey: ["user-quotas"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!platform) return null;

  const totalUsed = (logs ?? []).reduce((s, l) => s + l.units_used, 0);
  const maxQuota = quota?.custom_quota_limit ?? platform.default_quota_limit;

  const snapshotFresh = latestSnapshot?.scraped_at
    ? (Date.now() - new Date(latestSnapshot.scraped_at).getTime()) < 30 * 60 * 1000
    : false;

  const displayUsed = snapshotFresh && latestSnapshot?.actual_limit && latestSnapshot?.actual_remaining != null
    ? latestSnapshot.actual_limit - latestSnapshot.actual_remaining
    : totalUsed;

  const displayMax = snapshotFresh && latestSnapshot?.actual_limit
    ? latestSnapshot.actual_limit
    : maxQuota;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowRight className="w-4 h-4 ms-2" /> חזרה
        </Button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: platform.color ? `${platform.color}20` : "hsl(var(--muted))" }}>
              {platform.icon_url ? <img src={platform.icon_url} alt={platform.name} className="w-7 h-7" /> : <span className="text-2xl font-bold text-primary">{platform.name[0]}</span>}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{platform.name}</h1>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{platform.category} • איפוס {platform.reset_cycle === "monthly" ? "חודשי" : platform.reset_cycle === "weekly" ? "שבועי" : "יומי"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Pencil className="w-4 h-4" />
                  ערוך מכסה
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm" dir="rtl">
                <DialogHeader>
                  <DialogTitle>עריכת מכסה — {platform.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    type="number"
                    min="1"
                    placeholder={String(maxQuota)}
                    value={customQuota}
                    onChange={(e) => setCustomQuota(e.target.value)}
                  />
                  <Button
                    className="w-full"
                    disabled={!customQuota}
                    onClick={() => updateQuota.mutate(parseInt(customQuota))}
                  >
                    שמור
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <ManualUsageDialog platformId={id!} platformName={platform.name} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {snapshotFresh ? (
            <Badge variant="outline" className="gap-1 text-emerald-400 border-emerald-400/30">
              <CheckCircle className="w-3 h-3" />
              נתון מאומת • {latestSnapshot?.source === "scraped" ? "נגרד אוטומטית" : "רישום ידני"}
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <Clock className="w-3 h-3" />
              הערכה מספירת הודעות
            </Badge>
          )}
          {latestSnapshot?.model_name && (
            <Badge variant="secondary">{latestSnapshot.model_name}</Badge>
          )}
        </div>

        <Card className="glass-card">
          <CardContent className="p-6">
            <GoldenProgressBar value={displayUsed} max={displayMax} size="lg" />
          </CardContent>
        </Card>

        <PlanSelector platformId={id!} selectedPlanId={quota?.selected_plan_id} />

        {logs && logs.length > 0 && (
          <UsageTrendChart logs={logs} color={platform.color ?? undefined} title={`מגמות שימוש — ${platform.name}`} />
        )}

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">פעילות אחרונה</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {logs && logs.length > 0 ? (
              logs.map((log, i) => (
                <div key={log.id} className={`flex items-center justify-between p-4 ${i < logs.length - 1 ? "border-b border-border/50" : ""}`}>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {log.action_description ?? "קריאת API"}
                      {log.model_name && <span className="text-xs text-muted-foreground ms-2">({log.model_name})</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString("he-IL")}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">-{log.units_used}</span>
                </div>
              ))
            ) : (
              <p className="p-6 text-center text-sm text-muted-foreground">אין פעילות עדיין</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PlatformDetail;
