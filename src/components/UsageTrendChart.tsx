import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UsageLog {
  created_at: string;
  units_used: number;
  platform_id?: string;
}

interface Platform {
  id: string;
  name: string;
  color: string | null;
}

interface UsageTrendChartProps {
  logs: UsageLog[];
  platforms?: Platform[];
  title?: string;
  /** Single platform color for platform detail view */
  color?: string;
}

export const UsageTrendChart = ({
  logs,
  platforms,
  title = "מגמות שימוש",
  color,
}: UsageTrendChartProps) => {
  const chartData = useMemo(() => {
    if (!logs.length) return [];

    // Group by date
    const byDate: Record<string, Record<string, number>> = {};
    for (const log of logs) {
      const date = new Date(log.created_at).toLocaleDateString("he-IL", {
        day: "2-digit",
        month: "2-digit",
      });
      if (!byDate[date]) byDate[date] = {};
      const key = log.platform_id ?? "usage";
      byDate[date][key] = (byDate[date][key] || 0) + log.units_used;
    }

    // Sort by actual date
    const entries = Object.entries(byDate).sort((a, b) => {
      const [dA, mA] = a[0].split(".").map(Number);
      const [dB, mB] = b[0].split(".").map(Number);
      return mA - mB || dA - dB;
    });

    return entries.map(([date, usage]) => ({ date, ...usage }));
  }, [logs]);

  if (!chartData.length) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground py-8">
            אין מספיק נתונים להצגת גרף
          </p>
        </CardContent>
      </Card>
    );
  }

  // Determine which areas to render
  const areas: { key: string; color: string; name: string }[] = [];
  if (platforms && !color) {
    for (const p of platforms) {
      const hasData = chartData.some((d) => (d as any)[p.id] > 0);
      if (hasData) {
        areas.push({ key: p.id, color: p.color || "#facc15", name: p.name });
      }
    }
  } else {
    areas.push({ key: "usage", color: color || "#facc15", name: "שימוש" });
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                {areas.map((a) => (
                  <linearGradient key={a.key} id={`grad-${a.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={a.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={a.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
              <XAxis
                dataKey="date"
                tick={{ fill: "hsl(var(--chart-text))", fontSize: 11 }}
                axisLine={{ stroke: "hsl(var(--chart-grid))" }}
              />
              <YAxis
                tick={{ fill: "hsl(var(--chart-text))", fontSize: 11 }}
                axisLine={{ stroke: "hsl(var(--chart-grid))" }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--chart-tooltip-bg))",
                  border: "1px solid hsl(var(--chart-tooltip-border))",
                  borderRadius: "8px",
                  color: "hsl(var(--chart-tooltip-text))",
                  fontSize: 12,
                }}
              />
              {areas.map((a) => (
                <Area
                  key={a.key}
                  type="monotone"
                  dataKey={a.key}
                  name={a.name}
                  stroke={a.color}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#grad-${a.key})`}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
