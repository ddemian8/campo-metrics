import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Loader2, Download, Share2, ChevronRight, ArrowLeft,
  Copy, AlertTriangle, Trash2, ChevronDown, Lightbulb, Info,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DataSourceBadge } from "@/components/DataSourceBadge";
import {
  getBenchmark, getCpiRatingKey, CPI_RATING_MAP, METRIC_EXPLANATIONS,
  getElitePercentage, getMetricRating,
} from "@/lib/benchmarks";

interface KeyMetric {
  label: string;
  value: string;
  per90: string;
  benchmark: string;
  rating: string;
}

interface StrengthDetail {
  metric: string;
  explanation: string;
  tip: string;
}

interface RawExtractedData {
  player_name_found?: string;
  duration_raw?: string;
  duration_minutes?: number;
  distance_meters?: number;
  distance_km?: number;
  accelerations?: number;
  decelerations?: number;
  hsr_meters?: number;
  sprint_distance_meters?: number;
  top_speed_kmh?: number;
  avg_speed_kmh?: number;
  sprint_events?: number;
  hmld_meters?: number;
}

interface ReportData {
  headline: string;
  executiveSummary: string;
  cpi?: number;
  performanceScore?: number;
  quick_summary?: string;
  keyMetrics: KeyMetric[];
  metric_ratings?: Record<string, string>;
  standoutStrength: { title: string; explanation: string };
  areaToImprove: { title: string; explanation: string };
  strength_details?: StrengthDetail[];
  improvement_details?: StrengthDetail[];
  percentile_estimate?: number;
  positionalContext: string;
  motivationalClose: string;
  dataFlags?: string[];
  raw_extracted_data?: RawExtractedData;
}

interface GpsData {
  first_name?: string;
  last_name?: string;
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

const ratingColorMap: Record<string, { text: string; bar: string; label: string; badge: string }> = {
  elite: { text: "text-purple-400", bar: "bg-purple-500", label: "Elite", badge: "bg-purple-500/20 text-purple-400" },
  excellent: { text: "text-[#1D9E75]", bar: "bg-[#1D9E75]", label: "Excellent", badge: "bg-[#1D9E75]/20 text-[#1D9E75]" },
  good: { text: "text-primary", bar: "bg-primary", label: "Good", badge: "bg-primary/20 text-primary" },
  average: { text: "text-yellow-400", bar: "bg-yellow-400", label: "Average", badge: "bg-yellow-400/20 text-yellow-400" },
  developing: { text: "text-orange-400", bar: "bg-orange-400", label: "Developing", badge: "bg-orange-400/20 text-orange-400" },
  above_average: { text: "text-[#1D9E75]", bar: "bg-[#1D9E75]", label: "Excellent", badge: "bg-[#1D9E75]/20 text-[#1D9E75]" },
  below_average: { text: "text-orange-400", bar: "bg-orange-400", label: "Developing", badge: "bg-orange-400/20 text-orange-400" },
  needs_improvement: { text: "text-orange-400", bar: "bg-orange-400", label: "Developing", badge: "bg-orange-400/20 text-orange-400" },
};

// Map metric labels to benchmark keys
const metricToBenchmarkKey: Record<string, string> = {
  "Total Distance": "distance",
  "High-Speed Running": "hsr",
  "Sprint Distance": "sprintDist",
  "Top Speed": "topSpeed",
  "Accelerations": "accelerations",
  "Decelerations": "decelerations",
  "HMLD": "hmld",
};

// Units for elite benchmarks display
const metricUnits: Record<string, string> = {
  "Total Distance": "km/90",
  "High-Speed Running": "m/90",
  "Sprint Distance": "m/90",
  "Top Speed": "km/h",
  "Accelerations": "/90",
  "Decelerations": "/90",
  "HMLD": "m/90",
};

function parseMetricValue(val: string): number | null {
  if (!val || val === "N/A") return null;
  const num = parseFloat(val.replace(/[^0-9.]/g, ""));
  return isNaN(num) ? null : num;
}

const AnimatedBar = ({ percentage, color, delay = 0 }: { percentage: number; color: string; delay?: number }) => {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(Math.min(100, percentage)), 100 + delay * 100);
    return () => clearTimeout(t);
  }, [percentage, delay]);

  return (
    <div className="h-2.5 bg-secondary rounded-full overflow-hidden relative">
      <div
        className={cn("h-full rounded-full transition-all duration-1000 ease-out", color)}
        style={{ width: `${width}%` }}
      />
    </div>
  );
};

