import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Loader2,
  Download,
  Share2,
  User,
  ArrowRight,
  ExternalLink,
  X,
  ChevronRight,
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

interface SessionData {
  id: string;
  player_name: string | null;
  position: string | null;
  session_type: string | null;
  training_day: string | null;
  session_date: string | null;
  opponent: string | null;
  gps_data: GpsData | null;
}

const positionColors: Record<string, string> = {
  GK: "bg-muted text-muted-foreground",
  DEF: "bg-primary/20 text-primary",
  MID: "bg-[#0d3320] text-[#1db954]",
  FWD: "bg-red-500/20 text-red-400",
};

const Report = () => {
  const { id } = useParams();
  const [session, setSession] = useState<SessionData | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSignup, setShowSignup] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupTerms, setSignupTerms] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [signupError, setSignupError] = useState("");
  const [isLogin, setIsLogin] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchAndGenerate = async () => {
      try {
        // Fetch session data
        const { data: sessionData, error: fetchError } = await supabase
          .from("anonymous_sessions")
          .select("*")
          .eq("id", id)
          .single();

        if (fetchError || !sessionData) {
          setError("Session not found");
          setLoading(false);
          return;
        }

        const gps = (sessionData.gps_data as GpsData) || {};
        const mapped: SessionData = {
          id: sessionData.id,
          player_name: sessionData.player_name,
          position: sessionData.position,
          session_type: sessionData.session_type,
          training_day: sessionData.training_day,
          session_date: sessionData.session_date,
          opponent: sessionData.opponent,
          gps_data: gps,
        };
        setSession(mapped);

        // Generate AI report
        const { data: reportResult, error: reportError } =
          await supabase.functions.invoke("generate-report", {
            body: {
              playerData: {
                fullName: sessionData.player_name || `${gps.first_name || ''} ${gps.last_name || ''}`.trim(),
                age: gps.age_calculated || "unknown",
                height: gps.height_cm || "unknown",
                weight: gps.weight_kg || null,
                position: sessionData.position || "unknown",
                teamName: gps.team_name || "unknown",
                league: gps.league || "unknown",
                sessionType: sessionData.session_type || "match",
                mdDay: sessionData.training_day || "MD0",
                sessionDate: sessionData.session_date || "unknown",
                duration: gps.duration || "",
                distance: gps.distance || "",
                maxSpeed: gps.max_sp || "",
                avSpeed: gps.av_sp || "",
                spEv: gps.sp_ev || "",
                hmld: gps.hmld || "",
                distSpZ4: gps.dist_sp_z4 || "",
                distSpZ4Plus: gps.dist_sp_z4plus || "",
                distSpZ5: gps.dist_sp_z5 || "",
                accEv: gps.acc_ev || "",
                decEv: gps.dec_ev || "",
              },
            },
          });

        if (reportError || !reportResult?.success) {
          setError("Failed to generate report. Please try again.");
          setLoading(false);
          return;
        }

        setReport(reportResult.report);
      } catch (e) {
        console.error("Report error:", e);
        setError("Something went wrong generating your report.");
      } finally {
        setLoading(false);
      }
    };

    fetchAndGenerate();
  }, [id]);

  const handleAuth = async () => {
    if (!signupEmail || !signupPassword) {
      setSignupError("Please fill in all fields");
      return;
    }
    if (signupPassword.length < 8) {
      setSignupError("Password must be at least 8 characters");
      return;
    }
    if (!isLogin && !signupTerms) {
      setSignupError("Please accept the Terms of Service");
      return;
    }

    setSignupLoading(true);
    setSignupError("");

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: signupEmail,
          password: signupPassword,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: signupEmail,
          password: signupPassword,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
      }
      setSignupSuccess(true);
    } catch (e: any) {
      setSignupError(e.message || "Authentication failed");
    } finally {
      setSignupLoading(false);
    }
  };

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
        <p className="text-muted-foreground">Generating your AI report...</p>
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
  const fullName = session.player_name || `${gps.first_name || ''} ${gps.last_name || ''}`.trim() || 'Unknown';
  const nameParts = fullName.split(' ');
  const initials = `${nameParts[0]?.[0] || ''}${nameParts[nameParts.length - 1]?.[0] || ''}`.toUpperCase();
  const sessionInfo = [
    session.session_type === "match" ? "Match" : "Training",
    session.training_day,
    session.session_date,
    session.opponent ? `vs ${session.opponent}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const metrics = [
    { label: "Total Distance", value: gps.distance ? `${gps.distance}m` : "—" },
    { label: "Max Speed", value: gps.max_sp ? `${gps.max_sp} km/h` : "—" },
    { label: "Sprint Count", value: gps.sp_ev ?? "—" },
    { label: "HMLD", value: gps.hmld ? `${gps.hmld}m` : "—" },
    { label: "Duration", value: gps.duration || "—" },
    { label: "Avg Speed", value: gps.av_sp ? `${gps.av_sp} km/h` : "—" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 py-4 px-4">
        <div className="container flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight">
            <span className="text-foreground">Campo</span>
            <span className="text-primary">metric</span>
          </Link>
          <Link to="/analyze">
            <Button variant="ghost" size="sm">
              New session <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="container max-w-3xl py-8 px-4 space-y-6">
        {/* SECTION 1 — Player Profile Card */}
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
            {/* SECTION 2 — Performance Score */}
            <div className="rounded-2xl border border-border/50 bg-card p-6 text-center">
              <div className={cn("inline-flex flex-col items-center justify-center w-24 h-24 rounded-full border-2 mb-4", getScoreBg(report.performance_score))}>
                <span className={cn("text-4xl font-bold", getScoreColor(report.performance_score))}>
                  {report.performance_score}
                </span>
              </div>
              <p className={cn("text-sm font-medium mb-1", getScoreColor(report.performance_score))}>
                {report.score_label}
              </p>
              <p className="text-xs text-muted-foreground">
                Top {100 - report.position_ranking_percentile}% of {session.position === "GK" ? "Goalkeepers" : session.position === "DEF" ? "Defenders" : session.position === "MID" ? "Midfielders" : "Forwards"}
              </p>
              <p className="text-lg font-medium text-foreground mt-4">{report.headline}</p>
            </div>

            {/* SECTION 3 — AI Narrative */}
            <div className="rounded-2xl border border-border/50 bg-card p-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">Session analysis</h3>
              <p className="text-sm text-muted-foreground leading-[1.8]">{report.narrative}</p>
            </div>

            {/* SECTION 4 — Strengths & Improvements */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border/50 bg-card p-5 border-l-[3px] border-l-[#1db954]">
                <h3 className="text-sm font-semibold text-foreground mb-3">What went well</h3>
                <ul className="space-y-2">
                  {report.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-[#1db954] shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-border/50 bg-card p-5 border-l-[3px] border-l-amber-400">
                <h3 className="text-sm font-semibold text-foreground mb-3">To work on</h3>
                <ul className="space-y-2">
                  {report.areas_to_improve.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <ArrowRight className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* SECTION 5 — GPS Metrics Grid */}
            <div className="rounded-2xl border border-border/50 bg-card p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">GPS Metrics</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {metrics.map((m) => (
                  <div key={m.label} className="rounded-lg bg-secondary p-3">
                    <p className="text-[11px] text-muted-foreground">{m.label}</p>
                    <p className="text-xl font-bold text-foreground">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 6 — Context notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg bg-secondary p-4">
                <p className="text-[11px] text-muted-foreground mb-1">vs team average</p>
                <p className="text-sm text-foreground font-medium">{report.vs_team_average}</p>
              </div>
              <div className="rounded-lg bg-secondary p-4">
                <p className="text-[11px] text-muted-foreground mb-1">session context</p>
                <p className="text-sm text-foreground font-medium">{report.md_context_note}</p>
              </div>
            </div>

            {/* SECTION 7 — Next session recommendation */}
            <div className="rounded-2xl border-l-[3px] border-l-primary bg-[#0d2a4a] p-5">
              <p className="text-[12px] font-semibold text-primary mb-1">Recommendation for next session</p>
              <p className="text-sm text-[#a8c0e0]">{report.next_session_recommendation}</p>
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
              <Download className="h-4 w-4 mr-2" /> Download PDF report
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-11"
              onClick={() => setShowSignup(true)}
            >
              <User className="h-4 w-4 mr-2" /> Save to your profile →
            </Button>
            <Button variant="ghost" className="flex-1 h-11">
              <Share2 className="h-4 w-4 mr-2" /> Share your ranking
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            Free — no account needed for PDF download
          </p>
        </div>

        {/* Inline Signup */}
        <AnimatePresence>
          {showSignup && !signupSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl bg-[#0d1f35] border border-border/50 p-5 relative"
            >
              <button
                onClick={() => setShowSignup(false)}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <h3 className="text-sm font-bold text-foreground mb-1">
                {isLogin ? "Log in to save this report" : "Create your free account to save this report"}
              </h3>
              <p className="text-[12px] text-muted-foreground mb-4">
                {isLogin
                  ? "Welcome back! Your report will be saved automatically."
                  : "Your report, profile and GPS history will be saved permanently. Takes 20 seconds."}
              </p>
              <div className="space-y-3">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="h-11 bg-secondary border-border"
                />
                <Input
                  type="password"
                  placeholder={isLogin ? "Your password" : "Create a password (min 8 chars)"}
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  className="h-11 bg-secondary border-border"
                />
                {!isLogin && (
                  <label className="flex items-start gap-2 cursor-pointer">
                    <div
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-all",
                        signupTerms ? "bg-primary border-primary" : "border-border"
                      )}
                      onClick={() => setSignupTerms(!signupTerms)}
                    >
                      {signupTerms && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <span className="text-[12px] text-muted-foreground">
                      I agree to the{" "}
                      <a href="/terms" className="text-primary hover:underline">Terms of Service</a> and{" "}
                      <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
                    </span>
                  </label>
                )}
                {signupError && (
                  <p className="text-[12px] text-destructive">{signupError}</p>
                )}
                <Button
                  onClick={handleAuth}
                  disabled={signupLoading}
                  className="w-full h-11"
                >
                  {signupLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isLogin ? (
                    "Log in & save report →"
                  ) : (
                    "Create account & save report →"
                  )}
                </Button>
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-[12px] text-primary hover:underline w-full text-center"
                >
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {signupSuccess && (
          <div className="rounded-2xl bg-[#0d3320] border border-[#1db954]/30 p-5 text-center">
            <Check className="h-6 w-6 text-[#1db954] mx-auto mb-2" />
            <p className="text-sm font-medium text-[#1db954]">
              {isLogin ? "Logged in! Your report has been saved." : "Account created! Your report has been saved to your profile."}
            </p>
            <Link
              to="/dashboard"
              className="text-[12px] text-primary hover:underline mt-2 inline-block"
            >
              Go to your profile →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Report;
