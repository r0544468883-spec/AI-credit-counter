import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface ManualUsageDialogProps {
  platformId?: string;
  platformName?: string;
}

export function ManualUsageDialog({ platformId, platformName }: ManualUsageDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(platformId || "");
  const [units, setUnits] = useState("1");
  const [modelName, setModelName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: platforms } = useQuery({
    queryKey: ["platforms-list"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_platforms").select("id, name");
      return data ?? [];
    },
    enabled: !platformId,
  });

  const handleSubmit = async () => {
    if (!user || !selectedPlatform || !units) return;
    setLoading(true);

    const { error } = await supabase.from("usage_logs").insert({
      user_id: user.id,
      platform_id: selectedPlatform,
      units_used: parseInt(units),
      action_description: description || "Manual entry",
      model_name: modelName || null,
    });

    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "נשמר", description: `${units} יחידות נרשמו בהצלחה` });
      setOpen(false);
      setUnits("1");
      setModelName("");
      setDescription("");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          רישום ידני
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>רישום שימוש ידני</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!platformId && (
            <div className="space-y-2">
              <Label>פלטפורמה</Label>
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר פלטפורמה" />
                </SelectTrigger>
                <SelectContent>
                  {platforms?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>כמות יחידות</Label>
            <Input
              type="number"
              min="1"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>מודל (אופציונלי)</Label>
            <Input
              placeholder="למשל GPT-4o, Sonnet 4..."
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>תיאור (אופציונלי)</Label>
            <Textarea
              placeholder="מה עשית? למשל: כתיבת קוד ב-Cursor"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Button onClick={handleSubmit} disabled={loading || !selectedPlatform} className="w-full">
            {loading ? "שומר..." : "שמור"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
