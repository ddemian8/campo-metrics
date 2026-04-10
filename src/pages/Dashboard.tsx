import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, LogOut } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      setProfile(data);
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const reportsRemaining = Math.max(0, 3 - (profile?.reports_used_this_month || 0));

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight">
            <span className="text-foreground">Campo</span>
            <span className="text-primary">metric</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {profile?.full_name || "Player"}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut size={16} className="mr-1" /> Log out
            </Button>
          </div>
        </div>
      </nav>

      <div className="container py-10 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome back, {profile?.full_name?.split(" ")[0] || "Player"}
        </h1>
        <p className="text-muted-foreground mb-8">Your performance dashboard</p>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Reports Used", value: `${profile?.reports_used_this_month || 0} / 3` },
            { label: "Plan", value: profile?.subscription_plan === "free" ? "Free" : "Pro" },
            { label: "Account", value: profile?.account_type || "free" },
            { label: "Reports Left", value: reportsRemaining },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Quick action */}
        <Button
          size="lg"
          className="bg-[hsl(157,68%,37%)] hover:bg-[hsl(157,68%,30%)] text-white"
          onClick={() => navigate("/analyze")}
        >
          <Plus size={18} className="mr-2" /> New Analysis
        </Button>
      </div>
    </div>
  );
};

export default Dashboard;
