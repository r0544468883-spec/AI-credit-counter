import { useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import tosafLogo from "@/assets/tosaf-logo.png";

const Auth = () => {
  const { user, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { error } = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });

    setSubmitting(false);

    if (error) {
      toast.error(error.message);
    } else if (!isLogin) {
      toast.success("בדוק את המייל שלך כדי לאשר את החשבון!");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
      <Card className="w-full max-w-md glass-card border-primary/20 relative animate-fade-in-up">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={tosafLogo} alt="AI-Flow Monitor" className="w-16 h-16 object-contain" />
          </div>
          <div>
            <CardTitle className="text-2xl golden-text">{isLogin ? "ברוכים השבים" : "יצירת חשבון"}</CardTitle>
            <CardDescription className="text-muted-foreground mt-1">
              {isLogin ? "התחבר ל-AI-Flow Monitor" : "התחל לעקוב אחרי השימוש שלך ב-AI"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
            <Input
              type="email"
              placeholder="אימייל"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-muted/50 border-border/50 focus:border-primary"
            />
            <Input
              type="password"
              placeholder="סיסמה"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-muted/50 border-border/50 focus:border-primary"
            />
            <Button type="submit" disabled={submitting} className="w-full font-semibold">
              {submitting ? "..." : isLogin ? "כניסה" : "הרשמה"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            {isLogin ? "אין לך חשבון?" : "כבר יש לך חשבון?"}{" "}
            <button onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline font-medium">
              {isLogin ? "הרשמה" : "כניסה"}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
