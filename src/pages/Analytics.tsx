import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";

const DAYS_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

const Analytics = () => {
  const { user } = useAuth();

  const { data: logs } = useQuery({
    queryKey: ["analytics-logs", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("usage_logs")
        .select("units_used, created_at, platform_id, ai_platforms(name, color)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
    enabled: !!user,
  });

  // Hourly distribution
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${String(i).padStart(2, "0")}:00`, total: 0 }));
    for (const log of logs ?? []) {
      const h = new Date(log.created_at).getHours();
      hours[h].total += log.units_used;
    }
    return hours;
  }, [logs]);

  // Day of week distribution
  const dayData = useMemo(() => {
    const days = DAYS_HE.map((name) => ({ day: name, total: 0 }));
    for (const log of logs ?? []) {
      const d = new Date(log.created_at).getDay();
      days[d].total += log.units_used;
    }
    return days;
  }, [logs]);

  // Monthly trend
  const monthlyData = useMemo(() => {
    const byMonth: Record<string, number> = {};
    for (const log of logs ?? []) {
      const d = new Date(log.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      byMonth[key] = (byMonth[key] || 0) + log.units_used;
    }
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({ month, total }));
  }, [logs]);

  // Platform breakdown
  const platformData = useMemo(() => {
    const byPlatform: Record<string, { name: string; color: string; total: number }> = {};
    for (const log of logs ?? []) {
      const p = (log as any).ai_platforms;
      const pid = log.platform_id;
      if (!byPlatform[pid]) {
        byPlatform[pid] = { name: p?.name ?? "?", color: p?.color ?? "#facc15", total: 0 };
      }
      byPlatform[pid].total += log.units_used;
    }
    return Object.values(byPlatform).sort((a, b) => b.total - a.total);
  }, [logs]);

  const totalUsage = (logs ?? []).reduce((s, l) => s + l.units_used, 0);
  const avgPerDay = logs?.length
    ? (() => {
        const dates = new Set((logs ?? []).map((l) => new Date(l.created_at).toDateString()));
        return dates.size > 0 ? Math.round(totalUsage / dates.size) : 0;
      })()
    : 0;

  const tooltipStyle = {
    backgroundColor: "hsl(var(--chart-tooltip-bg))",
    border: "1px solid hsl(var(--chart-tooltip-border))",
    borderRadius: "8px",
    color: "hsl(var(--chart-tooltip-text))",
    fontSize: 12,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        <div>
          <h1 className="text-3xl font-bold golden-text">אנליטיקס</h1>
          <p className="text-muted-foreground mt-1">ניתוח מעמיק של דפוסי השימוש שלך</p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardContent className="p-5 text-center">
              <p className="text-3xl font-bold text-foreground">{totalUsage}</p>
              <p className="text-xs text-muted-foreground mt-1">סה״כ שימוש</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-5 text-center">
              <p className="text-3xl font-bold text-foreground">{avgPerDay}</p>
              <p className="text-xs text-muted-foreground mt-1">ממוצע יומי</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-5 text-center">
              <p className="text-3xl font-bold text-foreground">{platformData.length}</p>
              <p className="text-xs text-muted-foreground mt-1">פלטפורמות פעילות</p>
            </CardContent>
          </Card>
        </div>

        {/* Hourly distribution */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">שימוש לפי שעה ביום</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
                  <XAxis dataKey="hour" tick={{ fill: "hsl(var(--chart-text))", fontSize: 10 }} axisLine={{ stroke: "hsl(var(--chart-grid))" }} interval={2} />
                  <YAxis tick={{ fill: "hsl(var(--chart-text))", fontSize: 11 }} axisLine={{ stroke: "hsl(var(--chart-grid))" }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="total" name="שימוש" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Day of week */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">שימוש לפי יום בשבוע</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
                  <XAxis dataKey="day" tick={{ fill: "hsl(var(--chart-text))", fontSize: 11 }} axisLine={{ stroke: "hsl(var(--chart-grid))" }} />
                  <YAxis tick={{ fill: "hsl(var(--chart-text))", fontSize: 11 }} axisLine={{ stroke: "hsl(var(--chart-grid))" }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="total" name="שימוש" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly trend */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">מגמות חודשיות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad-monthly" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
                  <XAxis dataKey="month" tick={{ fill: "hsl(var(--chart-text))", fontSize: 11 }} axisLine={{ stroke: "hsl(var(--chart-grid))" }} />
                  <YAxis tick={{ fill: "hsl(var(--chart-text))", fontSize: 11 }} axisLine={{ stroke: "hsl(var(--chart-grid))" }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="total" name="שימוש" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#grad-monthly)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Platform breakdown */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">חלוקה לפי פלטפורמה</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {platformData.map((p) => {
                const pct = totalUsage > 0 ? (p.total / totalUsage) * 100 : 0;
                return (
                  <div key={p.name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-sm text-foreground w-28 truncate">{p.name}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: p.color }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground w-16 text-start">
                      {p.total} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
