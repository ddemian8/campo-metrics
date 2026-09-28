import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, FileText, Tag, DollarSign, UserPlus,
  Settings, BarChart3, Trophy, Menu, ChevronLeft, Globe, Eye, LogOut, ExternalLink
} from "lucide-react";
import logo from "@/assets/logo.svg";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { label: "Users", path: "/admin/users", icon: Users },
  { label: "Reports", path: "/admin/reports", icon: FileText },
  { label: "Promo Codes", path: "/admin/promo-codes", icon: Tag },
  { label: "Sales & Revenue", path: "/admin/sales", icon: DollarSign },
  { label: "Affiliates", path: "/admin/affiliates", icon: UserPlus },
  { label: "Content", path: "/admin/content", icon: BarChart3 },
  { label: "Leaderboard", path: "/admin/leaderboard", icon: Trophy },
  { label: "Football DB", path: "/admin/football", icon: Globe },
  { label: "Settings", path: "/admin/settings", icon: Settings },
];

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 h-[50px] border-b border-border bg-card/95 backdrop-blur-xl flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <ShieldBadge />
          <span className="text-sm font-semibold text-foreground">Campometric Admin</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <a href="/" target="_blank" rel="noreferrer">
              <ExternalLink size={14} className="mr-1" /> View Site
            </a>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut size={14} className="mr-1" /> Log out
          </Button>
        </div>
      </header>

      <div className="flex pt-[50px]">
      <aside className={cn(
        "fixed left-0 top-[50px] bottom-0 z-40 flex flex-col border-r border-border bg-card transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          {!collapsed && (
            <Link to="/admin" className="flex items-center">
              <img src={logo} alt="Admin" className="h-8" />
              <span className="ml-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Admin</span>
            </Link>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="text-muted-foreground hover:text-foreground">
            {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = location.pathname === item.path ||
              (item.path !== "/admin" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors mx-2 rounded-md",
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <item.icon size={18} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-xs"
            onClick={() => navigate("/?admin_preview=1")}
          >
            <Eye size={14} />
            {!collapsed && "View as User"}
          </Button>
        </div>
      </aside>

      <main className={cn("flex-1 transition-all duration-200", collapsed ? "ml-16" : "ml-60")}>
        <div className="p-6 md:p-8 max-w-7xl">
          {children}
        </div>
      </main>
      </div>
    </div>
  );
};

export default AdminLayout;

const ShieldBadge = () => (
  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  </span>
);
