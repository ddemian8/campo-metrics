import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Upload, FileText, Users, Settings, LogOut } from "lucide-react";
import logo from "@/assets/logo.svg";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const links = [
  { to: "/club/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/club/dashboard/upload", label: "Upload Session", icon: Upload },
  { to: "/club/dashboard/sessions", label: "Sessions", icon: FileText },
  { to: "/club/dashboard/roster", label: "Roster", icon: Users },
  { to: "/club/dashboard/settings", label: "Settings", icon: Settings },
];

interface Props {
  clubName: string;
  clubLogo?: string | null;
}

const ClubSidebar = ({ clubName, clubLogo }: Props) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-card/40 backdrop-blur-xl flex flex-col h-[calc(100vh-50px)] sticky top-[50px]">
      <div className="p-6 border-b border-border">
        <img src={logo} alt="Campometric" className="h-10 mb-4" />
        <div className="flex items-center gap-3">
          {clubLogo ? (
            <img src={clubLogo} alt={clubName} className="h-10 w-10 rounded-full object-cover bg-muted" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold">
              {clubName?.charAt(0).toUpperCase() || "C"}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{clubName}</p>
            <p className="text-xs text-muted-foreground">Club workspace</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
        >
          <LogOut size={18} />
          Log out
        </button>
      </div>
    </aside>
  );
};

export default ClubSidebar;
