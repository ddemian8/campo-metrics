import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, FileText, Tag, DollarSign, UserPlus,
  Settings, BarChart3, Trophy, Menu, X, ChevronLeft, Globe
} from "lucide-react";
import logo from "@/assets/logo.svg";
import { cn } from "@/lib/utils";

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
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-border bg-card transition-all duration-200",
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
        <div className="p-4 border-t border-border">
          <Link to="/dashboard" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
            <ChevronLeft size={14} />
            {!collapsed && "Back to Dashboard"}
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className={cn("flex-1 transition-all duration-200", collapsed ? "ml-16" : "ml-60")}>
        <div className="p-6 md:p-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
