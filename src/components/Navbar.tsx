import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, User, Upload, Users, LayoutDashboard } from "lucide-react";
import logo from "@/assets/logo.svg";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const guestLinks = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [hasClub, setHasClub] = useState(false);
  const [profileName, setProfileName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async (session: any) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setProfileName(""); setProfileId(null); setHasClub(false);
        return;
      }
      const meta = session.user.user_metadata;
      setProfileName(meta?.full_name || session.user.email || "");
      const { data: prof } = await supabase
        .from("profiles").select("id").eq("user_id", session.user.id).maybeSingle();
      if (prof?.id) {
        setProfileId(prof.id);
        const { data: club } = await supabase
          .from("clubs").select("id").eq("admin_id", prof.id).maybeSingle();
        setHasClub(!!club);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUser(session);
    });
    supabase.auth.getSession().then(({ data: { session } }) => loadUser(session));

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleDashboardClick = () => {
    navigate(hasClub ? "/club/dashboard" : "/club/signup");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center">
          <img src={logo} alt="Campometric" className="h-[54px]" />
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          {user ? (
            <>
              <Link to="/club/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                <LayoutDashboard size={14} /> Dashboard
              </Link>
              <Link to="/club/dashboard/upload" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                <Upload size={14} /> Upload Session
              </Link>
              <Link to="/club/dashboard/roster" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                <Users size={14} /> Roster
              </Link>
            </>
          ) : (
            guestLinks.map((l) => (
              <a key={l.label} href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {l.label}
              </a>
            ))
          )}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              {isAdmin && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin">
                    <Shield size={16} className="mr-1" />
                    Admin
                  </Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleDashboardClick}>
                <User size={16} className="mr-1" />
                {profileName.split(" ")[0] || "Account"}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut size={16} className="mr-1" /> Log out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/club/signup">Start Free Trial →</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border bg-background px-6 pb-6 pt-4 space-y-4">
          {user ? (
            <>
              <Link to="/club/dashboard" onClick={() => setOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground">Dashboard</Link>
              <Link to="/club/dashboard/upload" onClick={() => setOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground">Upload Session</Link>
              <Link to="/club/dashboard/roster" onClick={() => setOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground">Roster</Link>
            </>
          ) : (
            guestLinks.map((l) => (
              <a key={l.label} href={l.href} onClick={() => setOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground">
                {l.label}
              </a>
            ))
          )}
          <div className="flex flex-col gap-3 pt-2">
            {user ? (
              <>
                {isAdmin && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/admin" onClick={() => setOpen(false)}>
                      <Shield size={16} className="mr-1" /> Admin
                    </Link>
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => { handleDashboardClick(); setOpen(false); }}>
                  {profileName.split(" ")[0] || "Account"}
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/settings" onClick={() => setOpen(false)}>Settings</Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { handleLogout(); setOpen(false); }}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login" onClick={() => setOpen(false)}>Login</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/club/signup" onClick={() => setOpen(false)}>Start Free Trial →</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
