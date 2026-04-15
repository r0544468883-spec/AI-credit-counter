import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { NotificationCenter } from "./NotificationCenter";
import { Menu, X } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <AppSidebar />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 h-full">
            <AppSidebar />
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 left-4 p-1 rounded-lg bg-muted/50 text-foreground z-50"
              style={{ insetInlineStart: "auto", insetInlineEnd: "1rem" }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <main className="md:ms-64 min-h-screen">
        {/* Top bar */}
        <header className="flex items-center justify-between p-4 md:px-8 md:pt-6 md:pb-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-muted/50"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1" />
          <NotificationCenter />
        </header>
        <div className="p-4 md:p-8 pt-2">{children}</div>
      </main>
    </div>
  );
};
