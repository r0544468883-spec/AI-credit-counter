import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DailyTipCard } from "@/components/DailyTipCard";
import { ShimmerSkeleton } from "@/components/ShimmerSkeleton";

const Tips = () => {
  const { data: tips, isLoading } = useQuery({
    queryKey: ["all-tips"],
    queryFn: async () => {
      const { data } = await supabase.from("daily_tips").select("*").order("tip_date", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold golden-text">Daily Tips</h1>
          <p className="text-muted-foreground mt-1">AI productivity insights for power users</p>
        </div>
        {isLoading ? (
          <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <ShimmerSkeleton key={i} className="h-24" />)}</div>
        ) : (
          <div className="space-y-4">
            {tips?.map((tip) => (
              <DailyTipCard key={tip.id} content={tip.content} category={tip.category ?? undefined} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Tips;
