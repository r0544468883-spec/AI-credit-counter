import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Platforms from "./pages/Platforms";
import PlatformDetail from "./pages/PlatformDetail";
import Tips from "./pages/Tips";
import ActivityFeed from "./pages/ActivityFeed";
import SettingsPage from "./pages/SettingsPage";
import PlatformsSummary from "./pages/PlatformsSummary";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/platforms" element={<ProtectedRoute><Platforms /></ProtectedRoute>} />
            <Route path="/platforms/:id" element={<ProtectedRoute><PlatformDetail /></ProtectedRoute>} />
            <Route path="/summary" element={<ProtectedRoute><PlatformsSummary /></ProtectedRoute>} />
            <Route path="/tips" element={<ProtectedRoute><Tips /></ProtectedRoute>} />
            <Route path="/activity" element={<ProtectedRoute><ActivityFeed /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
