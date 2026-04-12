import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Download,
  Share2,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  Crown,
  Copy,
  AlertTriangle,
  Trash2,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import { DataSourceBadge } from "@/components/DataSourceBadge";

interface KeyMetric {
  label: string;
  value: string;
  per90: string;
  benchmark: string;
  rating: "elite" | "good" | "average" | "below";
}

interface ReportData {
  headline: string;
  executiveSummary: string;
  cpi?: number;
  performanceScore?: number; // legacy fallback
  keyMetrics: KeyMetric[];
  standoutStrength: { title: string; explanation: string };
  areaToImprove: { title: string; explanation: string };
  positionalContext: string;
  motivationalClose: string;
  dataFlags?: string[];
}

interface GpsData {
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  age_calculated?: number;
  height_cm?: number;
  weight_kg?: number;
  team_name?: string;
  league?: string;
  country?: string;
  transfermarkt_url?: string;
  position_zone?: string;
  duration?: string;
  distance?: number;
  max_sp?: number;
  av_sp?: number;
  sp_ev?: number;
  hmld?: number;
  acc_ev?: number;
  dec_ev?: number;
  dist_sp_z4?: number;
  dist_sp_z4plus?: number;
  dist_sp_z5?: number;
}

interface ComparisonMetric {
  label: string;
  playerValue: string;
  rank: number;
  total: number;
  position: string;
  percentile: number;
}

const positionColors: Record<string, string> = {
  GK: "bg-muted text-muted-foreground",
  DEF: "bg-primary/20 text-primary",
  MID: "bg-[#0d3320] text-[#1db954]",
  FWD: "bg-red-500/20 text-red-400",
};

