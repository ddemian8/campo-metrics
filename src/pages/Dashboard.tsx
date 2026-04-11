import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, LogOut, ChevronRight, Crown, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataSourceBadge } from "@/components/DataSourceBadge";

interface ReportRow {
  id: string;
  session_id: string;
  ai_report: any;
  is_public: boolean;
  created_at: string;
  sessions: {
    session_type: string;
    session_date: string;
    opponent: string | null;
    training_day: string | null;
    input_method: string | null;
  } | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      setProfile(profileData);

      if (profileData) {
        const { data: reportData } = await supabase
          .from("reports")
          .select("id, session_id, ai_report, is_public, created_at, sessions(session_type, session_date, opponent, training_day, input_method)")
          .eq("player_id", profileData.id)
          .order("created_at", { ascending: false })
          .limit(50);

        setReports((reportData as any) || []);
      }

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

  const isPaid = profile?.subscription_plan !== "free" || profile?.account_type !== "free";
  const reportsUsed = profile?.reports_used_this_month || 0;
  const reportsRemaining = Math.max(0, 3 - reportsUsed);
  const canGenerate = isPaid || reportsUsed < 3;

  // Get next reset date (1st of next month)
  const now = new Date();
  const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const resetDateStr = resetDate.toLocaleDateString("en-GB", { day: "numeric", month: "long" });

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
            <Button variant="ghost" size="sm" onClick={() => navigate("/settings")}>
              <Settings size={16} />
            </Button>
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
            { label: "Reports Used", value: isPaid ? "Unlimited" : `${reportsUsed} / 3` },
            { label: "Plan", value: isPaid ? "Pro" : "Free" },
            { label: "Total Reports", value: reports.length },
            { label: isPaid ? "Status" : "Reports Left", value: isPaid ? "Active" : reportsRemaining },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Limit warning for free users */}
        {!isPaid && reportsUsed >= 3 && (
          <div className="rounded-xl border border-primary/20 bg-[#0d2a4a] p-5 mb-8">
            <div className="flex items-start gap-3">
              <Crown className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground mb-1">
                  3 of 3 reports used this month. Resets on {resetDateStr}.
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Want unlimited reports + public profile? Upgrade to Pro — €9/month
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => navigate("/#pricing")}
                    className="bg-[#1D9E75] hover:bg-[#178a64] text-white font-semibold h-9 px-5 text-sm"
                  >
                    Upgrade to Pro →
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/#pricing")}
                  >
                    Generate reports without limits
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Public profile link */}
        {profile?.is_public && profile?.username && (
          <div className="mb-6">
            <Link
              to={`/player/${profile.username}`}
              className="text-sm text-[#1D9E75] hover:underline"
            >
              View your public profile →
            </Link>
          </div>
        )}

        {/* Quick action */}
        <Button
          size="lg"
          className="bg-[hsl(157,68%,37%)] hover:bg-[hsl(157,68%,30%)] text-white mb-10"
          onClick={() => navigate("/analyze")}
          disabled={!canGenerate}
        >
          <Plus size={18} className="mr-2" /> New Analysis
        </Button>

        {/* Past reports */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Past Reports</h2>
          {reports.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <p className="text-muted-foreground">No reports yet. Start your first analysis!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reports.map((r) => {
                const report = r.ai_report as any;
                const sess = r.sessions as any;
                const cpiScore = report?.cpi ?? report?.performanceScore;
                const sessionType = sess?.session_type;
                const sessionDate = sess?.session_date;
                const opponent = sess?.opponent;
                const trainingDay = sess?.training_day;
                const inputMethod = sess?.input_method;

                const scoreColor = cpiScore >= 75 ? "text-[#1D9E75]" : cpiScore >= 45 ? "text-amber-400" : "text-red-400";

                // Format date: "09 Apr 2026"
                const formattedDate = sessionDate
                  ? new Date(sessionDate + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                  : null;

                // Context line
                const contextLine = sessionType === "match"
                  ? `Match${opponent ? ` vs ${opponent}` : ""}`
                  : `Training${trainingDay && trainingDay !== "MD0" ? ` ${trainingDay}` : ""}`;

                return (
                  <button
                    key={r.id}
                    onClick={() => navigate(`/report/${r.session_id}`)}
                    className="w-full text-left rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-card/80 p-4 transition-colors flex items-center gap-4"
                  >
                    {/* CPI */}
                    <div className="shrink-0 w-14 text-center">
                      {cpiScore != null ? (
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">CPI</span>
                          <span className={cn("text-2xl font-bold", scoreColor)}>{cpiScore}</span>
                        </div>
                      ) : (
                        <span className="text-lg text-muted-foreground">—</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{contextLine}</p>
                        <DataSourceBadge inputMethod={inputMethod} />
                      </div>
                      {formattedDate && (
                        <p className="text-xs text-muted-foreground mt-0.5">{formattedDate}</p>
                      )}
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
