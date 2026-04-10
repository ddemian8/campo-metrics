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
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  performanceScore: number;
  keyMetrics: KeyMetric[];
  standoutStrength: { title: string; explanation: string };
  areaToImprove: { title: string; explanation: string };
  trainingRecommendation: { title: string; drill: string; duration: string; intensity: string };
  positionalContext: string;
  motivationalClose: string;
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
  transfermarkt_club?: string;
  transfermarkt_league?: string;
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

  useEffect(() => {
    if (!id) return;

    const fetchReport = async () => {
      try {
        // Try fetching from reports table via session_id
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
            session_type: sess?.session_type,
            training_day: sess?.training_day,
            session_date: sess?.session_date,
            opponent: sess?.opponent,
            gps_data: gps,
          });
          if (reportRow.ai_report) {
            setReport(reportRow.ai_report as unknown as ReportData);
          } else {
            setError("Report not yet generated.");
          }
        } else {
          // Fallback: try anonymous_sessions for legacy reports
          const { data: anonData } = await supabase
            .from("anonymous_sessions")
            .select("*")
            .eq("id", id)
            .maybeSingle();

          if (anonData) {
            const gps = (anonData.gps_data as GpsData) || {};
            setSession({
              id: anonData.id,
              player_name: anonData.player_name,
              position: anonData.position,
              session_type: anonData.session_type,
              training_day: anonData.training_day,
              session_date: anonData.session_date,
              opponent: anonData.opponent,
              gps_data: gps,
            });
            if (anonData.ai_report) {
              setReport(anonData.ai_report as unknown as ReportData);
            } else {
              setError("Report not yet generated.");
            }
          } else {
            setError("Report not found");
          }
        }

        // Get user plan info
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (authSession) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("subscription_plan, account_type, reports_used_this_month")
            .eq("user_id", authSession.user.id)
            .maybeSingle();
          if (profileData) {
            const isPaid = profileData.subscription_plan !== "free" || profileData.account_type !== "free";
            setUserPlan(isPaid ? "pro" : "free");
            setReportsUsed(profileData.reports_used_this_month || 0);
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

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-[#1db954]";
    if (score >= 50) return "text-amber-400";
    return "text-red-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 75) return "bg-[#1db954]/15 border-[#1db954]/30";
    if (score >= 50) return "bg-amber-400/15 border-amber-400/30";
    return "bg-red-400/15 border-red-400/30";
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
                <h2 className="text-xl font-bold text-foreground">{fullName}</h2>
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
            <div className="text-[12px] text-muted-foreground bg-secondary rounded-lg px-3 py-2 shrink-0">
              {sessionInfo}
            </div>
          </div>
        </div>

        {report ? (
          <>
            {/* Performance Score */}
            <div className="rounded-2xl border border-border/50 bg-card p-6 text-center">
              <div className={cn("inline-flex flex-col items-center justify-center w-24 h-24 rounded-full border-2 mb-4", getScoreBg(report.performanceScore))}>
                <span className={cn("text-4xl font-bold", getScoreColor(report.performanceScore))}>
                  {report.performanceScore}
                </span>
              </div>
              <p className={cn("text-sm font-medium mb-1", getScoreColor(report.performanceScore))}>
                {report.performanceScore >= 75 ? "Excellent Output" : report.performanceScore >= 50 ? "Solid Performance" : "Below Average"}
              </p>
              <p className="text-lg font-medium text-foreground mt-4">{report.headline}</p>
            </div>

            {/* Executive Summary */}
            <div className="rounded-2xl border border-border/50 bg-card p-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">Executive Summary</h3>
              <p className="text-sm text-muted-foreground leading-[1.8]">{report.executiveSummary}</p>
            </div>

            {/* Key Metrics */}
            <div className="rounded-2xl border border-border/50 bg-card p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Key Metrics</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {report.keyMetrics?.map((m) => {
                  const ratingColor = m.rating === "elite" ? "text-[#1db954]" : m.rating === "good" ? "text-primary" : m.rating === "average" ? "text-amber-400" : "text-red-400";
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
              <div className="rounded-2xl border border-border/50 bg-card p-5 border-l-[3px] border-l-[#1db954]">
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

            {/* Training Recommendation */}
            <div className="rounded-2xl border-l-[3px] border-l-primary bg-[#0d2a4a] p-5">
              <p className="text-[12px] font-semibold text-primary mb-2">{report.trainingRecommendation?.title}</p>
              <p className="text-sm text-[#a8c0e0] mb-1">{report.trainingRecommendation?.drill}</p>
              <p className="text-[11px] text-muted-foreground">
                {report.trainingRecommendation?.duration} · {report.trainingRecommendation?.intensity}
              </p>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-border/50 bg-card p-6 text-center">
            <p className="text-muted-foreground">Report data unavailable.</p>
          </div>
        )}

        {/* CTA Section — varies by plan */}
        {userPlan === "pro" ? (
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
            <p className="text-[11px] text-muted-foreground text-center">
              ✓ This report is public and visible to scouts on leaderboards
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button className="flex-1 h-11" onClick={() => window.print()}>
                <Download className="h-4 w-4 mr-2" /> Download PDF
              </Button>
              <Button variant="ghost" className="flex-1 h-11" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
              </Button>
            </div>
            <div className="rounded-xl bg-[#0d2a4a] border border-primary/20 p-4 text-center">
              <Crown className="h-5 w-5 text-primary mx-auto mb-2" />
              <p className="text-sm text-foreground font-medium mb-1">
                This report is private
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Upgrade to Player Pro to make it visible to scouts and appear on leaderboards.
              </p>
              <Button
                onClick={() => navigate("/#pricing")}
                className="bg-[#1D9E75] hover:bg-[#178a64] text-white font-semibold h-10 px-6"
              >
                Go Pro — €9/month →
              </Button>
              <p className="text-[11px] text-muted-foreground mt-3">
                {reportsUsed} of 3 free reports used this month
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Report;
