import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Cpu, Lightbulb, Settings, LogOut, Activity, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import tosafLogo from "@/assets/tosaf-logo.png";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "לוח בקרה" },
  { to: "/platforms", icon: Cpu, label: "פלטפורמות" },
  { to: "/summary", icon: BarChart3, label: "סיכום" },
  { to: "/activity", icon: Activity, label: "פעילות" },
  { to: "/tips", icon: Lightbulb, label: "טיפים" },
  { to: "/settings", icon: Settings, label: "הגדרות" },
];

export const AppSidebar = () => {
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("התנתקת בהצלחה");
  };

  return (
    <aside className="w-64 h-screen bg-sidebar border-s border-sidebar-border flex flex-col fixed inset-inline-start-0 top-0 z-40">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img src={tosafLogo} alt="AI-Flow Monitor" className="w-9 h-9 object-contain" />
          <div>
            <h1 className="text-base font-bold golden-text">AI-Flow</h1>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Monitor</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-primary font-semibold"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-destructive transition-all w-full"
        >
          <LogOut className="w-4 h-4" />
          התנתקות
        </button>
      </div>
    </aside>
  );
};
