import { AppSidebar } from "./AppSidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => (
  <div className="min-h-screen bg-background">
    <AppSidebar />
    <main className="ml-64 p-8">{children}</main>
  </div>
);
