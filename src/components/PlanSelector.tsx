import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { toast } from "sonner";

interface PlanSelectorProps {
  platformId: string;
  currentQuota?: number;
  selectedPlanId?: string | null;
}

export const PlanSelector = ({ platformId, selectedPlanId }: PlanSelectorProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: plans } = useQuery({
    queryKey: ["platform-plans", platformId],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_plans")
        .select("*")
        .eq("platform_id", platformId)
        .order("quota_limit");
      return data ?? [];
    },
  });

  const selectPlan = useMutation({
    mutationFn: async (plan: { id: string; quota_limit: number }) => {
      // Upsert user_platform_quotas
      const { data: existing } = await supabase
        .from("user_platform_quotas")
        .select("id")
        .eq("user_id", user!.id)
        .eq("platform_id", platformId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("user_platform_quotas")
          .update({
            custom_quota_limit: plan.quota_limit,
            selected_plan_id: plan.id,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_platform_quotas")
          .insert({
            user_id: user!.id,
            platform_id: platformId,
            custom_quota_limit: plan.quota_limit,
            selected_plan_id: plan.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("החבילה עודכנה");
      queryClient.invalidateQueries({ queryKey: ["platform-quota", platformId] });
      queryClient.invalidateQueries({ queryKey: ["user-quotas"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!plans?.length) return null;

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg">החבילה שלי</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {plans.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            return (
              <button
                key={plan.id}
                onClick={() => selectPlan.mutate(plan)}
                className={`relative p-4 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "border-border/50 bg-muted/20 hover:border-primary/40 hover:bg-muted/40"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
                <p className="text-sm font-semibold text-foreground">{plan.plan_name}</p>
                <p className="text-xs text-muted-foreground mt-1">{plan.price_label}</p>
                <p className="text-lg font-bold text-primary mt-2">{plan.quota_limit.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">יחידות שימוש</p>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
