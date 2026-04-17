import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, User, Shield } from "lucide-react";
import logo from "@/assets/logo.svg";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const navLinks = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "For Clubs", href: "/club/signup", isRoute: true },
  { label: "Explore", href: "/explore", isRoute: true },
  { label: "Affiliate", href: "/affiliate", isRoute: true },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profileName, setProfileName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdmin = async (email: string) => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "admin_emails")
        .single();
      const list = data?.value
        ? data.value.split(",").map((e: string) => e.trim().toLowerCase())
        : ["ddemian6@gmail.com"];
      setIsAdmin(list.includes(email.toLowerCase()));
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const meta = session.user.user_metadata;
        setProfileName(meta?.full_name || session.user.email || "");
        checkAdmin(session.user.email || "");
      } else {
        setProfileName("");
        setIsAdmin(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const meta = session.user.user_metadata;
        setProfileName(meta?.full_name || session.user.email || "");
        checkAdmin(session.user.email || "");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center">
          <img src={logo} alt="Campometric" className="h-[54px]" />
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((l) =>
            (l as any).isRoute ? (
              <Link key={l.label} to={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {l.label}
              </Link>
            ) : (
              <a key={l.label} href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {l.label}
              </a>
            )
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
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard">
                  <User size={16} className="mr-1" />
                  {profileName.split(" ")[0] || "Dashboard"}
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut size={16} className="mr-1" /> Log out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Log in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/signup">Start free</Link>
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
          {navLinks.map((l) =>
            (l as any).isRoute ? (
              <Link key={l.label} to={l.href} onClick={() => setOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground">
                {l.label}
              </Link>
            ) : (
              <a key={l.label} href={l.href} onClick={() => setOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground">
                {l.label}
              </a>
            )
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
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/dashboard" onClick={() => setOpen(false)}>Dashboard</Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { handleLogout(); setOpen(false); }}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login" onClick={() => setOpen(false)}>Log in</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/signup" onClick={() => setOpen(false)}>Start free</Link>
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
