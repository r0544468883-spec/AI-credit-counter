import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sun, Moon } from "lucide-react";

const SettingsPage = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [threshold, setThreshold] = useState(80);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: webhooks } = useQuery({
    queryKey: ["webhooks", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("webhook_configs").select("*").eq("user_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const addWebhook = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("webhook_configs").insert({ user_id: user!.id, url: webhookUrl, trigger_threshold: threshold });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Webhook נוסף");
      setWebhookUrl("");
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold golden-text">הגדרות</h1>
          <p className="text-muted-foreground mt-1">הגדר את AI-Flow Monitor שלך</p>
        </div>

        <Card className="glass-card">
          <CardHeader><CardTitle className="text-lg">פרופיל</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">אימייל</label>
              <p className="text-sm text-foreground">{profile?.email ?? user?.email}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">שם תצוגה</label>
              <p className="text-sm text-foreground">{profile?.display_name ?? "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader><CardTitle className="text-lg">מראה</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === "dark" ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
                <div>
                  <Label className="text-sm font-medium text-foreground">
                    {theme === "dark" ? "מצב כהה" : "מצב בהיר"}
                  </Label>
                  <p className="text-xs text-muted-foreground">החלף בין ערכת נושא כהה לבהירה</p>
                </div>
              </div>
              <Switch checked={theme === "light"} onCheckedChange={toggleTheme} />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader><CardTitle className="text-lg">התראות Webhook</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">קבל התראה כשהשימוש שלך מגיע לסף (תואם Make.com / n8n)</p>
            <div className="flex gap-3">
              <Input
                placeholder="https://hook.us1.make.com/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="bg-muted/50 border-border/50"
              />
              <Input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-20 bg-muted/50 border-border/50"
                min={1}
                max={100}
              />
              <Button onClick={() => addWebhook.mutate()} disabled={!webhookUrl}>הוסף</Button>
            </div>
            {webhooks && webhooks.length > 0 && (
              <div className="space-y-2 mt-4">
                {webhooks.map((w) => (
                  <div key={w.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm text-foreground truncate max-w-xs">{w.url}</span>
                    <span className="text-xs text-primary font-semibold">{w.trigger_threshold}%</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card border-primary/20">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold golden-text mb-1">תוסף כרום</h3>
            <p className="text-xs text-muted-foreground mb-3">הורד את התוסף כדי לעקוב אחרי שימוש ישירות מהפלטפורמות</p>
            <Button
              variant="outline"
              className="border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => {
                fetch("/ai-flow-extension.zip").then(r => r.blob()).then(b => {
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(b);
                  a.download = "ai-flow-extension.zip";
                  a.click();
                  URL.revokeObjectURL(a.href);
                }).catch(() => toast.error("התוסף לא זמין עדיין"));
              }}
            >
              הורד תוסף
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
