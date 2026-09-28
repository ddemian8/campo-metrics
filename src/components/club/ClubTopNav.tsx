import { Link, useNavigate } from "react-router-dom";
import { Home, LogOut } from "lucide-react";
import logo from "@/assets/logo.svg";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Props {
  userName?: string;
  userEmail?: string;
}

const ClubTopNav = ({ userName }: Props) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 h-[50px] border-b border-border bg-background/95 backdrop-blur-xl">
      <div className="h-full px-4 md:px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center" aria-label="Campometric home">
          <img src={logo} alt="Campometric" className="h-9" />
        </Link>

        <div className="flex items-center gap-1 md:gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <Home size={14} className="mr-1" /> Home
            </Link>
          </Button>
          {userName && (
            <span className="hidden sm:inline text-sm text-muted-foreground px-2">
              {userName}
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut size={14} className="mr-1" /> Log out
          </Button>
        </div>
      </div>
    </header>
  );
};

export default ClubTopNav;