// Recalculate player stats after report changes
async function recalculatePlayerStats(playerId: string) {
  try {
    // Get all remaining completed sessions for this player (PDF only for leaderboard)
    const { data: pdfSessions } = await supabase
      .from("sessions")
      .select("id, gps_data, session_type, input_method, session_date")
      .eq("player_id", playerId)
      .eq("status", "completed")
      .eq("input_method", "pdf_upload");

    const { data: allSessions } = await supabase
      .from("sessions")
      .select("id, gps_data, session_type, input_method, session_date")
      .eq("player_id", playerId)
      .eq("status", "completed");

    const { data: allReports } = await supabase
      .from("reports")
      .select("id, ai_report, session_id")
      .eq("player_id", playerId);

    // PDF sessions for leaderboard averages
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

    // Calculate averages from PDF sessions only
    const getAvg = (arr: any[], key: string) => {
      const vals = arr.map(s => {
        const gps = s.gps_data as any;
        return gps?.[key] ? parseFloat(gps[key]) : null;
      }).filter((v): v is number => v !== null);
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };

    const avgDistance = getAvg(pdfList, "distance");
    const avgSprintDist = getAvg(pdfList, "dist_sp_z5");
    const avgHsr = getAvg(pdfList, "hmld");
    const avgTopSpeed = getAvg(pdfList, "max_sp");
    const avgAccel = getAvg(pdfList, "acc_ev");
    const avgDecel = getAvg(pdfList, "dec_ev");
    const avgSprints = getAvg(pdfList, "sp_ev");

    // CPI averages from PDF reports
    const pdfSessionIds = new Set(pdfList.map(s => s.id));
    const pdfReports = reportList.filter(r => pdfSessionIds.has(r.session_id));
    const cpiVals = pdfReports.map(r => {
      const ai = r.ai_report as any;
      return ai?.cpi ? parseFloat(ai.cpi) : null;
    }).filter((v): v is number => v !== null);
    const avgPerf = cpiVals.length > 0 ? cpiVals.reduce((a, b) => a + b, 0) / cpiVals.length : null;

    // Best values from ALL sessions
    const getMax = (arr: any[], key: string) => {
      const vals = arr.map(s => {
        const gps = s.gps_data as any;
        return gps?.[key] ? parseFloat(gps[key]) : null;
      }).filter((v): v is number => v !== null);
      return vals.length > 0 ? Math.max(...vals) : null;
    };

    const bestTopSpeed = getMax(allList, "max_sp");
    const bestDistance = getMax(allList, "distance");
    const bestSprint = getMax(allList, "dist_sp_z5");

    // Best CPI from ALL reports
    const allCpis = reportList.map(r => {
      const ai = r.ai_report as any;
      return ai?.cpi ? parseFloat(ai.cpi) : null;
    }).filter((v): v is number => v !== null);
    const bestPerf = allCpis.length > 0 ? Math.max(...allCpis) : null;

    // Trust score
    const { data: profile } = await supabase
      .from("profiles")
      .select("transfermarkt_url, current_club")
      .eq("id", playerId)
      .maybeSingle();

    let trust = 0;
    if (totalSessions > 0) trust += Math.min(40, Math.round((pdfCount / totalSessions) * 40));
    trust += Math.min(20, totalSessions);
    if (profile?.transfermarkt_url) trust += 20;
    if (profile?.current_club) trust += 20;

    // Upsert stats
    const statsData = {
      player_id: playerId,
      avg_distance_per90: avgDistance,
      avg_sprint_distance_per90: avgSprintDist,
      avg_hsr_per90: avgHsr,
      avg_top_speed: avgTopSpeed,
      avg_accelerations_per90: avgAccel,
      avg_decelerations_per90: avgDecel,
      avg_sprints_per90: avgSprints,
      avg_performance_score: avgPerf,
      best_top_speed: bestTopSpeed,
      best_distance_single_match: bestDistance,
      best_sprint_distance_single: bestSprint,
      best_performance_score: bestPerf,
      total_sessions: totalSessions,
      total_matches: matchCount,
      total_trainings: trainingCount,
      pdf_session_count: pdfCount,
      screenshot_session_count: screenshotCount,
      manual_session_count: manualCount,
      trust_score: trust,
      last_session_date: lastDate,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("player_stats_aggregate")
      .update(statsData)
      .eq("player_id", playerId);

    if (error) console.error("Failed to recalculate stats:", error);
  } catch (err) {
    console.error("recalculatePlayerStats error:", err);
  }
}

const Report = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [reportsUsed, setReportsUsed] = useState(0);
  const [comparison, setComparison] = useState<ComparisonMetric[] | null>(null);
  const [comparisonInsufficient, setComparisonInsufficient] = useState(false);
  const [playerUsername, setPlayerUsername] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [posPlayerCount, setPosPlayerCount] = useState(0);
  const [showRawData, setShowRawData] = useState(false);

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
            competition: sess?.competition,
            minutes_played: sess?.minutes_played,
            gps_data: gps,
            player_id: reportRow.player_id,
            input_method: sess?.input_method || null,
          });
          setReportId(reportRow.id);

          if (reportRow.player_id) {
            const { data: playerProfile } = await supabase
              .from("profiles")
              .select("username")
              .eq("id", reportRow.player_id)
              .maybeSingle();
            if (playerProfile?.username) setPlayerUsername(playerProfile.username);
          }
          if (reportRow.ai_report) {
            setReport(reportRow.ai_report as unknown as ReportData);
          } else {
            setError("Report not yet generated.");
          }
        } else {
          setError("Report not found");
        }

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
      const { data: posProfiles } = await supabase
        .from("profiles")
        .select("id, position_specific")
        .eq("position_specific", posSpec);

      setPosPlayerCount(posProfiles?.length || 0);

      if (!posProfiles || posProfiles.length < 5) {
        setComparisonInsufficient(true);
        return;
      }

      const { data: peers } = await supabase
        .from("player_stats_aggregate")
        .select("player_id, avg_distance_per90, avg_top_speed, avg_sprint_distance_per90, avg_performance_score")
        .order("avg_performance_score", { ascending: false });

      if (!peers) return;

      const posIds = new Set(posProfiles.map(p => p.id));
      const filtered = peers.filter(p => posIds.has(p.player_id));

      if (filtered.length < 5) {
        setComparisonInsufficient(true);
        return;
      }

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
    if (!reportId || !id || !session?.player_id) return;
    setDeleting(true);
    try {
      const playerId = session.player_id;
      await supabase.from("reports").delete().eq("id", reportId);
      await supabase.from("sessions").delete().eq("id", id);
      // Recalculate stats so leaderboard updates immediately
      await recalculatePlayerStats(playerId);
      toast.success("Report deleted — leaderboard updated");
      navigate("/dashboard");
    } catch {
      toast.error("Failed to delete report");
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Report link copied to clipboard!");
  };

  const getCpiScore = (r: ReportData) => r.cpi ?? r.performanceScore ?? 0;

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
        <h1 className="text-2xl font-bold text-foreground mb-4">{error || "Report not found"}</h1>
        <Link to="/analyze"><Button variant="outline">← Try again</Button></Link>
      </div>
    );
  }

  const gps = session.gps_data || {};
  const fullName = session.player_name || `${gps.first_name || ""} ${gps.last_name || ""}`.trim() || "Unknown";
  const posSpecific = session.position_specific || gps.position_zone || "";
  const cpi = report ? getCpiScore(report) : 0;
  const ratingKey = getCpiRatingKey(cpi);
  const rating = CPI_RATING_MAP[ratingKey] || CPI_RATING_MAP.average;
  const benchmark = getBenchmark(posSpecific);

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
              <Button variant="ghost" size="sm">New session <ChevronRight className="h-4 w-4 ml-1" /></Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container max-w-3xl py-8 px-4 space-y-6">
        {/* 1. SESSION INFO CARD */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border/50 bg-card p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">📋</span>
            <h3 className="text-sm font-semibold text-foreground">Session Info</h3>
            <DataSourceBadge inputMethod={session.input_method} size="md" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Player</span>
              <p className="font-medium text-foreground">
                {playerUsername ? (
                  <Link to={`/player/${playerUsername}`} className="hover:underline">{fullName}</Link>
                ) : fullName}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Position</span>
              <p className="font-medium text-foreground">{posSpecific || session.position || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Type</span>
              <p className="font-medium text-foreground">{session.session_type === "match" ? "Match" : "Training"}{session.training_day ? ` · ${session.training_day}` : ""}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Date</span>
              <p className="font-medium text-foreground">{session.session_date || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Duration</span>
              <p className="font-medium text-foreground">{session.minutes_played ? `${session.minutes_played} min` : gps.duration || "—"}</p>
            </div>
            {session.opponent && (
              <div>
                <span className="text-muted-foreground text-xs">Opponent</span>
                <p className="font-medium text-foreground">vs {session.opponent}</p>
              </div>
            )}
            {session.competition && (
              <div>
                <span className="text-muted-foreground text-xs">Competition</span>
                <p className="font-medium text-foreground">{session.competition}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Non-PDF info */}
        {session.input_method && session.input_method !== 'pdf_upload' && (
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-start gap-3">
            <span className="text-lg shrink-0">💡</span>
            <p className="text-sm text-muted-foreground">
              This report was generated from {session.input_method === 'screenshot' ? 'a screenshot' : 'manual entry'}. To appear on the leaderboard, upload your GPS data as a PDF.
            </p>
          </div>
        )}

        {report ? (
          <>
            {/* 2. CPI HERO CARD */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-secondary/30 p-8 text-center relative overflow-hidden"
            >
              <div className={cn(
                "absolute inset-0 opacity-10 blur-3xl",
                ratingKey === "elite" ? "bg-purple-500" :
                ratingKey === "excellent" ? "bg-[#1D9E75]" :
                ratingKey === "good" ? "bg-primary" :
                ratingKey === "average" ? "bg-yellow-400" : "bg-orange-500"
              )} />

              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-4 relative">
                Your Performance Rating
              </p>

              {/* CPI Ring */}
              <div className="relative inline-flex items-center justify-center w-32 h-32 mb-4">
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
                  <motion.circle
                    cx="60" cy="60" r="52" fill="none"
                    strokeWidth="8" strokeLinecap="round"
                    stroke={
                      ratingKey === "elite" ? "#a855f7" :
                      ratingKey === "excellent" ? "#1D9E75" :
                      ratingKey === "good" ? "hsl(218, 92%, 57%)" :
                      ratingKey === "average" ? "#facc15" : "#f97316"
                    }
                    strokeDasharray={`${(cpi / 100) * 327} 327`}
                    initial={{ strokeDasharray: "0 327" }}
                    animate={{ strokeDasharray: `${(cpi / 100) * 327} 327` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </svg>
                <div className="relative flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">CPI</span>
                  <motion.span
                    className="text-5xl font-bold text-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    {cpi}
                  </motion.span>
                </div>
              </div>

              {/* Rating Label */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <span className={cn("inline-block px-4 py-1.5 rounded-full text-sm font-bold tracking-wide", rating.bg, rating.color)}>
                  {rating.label}
                </span>
                <p className="text-sm text-muted-foreground mt-3">{rating.description}</p>
              </motion.div>

              <p className="text-base font-medium text-foreground mt-4 relative">{report.headline}</p>

              {/* Percentile Bar */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="mt-6 max-w-md mx-auto relative"
              >
                {posPlayerCount >= 20 && report.percentile_estimate ? (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      You are better than <span className="text-foreground font-semibold">{report.percentile_estimate}%</span> of {posSpecific} players on Campometric
                    </p>
                    <div className="h-2.5 bg-secondary rounded-full overflow-hidden relative">
                      <motion.div
                        className={cn("h-full rounded-full", ratingKey === "elite" || ratingKey === "excellent" ? "bg-[#1D9E75]" : ratingKey === "good" ? "bg-primary" : "bg-orange-400")}
                        initial={{ width: 0 }}
                        animate={{ width: `${report.percentile_estimate}%` }}
                        transition={{ duration: 1.2, delay: 1.4 }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>0%</span><span>50%</span><span>100%</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Your CPI of <span className="text-foreground font-semibold">{cpi}</span> is <span className="font-semibold">{rating.label}</span> compared to elite {posSpecific || "player"} benchmarks
                  </p>
                )}
              </motion.div>
            </motion.div>

            {/* 3. QUICK SUMMARY */}
            {report.quick_summary && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-2xl border border-border/50 bg-card p-6"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-yellow-400" />
                  <h3 className="text-sm font-semibold text-foreground">In Simple Words</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{report.quick_summary}</p>
              </motion.div>
            )}

            {!report.quick_summary && (
              <div className="rounded-2xl border border-border/50 bg-card p-6">
                <h3 className="text-sm font-semibold text-foreground mb-3">Executive Summary</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{report.executiveSummary}</p>
              </div>
            )}

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

            {/* 4. KEY METRICS GRID */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-4"
            >
              <h3 className="text-sm font-semibold text-foreground">Key Metrics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {report.keyMetrics?.map((m, idx) => {
                  const metaInfo = METRIC_EXPLANATIONS[m.label];
                  const benchKey = metricToBenchmarkKey[m.label];
                  const eliteBenchVal = benchKey ? (benchmark as any)[benchKey] : null;
                  const unit = metricUnits[m.label] || "";

                  // Calculate percentage vs elite benchmark
                  const playerVal = parseMetricValue(m.per90 !== "N/A" ? m.per90 : m.value);
                  const elitePct = playerVal !== null && eliteBenchVal ? getElitePercentage(playerVal, eliteBenchVal) : 50;
                  const computedRating = playerVal !== null && eliteBenchVal ? getMetricRating(playerVal, eliteBenchVal) : (m.rating || "average");
                  const rConfig = ratingColorMap[computedRating] || ratingColorMap.average;

                  return (
                    <div key={m.label} className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{metaInfo?.icon || "📊"}</span>
                        <h4 className="text-sm font-semibold text-foreground">{m.label}</h4>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">YOUR VALUE</p>
                        <p className="text-2xl font-bold text-foreground">{m.per90 !== "N/A" ? m.per90 : m.value}</p>
                        {m.per90 !== "N/A" && m.value && m.value !== m.per90 && (
                          <p className="text-[11px] text-muted-foreground">Raw: {m.value}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <AnimatedBar percentage={Math.min(100, elitePct)} color={rConfig.bar} delay={idx} />
                        <div className="flex justify-between items-center">
                          <p className="text-[11px] text-muted-foreground">
                            {eliteBenchVal ? `Elite ${posSpecific || "benchmark"}: ${eliteBenchVal} ${unit}` : `Benchmark: ${m.benchmark}`}
                          </p>
                          <p className="text-[11px] font-medium" style={{ color: rConfig.text.replace("text-", "") }}>
                            {playerVal !== null && eliteBenchVal ? `${Math.round(elitePct)}%` : ""}
                          </p>
                        </div>
                      </div>

                      <span className={cn("inline-block text-xs font-semibold px-2 py-0.5 rounded-full", rConfig.badge)}>
                        {rConfig.label}
                      </span>

                      {metaInfo && (
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                            <Info className="h-3 w-3" />
                            <span>What this means</span>
                            <ChevronDown className="h-3 w-3" />
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{metaInfo.description}</p>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* 5. STRENGTHS */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h3 className="text-sm font-semibold text-foreground mb-3">💪 Your Strengths</h3>
              <div className="space-y-3">
                {report.strength_details && report.strength_details.length > 0 ? (
                  report.strength_details.map((s, i) => (
                    <div key={i} className="rounded-xl border border-border/50 bg-card p-4 border-l-[3px] border-l-[#1D9E75]">
                      <h4 className="text-sm font-semibold text-foreground mb-1">
                        {METRIC_EXPLANATIONS[s.metric]?.icon || "✅"} {s.metric}
                      </h4>
                      <p className="text-sm text-muted-foreground">{s.explanation}</p>
                      {s.tip && <p className="text-xs text-[#1D9E75] mt-1">{s.tip}</p>}
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-border/50 bg-card p-4 border-l-[3px] border-l-[#1D9E75]">
                    <h4 className="text-sm font-semibold text-foreground mb-1">{report.standoutStrength?.title}</h4>
                    <p className="text-sm text-muted-foreground">{report.standoutStrength?.explanation}</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* 6. AREAS TO GROW */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <h3 className="text-sm font-semibold text-foreground mb-3">📈 Areas to Grow</h3>
              <div className="space-y-3">
                {report.improvement_details && report.improvement_details.length > 0 ? (
                  report.improvement_details.map((s, i) => (
                    <div key={i} className="rounded-xl border border-border/50 bg-card p-4 border-l-[3px] border-l-amber-400">
                      <h4 className="text-sm font-semibold text-foreground mb-1">
                        {METRIC_EXPLANATIONS[s.metric]?.icon || "📈"} {s.metric}
                      </h4>
                      <p className="text-sm text-muted-foreground">{s.explanation}</p>
                      {s.tip && <p className="text-xs text-amber-400 mt-1">💡 {s.tip}</p>}
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-border/50 bg-card p-4 border-l-[3px] border-l-amber-400">
                    <h4 className="text-sm font-semibold text-foreground mb-1">{report.areaToImprove?.title}</h4>
                    <p className="text-sm text-muted-foreground">{report.areaToImprove?.explanation}</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* 7. HOW YOU COMPARE */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="rounded-2xl border border-border/50 bg-card p-6 relative overflow-hidden"
            >
              <h3 className="text-sm font-semibold text-foreground mb-1">How You Compare</h3>
              <p className="text-xs text-muted-foreground mb-4">Your position among Campometric players</p>

              {comparisonInsufficient ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-3">
                    Not enough players with your position yet. Invite teammates to see how you compare!
                  </p>
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(window.location.origin); toast.success("Link copied!"); }}>
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
                  <p className="text-sm text-muted-foreground">Not enough players with your position yet.</p>
                </div>
              )}
            </motion.div>

            {/* 8. RAW GPS DATA EXTRACTED */}
            {report.raw_extracted_data && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <Collapsible open={showRawData} onOpenChange={setShowRawData}>
                  <CollapsibleTrigger className="w-full rounded-xl border border-border/50 bg-card p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <span>📊</span>
                      <h3 className="text-sm font-semibold text-foreground">Raw GPS Data Extracted</h3>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showRawData && "rotate-180")} />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="rounded-xl border border-border/50 border-t-0 rounded-t-none bg-card p-4 space-y-3">
                      {report.raw_extracted_data.player_name_found && (
                        <p className="text-xs text-muted-foreground">
                          Player matched: <span className="text-foreground font-medium">{report.raw_extracted_data.player_name_found}</span>
                        </p>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                        {report.raw_extracted_data.duration_raw != null && (
                          <div>
                            <p className="text-[11px] text-muted-foreground">Duration</p>
                            <p className="font-medium text-foreground">{report.raw_extracted_data.duration_raw} ({report.raw_extracted_data.duration_minutes?.toFixed(1)} min)</p>
                          </div>
                        )}
                        {report.raw_extracted_data.distance_km != null && (
                          <div>
                            <p className="text-[11px] text-muted-foreground">Distance</p>
                            <p className="font-medium text-foreground">{report.raw_extracted_data.distance_km?.toFixed(2)} km ({report.raw_extracted_data.distance_meters?.toFixed(0)} m)</p>
                          </div>
                        )}
                        {report.raw_extracted_data.top_speed_kmh != null && (
                          <div>
                            <p className="text-[11px] text-muted-foreground">Top Speed</p>
                            <p className="font-medium text-foreground">{report.raw_extracted_data.top_speed_kmh} km/h</p>
                          </div>
                        )}
                        {report.raw_extracted_data.hsr_meters != null && (
                          <div>
                            <p className="text-[11px] text-muted-foreground">HSR (Z4+)</p>
                            <p className="font-medium text-foreground">{report.raw_extracted_data.hsr_meters?.toFixed(1)} m</p>
                          </div>
                        )}
                        {report.raw_extracted_data.sprint_distance_meters != null && (
                          <div>
                            <p className="text-[11px] text-muted-foreground">Sprint Distance (Z5)</p>
                            <p className="font-medium text-foreground">{report.raw_extracted_data.sprint_distance_meters?.toFixed(1)} m</p>
                          </div>
                        )}
                        {report.raw_extracted_data.accelerations != null && (
                          <div>
                            <p className="text-[11px] text-muted-foreground">Accelerations</p>
                            <p className="font-medium text-foreground">{report.raw_extracted_data.accelerations}</p>
                          </div>
                        )}
                        {report.raw_extracted_data.decelerations != null && (
                          <div>
                            <p className="text-[11px] text-muted-foreground">Decelerations</p>
                            <p className="font-medium text-foreground">{report.raw_extracted_data.decelerations}</p>
                          </div>
                        )}
                        {report.raw_extracted_data.avg_speed_kmh != null && (
                          <div>
                            <p className="text-[11px] text-muted-foreground">Avg Speed</p>
                            <p className="font-medium text-foreground">{report.raw_extracted_data.avg_speed_kmh} km/h</p>
                          </div>
                        )}
                        {report.raw_extracted_data.sprint_events != null && (
                          <div>
                            <p className="text-[11px] text-muted-foreground">Sprint Events</p>
                            <p className="font-medium text-foreground">{report.raw_extracted_data.sprint_events}</p>
                          </div>
                        )}
                        {report.raw_extracted_data.hmld_meters != null && (
                          <div>
                            <p className="text-[11px] text-muted-foreground">HMLD</p>
                            <p className="font-medium text-foreground">{report.raw_extracted_data.hmld_meters?.toFixed(1)} m</p>
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground/70 mt-2">
                        Something doesn't look right? Make sure your name on Campometric matches your name in your team's GPS system. Contact campometric@gmail.com for help.
                      </p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </motion.div>
            )}

            {/* 9. MOTIVATIONAL CLOSE */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="rounded-xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 p-5 text-center"
            >
              <p className="text-base font-medium text-foreground italic">"{report.motivationalClose}"</p>
            </motion.div>
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
            <Button variant="outline" className="flex-1 h-11" onClick={handleShare}>
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
            )}
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

        <p className="text-center text-[10px] text-muted-foreground/50 pb-4">
          Powered by Campometric AI
        </p>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this report?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this report? This action cannot be undone. Your leaderboard stats will be recalculated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReport}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Report;
