import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, LogOut, ChevronRight, Crown, Settings, Trash2, PartyPopper } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import logo from "@/assets/logo.svg";
import { cn } from "@/lib/utils";
import { DataSourceBadge } from "@/components/DataSourceBadge";
import AffiliateDashboardSection from "@/components/AffiliateDashboardSection";
import { usePaddle } from "@/hooks/usePaddle";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [hasAffiliate, setHasAffiliate] = useState(false);
  const [deleteReportId, setDeleteReportId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [paymentBanner, setPaymentBanner] = useState<string | null>(null);
  const { openCheckout } = usePaddle();

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

        // Check affiliate
        const { data: aff } = await supabase
          .from("affiliate_profiles")
          .select("id")
          .eq("user_id", profileData.id)
          .maybeSingle();
        setHasAffiliate(!!aff);
      }

      setLoading(false);

      // Check payment success
      const paymentStatus = searchParams.get("payment");
      const planParam = searchParams.get("plan");
      if (paymentStatus === "success") {
        setPaymentBanner(planParam === "club" ? "Club" : "Player Pro");
        setSearchParams({}, { replace: true });
        setTimeout(() => setPaymentBanner(null), 10000);
      }
    };
    checkAuth();
  }, [navigate, searchParams, setSearchParams]);

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
  const canDelete = isPaid;

  const recalculatePlayerStats = async (playerId: string) => {
    try {
      const { data: pdfSessions } = await supabase
        .from("sessions").select("id, gps_data, session_type, input_method, session_date")
        .eq("player_id", playerId).eq("status", "completed").eq("input_method", "pdf_upload");
      const { data: allSessions } = await supabase
        .from("sessions").select("id, gps_data, session_type, input_method, session_date")
        .eq("player_id", playerId).eq("status", "completed");
      const { data: allReports } = await supabase
        .from("reports").select("id, ai_report, session_id").eq("player_id", playerId);

      const pdfList = pdfSessions || [];
      const allList = allSessions || [];
      const reportList = allReports || [];
      const totalSessions = allList.length;
      const pdfCount = allList.filter(s => s.input_method === "pdf_upload").length;
      const screenshotCount = allList.filter(s => s.input_method === "screenshot").length;
      const manualCount = allList.filter(s => s.input_method === "manual").length;
      const matchCount = allList.filter(s => s.session_type === "match").length;
      const trainingCount = allList.filter(s => s.session_type === "training").length;
      const lastDate = allList.length > 0
        ? allList.sort((a, b) => (b.session_date || "").localeCompare(a.session_date || ""))[0]?.session_date
        : null;

      const getAvg = (arr: any[], key: string) => {
        const vals = arr.map(s => { const g = s.gps_data as any; return g?.[key] ? parseFloat(g[key]) : null; }).filter((v): v is number => v !== null);
        return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      };
      const getMax = (arr: any[], key: string) => {
        const vals = arr.map(s => { const g = s.gps_data as any; return g?.[key] ? parseFloat(g[key]) : null; }).filter((v): v is number => v !== null);
        return vals.length > 0 ? Math.max(...vals) : null;
      };

      const pdfSessionIds = new Set(pdfList.map(s => s.id));
      const pdfReports = reportList.filter(r => pdfSessionIds.has(r.session_id));
      const cpiVals = pdfReports.map(r => { const ai = r.ai_report as any; return ai?.cpi ? parseFloat(ai.cpi) : null; }).filter((v): v is number => v !== null);
      const allCpis = reportList.map(r => { const ai = r.ai_report as any; return ai?.cpi ? parseFloat(ai.cpi) : null; }).filter((v): v is number => v !== null);

      const { data: prof } = await supabase.from("profiles").select("transfermarkt_url, current_club").eq("id", playerId).maybeSingle();
      let trust = 0;
      if (totalSessions > 0) trust += Math.min(40, Math.round((pdfCount / totalSessions) * 40));
      trust += Math.min(20, totalSessions);
      if (prof?.transfermarkt_url) trust += 20;
      if (prof?.current_club) trust += 20;

      await supabase.from("player_stats_aggregate").update({
        avg_distance_per90: getAvg(pdfList, "distance"), avg_sprint_distance_per90: getAvg(pdfList, "dist_sp_z5"),
        avg_hsr_per90: getAvg(pdfList, "hmld"), avg_top_speed: getAvg(pdfList, "max_sp"),
        avg_accelerations_per90: getAvg(pdfList, "acc_ev"), avg_decelerations_per90: getAvg(pdfList, "dec_ev"),
        avg_sprints_per90: getAvg(pdfList, "sp_ev"),
        avg_performance_score: cpiVals.length > 0 ? cpiVals.reduce((a, b) => a + b, 0) / cpiVals.length : null,
        best_top_speed: getMax(allList, "max_sp"), best_distance_single_match: getMax(allList, "distance"),
        best_sprint_distance_single: getMax(allList, "dist_sp_z5"),
        best_performance_score: allCpis.length > 0 ? Math.max(...allCpis) : null,
        total_sessions: totalSessions, total_matches: matchCount, total_trainings: trainingCount,
        pdf_session_count: pdfCount, screenshot_session_count: screenshotCount, manual_session_count: manualCount,
        trust_score: trust, last_session_date: lastDate, updated_at: new Date().toISOString(),
      }).eq("player_id", playerId);
    } catch (err) {
      console.error("recalculatePlayerStats error:", err);
    }
  };

  const handleDeleteReport = async () => {
    if (!deleteReportId || !profile) return;
    setDeleting(true);
    try {
      const report = reports.find(r => r.id === deleteReportId);
      await supabase.from("reports").delete().eq("id", deleteReportId);
      if (report?.session_id) {
        await supabase.from("sessions").delete().eq("id", report.session_id);
      }
      setReports(prev => prev.filter(r => r.id !== deleteReportId));
      // Recalculate stats so leaderboard updates immediately
      await recalculatePlayerStats(profile.id);
      toast.success("Report deleted — leaderboard updated");
    } catch (e) {
      toast.error("Failed to delete report");
    } finally {
      setDeleting(false);
      setDeleteReportId(null);
    }
  };
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
          <Link to="/" className="flex items-center">
            <img src={logo} alt="Campometric" className="h-[54px]" />
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

        {/* Payment success banner */}
        {paymentBanner && (
          <div className="rounded-xl border border-[#1D9E75]/30 bg-[#1D9E75]/10 p-5 mb-8 flex items-center gap-3">
            <PartyPopper className="h-6 w-6 text-[#1D9E75] shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                🎉 Welcome to {paymentBanner}! Your subscription is now active.
              </p>
              <p className="text-xs text-muted-foreground">
                Enjoy unlimited reports and all premium features.
              </p>
            </div>
            <button onClick={() => setPaymentBanner(null)} className="text-muted-foreground hover:text-foreground text-sm">✕</button>
          </div>
        )}

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
                  Want unlimited reports + Pro badge? Upgrade to Pro — €9/month (+ tax)
                </p>
                <Button
                  onClick={() => openCheckout("pro")}
                  className="bg-[#1D9E75] hover:bg-[#178a64] text-white font-semibold h-9 px-5 text-sm"
                >
                  Upgrade to Pro →
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Public profile link */}
        {profile?.username && (
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

                    {/* Delete / Arrow */}
                    <div className="flex items-center gap-1 shrink-0">
                      {canDelete ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteReportId(r.id); }}
                          className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                          title="Delete report"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="p-1.5 text-muted-foreground/30 cursor-not-allowed">
                                <Trash2 className="h-4 w-4" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent><p>Upgrade to Player Pro to manage your reports</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteReportId} onOpenChange={(open) => { if (!open) setDeleteReportId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this report?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this report? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteReport}
                className="bg-red-500 hover:bg-red-600"
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Affiliate section */}
        {hasAffiliate && profile && (
          <div className="mt-10 pt-8 border-t border-border">
            <AffiliateDashboardSection profileId={profile.id} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
