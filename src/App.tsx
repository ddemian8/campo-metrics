import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Analyze from "./pages/Analyze.tsx";
import Report from "./pages/Report.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Explore from "./pages/Explore.tsx";
import Settings from "./pages/Settings.tsx";
import PlayerProfile from "./pages/PlayerProfile.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Affiliate from "./pages/Affiliate.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminUsers from "./pages/admin/AdminUsers.tsx";
import AdminReports from "./pages/admin/AdminReports.tsx";
import AdminPromoCodes from "./pages/admin/AdminPromoCodes.tsx";
import AdminSales from "./pages/admin/AdminSales.tsx";
import AdminAffiliates from "./pages/admin/AdminAffiliates.tsx";
import AdminContent from "./pages/admin/AdminContent.tsx";
import AdminLeaderboard from "./pages/admin/AdminLeaderboard.tsx";
import AdminSettings from "./pages/admin/AdminSettings.tsx";
import AdminFootballDatabase from "./pages/admin/AdminFootballDatabase.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/analyze" element={<Analyze />} />
          <Route path="/report/:id" element={<Report />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/player/:username" element={<PlayerProfile />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/affiliate" element={<Affiliate />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/promo-codes" element={<AdminPromoCodes />} />
          <Route path="/admin/sales" element={<AdminSales />} />
          <Route path="/admin/affiliates" element={<AdminAffiliates />} />
          <Route path="/admin/content" element={<AdminContent />} />
          <Route path="/admin/leaderboard" element={<AdminLeaderboard />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/football" element={<AdminFootballDatabase />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