const Report = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [reportsUsed, setReportsUsed] = useState(0);
  const [isPublic, setIsPublic] = useState(false);
  const [comparison, setComparison] = useState<ComparisonMetric[] | null>(null);
  const [comparisonInsufficient, setComparisonInsufficient] = useState(false);
  const [playerUsername, setPlayerUsername] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchReport = async () => {
      try {
        const { data: reportRow } = await supabase
          .from("reports")
          .select("*, sessions(*)")
          .eq("session_id", id)
          .maybeSingle();

        if (reportRow) {
          const sess = reportRow.sessions as any;
          const gps = (sess?.gps_data as GpsData) || {};
          setSession({
            id: sess?.id,
            player_name: `${gps.first_name || ""} ${gps.last_name || ""}`.trim() || null,
            position: gps.position_zone || sess?.position_specific || null,
            position_specific: sess?.position_specific || gps.position_zone || null,
            session_type: sess?.session_type,
            training_day: sess?.training_day,
            session_date: sess?.session_date,
            opponent: sess?.opponent,
            gps_data: gps,
            player_id: reportRow.player_id,
            input_method: sess?.input_method || null,
          });
          setIsPublic(reportRow.is_public);
          setReportId(reportRow.id);

          // Fetch player username for public profile link
          if (reportRow.player_id) {
            const { data: playerProfile } = await supabase
              .from("profiles")
              .select("username")
              .eq("id", reportRow.player_id)
              .maybeSingle();
            if (playerProfile?.username) {
              setPlayerUsername(playerProfile.username);
            }
          }
          if (reportRow.ai_report) {
            setReport(reportRow.ai_report as unknown as ReportData);
          } else {
            setError("Report not yet generated.");
          }
        } else {
          setError("Report not found");
        }

        // Get user plan info
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (authSession) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("subscription_plan, account_type, reports_used_this_month, position_specific, id")
            .eq("user_id", authSession.user.id)
            .maybeSingle();
          if (profileData) {
            const isPaid = profileData.subscription_plan !== "free" || profileData.account_type !== "free";
            setUserPlan(isPaid ? "pro" : "free");
            setReportsUsed(profileData.reports_used_this_month || 0);

            // Fetch comparison data for all users
            if (profileData.position_specific) {
              await fetchComparison(profileData.position_specific, reportRow?.player_id);
            }
          }
        }
      } catch (e) {
        console.error("Report error:", e);
        setError("Something went wrong loading your report.");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [id]);

  const fetchComparison = async (posSpec: string, playerId?: string) => {
    try {
      // Get all public players with same position_specific
      const { data: peers } = await supabase
        .from("player_stats_aggregate")
        .select("player_id, avg_distance_per90, avg_top_speed, avg_sprint_distance_per90, avg_performance_score")
        .order("avg_performance_score", { ascending: false });

      if (!peers) return;

      // Filter to same position by joining with profiles
      const { data: posProfiles } = await supabase
        .from("profiles")
        .select("id, position_specific")
        .eq("position_specific", posSpec);

      if (!posProfiles || posProfiles.length < 5) {
        setComparisonInsufficient(true);
        return;
      }

      const posIds = new Set(posProfiles.map(p => p.id));
      const filtered = peers.filter(p => posIds.has(p.player_id));

      if (filtered.length < 5) {
        setComparisonInsufficient(true);
        return;
      }

      // Build comparison metrics from current report
      // We'll use player_stats_aggregate for ranking
      const myStats = filtered.find(p => p.player_id === playerId);
      const total = filtered.length;

      const metrics: ComparisonMetric[] = [];

      const rankBy = (arr: typeof filtered, key: string, label: string, val: string) => {
        const sorted = [...arr].sort((a, b) => ((b as any)[key] || 0) - ((a as any)[key] || 0));
        const idx = sorted.findIndex(p => p.player_id === playerId);
        const rank = idx >= 0 ? idx + 1 : total;
        metrics.push({ label, playerValue: val, rank, total, position: posSpec, percentile: Math.round(((total - rank) / total) * 100) });
      };

      if (myStats) {
        rankBy(filtered, "avg_distance_per90", "Distance/90", myStats.avg_distance_per90 ? `${Math.round(myStats.avg_distance_per90).toLocaleString()} m/90` : "N/A");
        rankBy(filtered, "avg_top_speed", "Top Speed", myStats.avg_top_speed ? `${myStats.avg_top_speed.toFixed(1)} km/h` : "N/A");
        rankBy(filtered, "avg_sprint_distance_per90", "Sprint Distance/90", myStats.avg_sprint_distance_per90 ? `${Math.round(myStats.avg_sprint_distance_per90)} m/90` : "N/A");
        rankBy(filtered, "avg_performance_score", "CPI Score", myStats.avg_performance_score ? `Avg: ${Math.round(myStats.avg_performance_score)}` : "N/A");
        setComparison(metrics);
      }
    } catch (err) {
      console.error("Comparison fetch error:", err);
    }
  };

  const handleDeleteReport = async () => {
    if (!reportId || !id) return;
    setDeleting(true);
    try {
      await supabase.from("reports").delete().eq("id", reportId);
      await supabase.from("sessions").delete().eq("id", id);
      toast.success("Report deleted");
      navigate("/dashboard");
    } catch {
      toast.error("Failed to delete report");
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const getCpiScore = (r: ReportData) => r.cpi ?? r.performanceScore ?? 0;

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-[#1D9E75]";
    if (score >= 45) return "text-amber-400";
    return "text-red-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 75) return "bg-[#1D9E75]/15 border-[#1D9E75]/30";
    if (score >= 45) return "bg-amber-400/15 border-amber-400/30";
    return "bg-red-400/15 border-red-400/30";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Elite";
    if (score >= 75) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 45) return "Average";
    if (score >= 30) return "Below Average";
    return "Needs Improvement";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <span className="text-2xl font-bold tracking-tight mb-8">
          <span className="text-foreground">Campo</span>
          <span className="text-primary">metric</span>
        </span>
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading your report...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
        <span className="text-2xl font-bold tracking-tight mb-8">
          <span className="text-foreground">Campo</span>
          <span className="text-primary">metric</span>
        </span>
        <h1 className="text-2xl font-bold text-foreground mb-4">
          {error || "Report not found"}
        </h1>
        <Link to="/analyze">
          <Button variant="outline">← Try again</Button>
        </Link>
      </div>
    );
  }

  const gps = session.gps_data || {};
  const fullName = session.player_name || `${gps.first_name || ""} ${gps.last_name || ""}`.trim() || "Unknown";
  const nameParts = fullName.split(" ");
  const initials = `${nameParts[0]?.[0] || ""}${nameParts[nameParts.length - 1]?.[0] || ""}`.toUpperCase();
  const sessionInfo = [
    session.session_type === "match" ? "Match" : "Training",
    session.training_day,
    session.session_date,
    session.opponent ? `vs ${session.opponent}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const cpi = report ? getCpiScore(report) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 py-4 px-4">
        <div className="container flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight">
            <span className="text-foreground">Campo</span>
            <span className="text-primary">metric</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
            <Link to="/analyze">
              <Button variant="ghost" size="sm">
                New session <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container max-w-3xl py-8 px-4 space-y-6">
        {/* Player Profile Card */}
        <div className="rounded-2xl border border-border/50 bg-card p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-primary">{initials}</span>
              </div>
              <div>
                {playerUsername ? (
                  <Link to={`/player/${playerUsername}`} className="hover:underline">
                    <h2 className="text-xl font-bold text-foreground">{fullName}</h2>
                  </Link>
                ) : (
                  <h2 className="text-xl font-bold text-foreground">{fullName}</h2>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {session.position && (
                    <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", positionColors[session.position] || "bg-muted text-muted-foreground")}>
                      {session.position === "GK" ? "Goalkeeper" : session.position === "DEF" ? "Defender" : session.position === "MID" ? "Midfielder" : "Forward"}
                    </span>
                  )}
                  <span className="text-[13px] text-muted-foreground">
                    {[
                      gps.age_calculated ? `${gps.age_calculated} years` : null,
                      gps.height_cm ? `${gps.height_cm} cm` : null,
                      gps.weight_kg ? `${gps.weight_kg} kg` : null,
                    ].filter(Boolean).join(" · ")}
                  </span>
                </div>
                {(gps.team_name || gps.league) && (
                  <p className="text-[13px] text-muted-foreground mt-0.5">
                    {[gps.team_name, gps.league].filter(Boolean).join(" · ")}
                  </p>
                )}
                {gps.transfermarkt_url && (
                  <a
                    href={gps.transfermarkt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] text-primary hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    View on Transfermarkt <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-[12px] text-muted-foreground bg-secondary rounded-lg px-3 py-2 shrink-0">
                {sessionInfo}
              </div>
              <DataSourceBadge inputMethod={session.input_method} size="md" />
            </div>
          </div>
        </div>

        {/* Non-PDF data source info */}
        {session.input_method && session.input_method !== 'pdf_upload' && (
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-start gap-3">
            <span className="text-lg shrink-0">💡</span>
            <p className="text-sm text-muted-foreground">
              This report was generated from {session.input_method === 'screenshot' ? 'a screenshot' : 'manual entry'}. To appear on the Campometric leaderboard, upload your GPS data as a PDF from your tracking platform (STATSports, Catapult, gpexe, etc.)
            </p>
          </div>
        )}

        {report ? (
          <>
            {/* CPI Score */}
            <div className="rounded-2xl border border-border/50 bg-card p-6 text-center">
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-3">Campometric Performance Index</p>
              <div className={cn("inline-flex flex-col items-center justify-center w-24 h-24 rounded-full border-2 mb-4", getScoreBg(cpi))}>
                <span className={cn("text-4xl font-bold", getScoreColor(cpi))}>
                  {cpi}
                </span>
              </div>
              <p className={cn("text-sm font-medium mb-1", getScoreColor(cpi))}>
                {getScoreLabel(cpi)}
              </p>
              <p className="text-lg font-medium text-foreground mt-4">{report.headline}</p>
            </div>

            {/* Executive Summary */}
            <div className="rounded-2xl border border-border/50 bg-card p-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">Executive Summary</h3>
              <p className="text-sm text-muted-foreground leading-[1.8]">{report.executiveSummary}</p>
            </div>

            {/* Data Flags */}
            {report.dataFlags && report.dataFlags.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                {report.dataFlags.map((flag, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-300">{flag}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Key Metrics */}
            <div className="rounded-2xl border border-border/50 bg-card p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Key Metrics</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {report.keyMetrics?.map((m) => {
                  const ratingColor = m.rating === "elite" ? "text-[#1D9E75]" : m.rating === "good" ? "text-primary" : m.rating === "average" ? "text-amber-400" : "text-red-400";
                  return (
                    <div key={m.label} className="rounded-lg bg-secondary p-3">
                      <p className="text-[11px] text-muted-foreground">{m.label}</p>
                      <p className="text-xl font-bold text-foreground">{m.value}</p>
                      {m.per90 !== "N/A" && <p className="text-[10px] text-muted-foreground">Per 90: {m.per90}</p>}
                      <p className="text-[10px] text-muted-foreground">Benchmark: {m.benchmark}</p>
                      <span className={cn("text-[10px] font-semibold uppercase", ratingColor)}>{m.rating}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Strengths & Improvements */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border/50 bg-card p-5 border-l-[3px] border-l-[#1D9E75]">
                <h3 className="text-sm font-semibold text-foreground mb-2">{report.standoutStrength?.title}</h3>
                <p className="text-sm text-muted-foreground">{report.standoutStrength?.explanation}</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-card p-5 border-l-[3px] border-l-amber-400">
                <h3 className="text-sm font-semibold text-foreground mb-2">{report.areaToImprove?.title}</h3>
                <p className="text-sm text-muted-foreground">{report.areaToImprove?.explanation}</p>
              </div>
            </div>

            {/* Positional Context & Motivational Close */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg bg-secondary p-4">
                <p className="text-[11px] text-muted-foreground mb-1">positional context</p>
                <p className="text-sm text-foreground font-medium">{report.positionalContext}</p>
              </div>
              <div className="rounded-lg bg-secondary p-4">
                <p className="text-[11px] text-muted-foreground mb-1">motivational close</p>
                <p className="text-sm text-foreground font-medium italic">{report.motivationalClose}</p>
              </div>
            </div>

            {/* How You Compare — visible to ALL users */}
            <div className="rounded-2xl border border-border/50 bg-card p-6 relative overflow-hidden">
              <h3 className="text-sm font-semibold text-foreground mb-1">How You Compare</h3>
              <p className="text-xs text-muted-foreground mb-4">Your position among Campometric players</p>

              {comparisonInsufficient ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-3">
                    Not enough players with your position yet. Invite teammates to see how you compare!
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.origin);
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" /> Share Campometric
                  </Button>
                </div>
              ) : comparison && comparison.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {comparison.map(m => (
                    <div key={m.label} className="rounded-lg bg-secondary p-4">
                      <p className="text-[11px] text-muted-foreground">{m.label}</p>
                      <p className="text-lg font-bold text-foreground">{m.playerValue}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Rank: #{m.rank} of {m.total} {m.position}s
                      </p>
                      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", m.percentile >= 75 ? "bg-[#1D9E75]" : m.percentile >= 45 ? "bg-amber-400" : "bg-red-400")}
                          style={{ width: `${m.percentile}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">
                    Not enough players with your position yet. Invite teammates to see how you compare!
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => navigator.clipboard.writeText(window.location.origin)}
                  >
                    <Copy className="h-4 w-4 mr-2" /> Share Campometric
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-border/50 bg-card p-6 text-center">
            <p className="text-muted-foreground">Report data unavailable.</p>
          </div>
        )}

        {/* CTA Section */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button className="flex-1 h-11" onClick={() => window.print()}>
              <Download className="h-4 w-4 mr-2" /> Download PDF
            </Button>
            <Button variant="outline" className="flex-1 h-11">
              <Share2 className="h-4 w-4 mr-2" /> Share report
            </Button>
            <Button variant="ghost" className="flex-1 h-11" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
            </Button>
          </div>
          <div className="flex justify-center">
            {userPlan !== "free" ? (
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="text-xs text-red-400 hover:text-red-300 hover:underline inline-flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" /> Delete report
              </button>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground/40 cursor-not-allowed inline-flex items-center gap-1">
                      <Trash2 className="h-3 w-3" /> Delete report
                    </span>
                  </TooltipTrigger>
                  <TooltipContent><p>Upgrade to Player Pro to manage your reports</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
            }
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            ✓ This report is visible on your public profile
          </p>
          {userPlan === "free" && (
            <p className="text-[11px] text-muted-foreground text-center">
              {reportsUsed} of 3 free reports used this month ·{" "}
              <button onClick={() => navigate("/#pricing")} className="text-primary hover:underline">Upgrade to Pro for unlimited</button>
            </p>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
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
    </div>
  );
};

export default Report;
