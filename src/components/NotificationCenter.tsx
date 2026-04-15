import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function NotificationCenter() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: alerts } = useQuery({
    queryKey: ["quota-alerts", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("quota_alerts")
        .select("*, ai_platforms(name, color)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!user,
  });

  const unreadCount = (alerts ?? []).filter((a) => !a.read).length;

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("quota_alerts")
        .update({ read: true })
        .eq("user_id", user!.id)
        .eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quota-alerts"] }),
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-muted/50 transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border/50">
          <h4 className="text-sm font-semibold text-foreground">התראות</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs gap-1 h-7" onClick={() => markAllRead.mutate()}>
              <CheckCheck className="w-3 h-3" />
              סמן הכל כנקרא
            </Button>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto">
          {(alerts ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">אין התראות</p>
          ) : (
            alerts!.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 border-b border-border/30 ${!alert.read ? "bg-primary/5" : ""}`}
              >
                <p className="text-sm text-foreground">{alert.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(alert.created_at).toLocaleString("he-IL")}
                </p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
