import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PlatformCard } from "@/components/PlatformCard";
import { ShimmerSkeleton } from "@/components/ShimmerSkeleton";
import { useNavigate } from "react-router-dom";

const Platforms = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: platforms, isLoading } = useQuery({
    queryKey: ["platforms"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_platforms").select("*").order("category");
      return data ?? [];
    },
  });

  const { data: usageLogs } = useQuery({
    queryKey: ["usage-summary", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("usage_logs").select("platform_id, units_used").eq("user_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: quotas } = useQuery({
    queryKey: ["user-quotas", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_platform_quotas").select("platform_id, custom_quota_limit").eq("user_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const getUsage = (id: string) => (usageLogs ?? []).filter((l) => l.platform_id === id).reduce((s, l) => s + l.units_used, 0);
  const getQuota = (id: string, def: number) => (quotas ?? []).find((q) => q.platform_id === id)?.custom_quota_limit ?? def;

  const tier1 = platforms?.filter((p) => p.category === "tier1") ?? [];
  const tier2 = platforms?.filter((p) => p.category === "tier2") ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl">
        <div>
          <h1 className="text-3xl font-bold golden-text">פלטפורמות</h1>
          <p className="text-muted-foreground mt-1">כל המנויים שלך ב-AI במקום אחד</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <ShimmerSkeleton key={i} className="h-32" />)}
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">שכבה 1 — ראשיות</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tier1.map((p) => (
                  <PlatformCard key={p.id} name={p.name} iconUrl={p.icon_url} used={getUsage(p.id)} quota={getQuota(p.id, p.default_quota_limit)} color={p.color} category={p.category} onClick={() => navigate(`/platforms/${p.id}`)} />
                ))}
              </div>
            </div>
            {tier2.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4">שכבה 2 — מורחבות</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tier2.map((p) => (
                    <PlatformCard key={p.id} name={p.name} iconUrl={p.icon_url} used={getUsage(p.id)} quota={getQuota(p.id, p.default_quota_limit)} color={p.color} category={p.category} onClick={() => navigate(`/platforms/${p.id}`)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Platforms;
