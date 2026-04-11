import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Loader2, ExternalLink, Share2, ChevronRight, Copy, Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Dot,
} from "recharts";
import Navbar from "@/components/Navbar";
import { DataSourceBadge } from "@/components/DataSourceBadge";
import { TrustStars } from "@/components/TrustStars";

interface ProfileData {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  date_of_birth: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  position: string | null;
  position_specific: string | null;
  current_club: string | null;
  current_league: string | null;
  country: string | null;
  transfermarkt_url: string | null;
  preferred_foot: string | null;
}

interface StatsData {
  avg_distance_per90: number | null;
  best_top_speed: number | null;
  avg_sprint_distance_per90: number | null;
  avg_hsr_per90: number | null;
  avg_accelerations_per90: number | null;
  avg_decelerations_per90: number | null;
  avg_performance_score: number | null;
  best_performance_score: number | null;
  best_distance_single_match: number | null;
  total_sessions: number;
  total_matches: number;
  total_trainings: number;
  trust_score: number;
}

interface ReportRow {
  id: string;
  session_id: string;
  ai_report: any;
  created_at: string;
  sessions: {
    session_type: string;
    session_date: string;
    opponent: string | null;
    training_day: string | null;
    input_method: string | null;
  } | null;
}

interface RankItem {
  label: string;
  rank: number;
  total: number;
  percentile: number;
}

const cpiColor = (v: number) => v >= 75 ? "text-[#1D9E75]" : v >= 45 ? "text-amber-400" : "text-red-400";
const cpiRingColor = (v: number) => v >= 75 ? "#1D9E75" : v >= 45 ? "#F59E0B" : "#EF4444";

const calcAge = (dob: string) => {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) age--;
  return age;
};

const PlayerProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [cpiTrend, setCpiTrend] = useState<{ date: string; cpi: number }[]>([]);
  const [rankings, setRankings] = useState<RankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;
    const load = async () => {
      // Fetch profile
      const { data: p } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, date_of_birth, height_cm, weight_kg, position, position_specific, current_club, current_league, country, transfermarkt_url, preferred_foot, is_public")
        .eq("username", username)
        .maybeSingle();

      if (!p || !(p as any).is_public) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(p as ProfileData);

      // Fetch stats, reports, and rankings in parallel
      const [statsRes, reportsRes] = await Promise.all([
        supabase.from("player_stats_aggregate").select("*").eq("player_id", p.id).maybeSingle(),
        supabase
          .from("reports")
          .select("id, session_id, ai_report, created_at, sessions(session_type, session_date, opponent, training_day)")
          .eq("player_id", p.id)
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      setStats(statsRes.data as StatsData | null);
      setReports((reportsRes.data as any) || []);

      // CPI trend from reports
      const { data: trendData } = await supabase
        .from("reports")
        .select("ai_report, created_at, sessions(session_date)")
        .eq("player_id", p.id)
        .eq("is_public", true)
        .order("created_at", { ascending: true })
        .limit(20);

      if (trendData) {
        const trend = trendData
          .filter((r: any) => r.ai_report?.cpi != null)
          .map((r: any) => ({
            date: (r.sessions as any)?.session_date || r.created_at?.split("T")[0],
            cpi: r.ai_report.cpi,
          }));
        setCpiTrend(trend);
      }

      // Rankings
      if (p.position_specific) {
        const { data: allStats } = await supabase
          .from("player_stats_aggregate")
          .select("player_id, avg_performance_score, avg_distance_per90, best_top_speed, avg_sprint_distance_per90");

        if (allStats) {
          // Get public profile IDs with same position
          const pIds = allStats.map((s) => s.player_id);
          const { data: posProfiles } = await supabase
            .from("profiles")
            .select("id, position_specific, is_public")
            .in("id", pIds)
            .eq("position_specific", p.position_specific)
            .eq("is_public", true);

          if (posProfiles && posProfiles.length > 1) {
            const posIds = new Set(posProfiles.map((pp) => pp.id));
            const filtered = allStats.filter((s) => posIds.has(s.player_id));
            const total = filtered.length;

            const calcRank = (key: string) => {
              const sorted = [...filtered].sort((a, b) => ((b as any)[key] ?? 0) - ((a as any)[key] ?? 0));
              const rank = sorted.findIndex((s) => s.player_id === p.id) + 1;
              return { rank, total, percentile: Math.round(((total - rank) / total) * 100) };
            };

            setRankings([
              { label: "CPI", ...calcRank("avg_performance_score") },
              { label: "Distance/90", ...calcRank("avg_distance_per90") },
              { label: "Top Speed", ...calcRank("best_top_speed") },
              { label: "Sprint Dist/90", ...calcRank("avg_sprint_distance_per90") },
            ]);
          }
        }
      }

      setLoading(false);
    };
    load();
  }, [username]);

  // SEO meta tags
  useEffect(() => {
    if (!profile) return;
    const avgCpi = stats?.avg_performance_score ? Math.round(Number(stats.avg_performance_score)) : "—";
    document.title = `${profile.full_name} — ${profile.position_specific || profile.position} at ${profile.current_club || "Unknown"} | Campometric`;
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        (el as HTMLMetaElement).setAttribute(name.startsWith("og:") ? "property" : "name", name);
        document.head.appendChild(el);
      }
      (el as HTMLMetaElement).content = content;
    };
    setMeta("description", `${profile.full_name} is a ${profile.position_specific} at ${profile.current_club} (${profile.current_league}). CPI: ${avgCpi}. View GPS performance stats on Campometric.`);
    setMeta("og:title", `${profile.full_name} — ${profile.position_specific} | Campometric`);
    setMeta("og:description", `GPS performance analytics for ${profile.full_name}. CPI: ${avgCpi}, Top Speed: ${stats?.best_top_speed?.toFixed(1) || "—"} km/h`);
    if (profile.avatar_url) setMeta("og:image", profile.avatar_url);
    return () => { document.title = "Campometric"; };
  }, [profile, stats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-lg pt-32 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-3">Player not found</h1>
          <p className="text-muted-foreground mb-6">This player profile is private or doesn't exist.</p>
          <Button className="bg-[#1D9E75] hover:bg-[#178a64] text-white" onClick={() => navigate("/explore")}>
            Explore other players →
          </Button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const avgCpi = stats?.avg_performance_score ? Math.round(Number(stats.avg_performance_score)) : null;
  const age = profile.date_of_birth ? calcAge(profile.date_of_birth) : null;

  const statCards = [
    { label: "Distance/90", value: stats?.avg_distance_per90 ? `${Math.round(Number(stats.avg_distance_per90)).toLocaleString()} m` : null, sub: "per 90 min average" },
    { label: "Top Speed", value: stats?.best_top_speed ? `${Number(stats.best_top_speed).toFixed(1)} km/h` : null, sub: "personal best" },
    { label: "Sprint Dist/90", value: stats?.avg_sprint_distance_per90 ? `${Math.round(Number(stats.avg_sprint_distance_per90)).toLocaleString()} m` : null, sub: "per 90 min average" },
    { label: "HSR/90", value: stats?.avg_hsr_per90 ? `${Math.round(Number(stats.avg_hsr_per90)).toLocaleString()} m` : null, sub: "high speed running" },
    { label: "Accelerations/90", value: stats?.avg_accelerations_per90 ? `${Math.round(Number(stats.avg_accelerations_per90))}` : null, sub: "per 90 min average" },
    { label: "Decelerations/90", value: stats?.avg_decelerations_per90 ? `${Math.round(Number(stats.avg_decelerations_per90))}` : null, sub: "per 90 min average" },
  ];

  const personalRecords = [
    { label: "Best CPI", value: stats?.best_performance_score ? Math.round(Number(stats.best_performance_score)).toString() : null },
    { label: "Top Speed", value: stats?.best_top_speed ? `${Number(stats.best_top_speed).toFixed(1)} km/h` : null },
    { label: "Best Distance/90", value: stats?.best_distance_single_match ? `${Math.round(Number(stats.best_distance_single_match)).toLocaleString()} m` : null },
  ];

  const rankColor = (pct: number) => pct >= 75 ? "bg-[#1D9E75]" : pct >= 50 ? "bg-amber-400" : "bg-muted-foreground";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-4xl pt-24 pb-16">

        {/* Section 1: Player Card Header */}
        <div className="flex flex-col md:flex-row items-start gap-8 mb-12">
          <div className="flex-1">
            <div className="flex items-center gap-5 mb-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="bg-secondary text-foreground text-2xl font-bold">
                  {profile.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">{profile.full_name}</h1>
                <div className="flex items-center gap-2 mt-1.5">
                  {profile.position_specific && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#1D9E75] text-white">
                      {profile.position_specific}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1.5">
                  {[profile.current_club, profile.current_league, profile.country].filter(Boolean).join(" · ")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {[age ? `${age} years` : null, profile.height_cm ? `${profile.height_cm} cm` : null].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>

            {profile.transfermarkt_url && (
              <a
                href={profile.transfermarkt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-2"
              >
                View on Transfermarkt <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {/* CPI Ring */}
          <div className="text-center shrink-0">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">AVG CPI</p>
            <div className="relative w-28 h-28 mx-auto">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" stroke="hsl(var(--border))" strokeWidth="6" fill="none" />
                <circle
                  cx="50" cy="50" r="42"
                  stroke={avgCpi != null ? cpiRingColor(avgCpi) : "hsl(var(--muted))"}
                  strokeWidth="6" fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${((avgCpi || 0) / 100) * 264} 264`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn("text-3xl font-bold", avgCpi != null ? cpiColor(avgCpi) : "text-muted-foreground")}>
                  {avgCpi ?? "—"}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Based on {stats?.total_sessions || 0} sessions
            </p>
          </div>
        </div>

        {/* Section 2: Key Stats */}
        <div className="mb-12">
          <h2 className="text-lg font-semibold text-foreground mb-4">Key Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {statCards.map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                <p className="text-xl font-bold text-foreground">{s.value || "—"}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.value ? s.sub : "No data yet"}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Personal Records */}
        <div className="mb-12">
          <h2 className="text-lg font-semibold text-foreground mb-4">Personal Records</h2>
          <div className="grid grid-cols-3 gap-3">
            {personalRecords.map((r) => (
              <div key={r.label} className="rounded-xl border border-border bg-card p-4 text-center">
                <p className="text-xs text-muted-foreground mb-2">{r.label}</p>
                <p className="text-2xl font-bold text-amber-400">{r.value || "—"}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Recent Reports */}
        <div className="mb-12">
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Sessions</h2>
          {reports.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <p className="text-muted-foreground">No public sessions yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reports.map((r) => {
                const rpt = r.ai_report as any;
                const sess = r.sessions as any;
                const cpi = rpt?.cpi ?? rpt?.performanceScore;
                const ctx = sess?.session_type === "match"
                  ? `Match${sess.opponent ? ` vs ${sess.opponent}` : ""}`
                  : `Training${sess?.training_day ? ` ${sess.training_day}` : ""}`;
                const dateStr = sess?.session_date
                  ? new Date(sess.session_date + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                  : "";
                return (
                  <button
                    key={r.id}
                    onClick={() => navigate(`/report/${r.session_id}`)}
                    className="w-full text-left rounded-lg border border-border bg-card hover:border-[#1D9E75]/50 p-4 transition-colors flex items-center gap-4"
                  >
                    <div className="shrink-0 w-12 text-center">
                      {cpi != null ? (
                        <span className={cn("text-2xl font-bold", cpiColor(cpi))}>{cpi}</span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{ctx}</p>
                      <p className="text-xs text-muted-foreground">{dateStr}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 5: CPI Trend */}
        <div className="mb-12">
          <h2 className="text-lg font-semibold text-foreground mb-4">CPI Trend</h2>
          {cpiTrend.length < 2 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <p className="text-muted-foreground">Not enough data for trend chart yet. Check back after more sessions.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-5">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={cpiTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(216 30% 20%)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "hsl(228 15% 65%)", fontSize: 11 }}
                    tickFormatter={(v) => {
                      const d = new Date(v + "T00:00:00");
                      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
                    }}
                  />
                  <YAxis domain={[0, 100]} tick={{ fill: "hsl(228 15% 65%)", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(216 50% 13%)", border: "1px solid hsl(216 30% 20%)", borderRadius: 8, color: "#fff" }}
                    labelFormatter={(v) => new Date(v + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  />
                  <Line
                    type="monotone"
                    dataKey="cpi"
                    stroke="#1D9E75"
                    strokeWidth={2.5}
                    dot={{ fill: "#1D9E75", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Section 6: Position Ranking */}
        {rankings.length > 0 && (
          <div className="mb-12">
            <h2 className="text-lg font-semibold text-foreground mb-1">Position Ranking</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Among all public {profile.position_specific} players on Campometric
            </p>
            <div className="grid gap-3">
              {rankings.map((r) => (
                <div key={r.label} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">{r.label}</span>
                    <span className="text-xs text-muted-foreground">
                      Ranked #{r.rank} of {r.total} {profile.position_specific}s
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", rankColor(r.percentile))}
                      style={{ width: `${r.percentile}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 7: Contact */}
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-foreground font-semibold mb-4">Interested in this player?</p>
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/player/${profile.username}`);
                toast.success("Link copied!");
              }}
            >
              <Copy className="h-4 w-4 mr-1.5" /> Share profile
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PlayerProfile;
