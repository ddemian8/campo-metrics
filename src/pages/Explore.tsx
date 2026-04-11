import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, ChevronDown, Trophy, Zap, MapPin, Timer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Navbar from "@/components/Navbar";
import { TrustStars } from "@/components/TrustStars";

const ALL_POSITIONS = ["GK", "CB", "RB", "LB", "RWB", "LWB", "CDM", "CM", "CAM", "RM", "LM", "ST", "SS", "RW", "LW", "CF"];
const SORT_OPTIONS = [
  { value: "cpi", label: "CPI", icon: Trophy },
  { value: "top_speed", label: "Top Speed", icon: Zap },
  { value: "distance", label: "Distance/90", icon: MapPin },
  { value: "sprint", label: "Sprint Dist/90", icon: Timer },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["value"];

interface PlayerCard {
  id: string;
  username: string | null;
  full_name: string;
  position: string;
  position_specific: string | null;
  current_club: string;
  country: string;
  cpi: number;
  top_speed: number;
  distance_per90: number;
  sprint_per90: number;
  trust_score: number;
  pdf_session_count: number;
  total_sessions_count: number;
}

const Explore = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [posFilter, setPosFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("cpi");
  const [players, setPlayers] = useState<PlayerCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaderboardTab, setLeaderboardTab] = useState<SortKey>("cpi");
  const [pdfOnlyFilter, setPdfOnlyFilter] = useState(false);

  useEffect(() => {
    const fetchPlayers = async () => {
      setLoading(true);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, position, position_specific, current_club, country, is_public")
        .eq("is_public", true);

      if (!profiles || profiles.length === 0) {
        setPlayers([]);
        setLoading(false);
        return;
      }

      const ids = profiles.map((p) => p.id);
      const { data: stats } = await supabase
        .from("player_stats_aggregate")
        .select("player_id, avg_performance_score, best_top_speed, avg_distance_per90, avg_sprint_distance_per90, trust_score, pdf_session_count, total_sessions")
        .in("player_id", ids);

      const statsMap = new Map(stats?.map((s) => [s.player_id, s]) || []);

      const merged: PlayerCard[] = profiles.map((p) => {
        const s = statsMap.get(p.id);
        return {
          id: p.id,
          username: p.username,
          full_name: p.full_name || "Unknown",
          position: p.position || "—",
          position_specific: p.position_specific,
          current_club: p.current_club || "—",
          country: p.country || "—",
          cpi: Number(s?.avg_performance_score) || 0,
          top_speed: Number(s?.best_top_speed) || 0,
          distance_per90: Number(s?.avg_distance_per90) || 0,
          sprint_per90: Number(s?.avg_sprint_distance_per90) || 0,
          trust_score: Number(s?.trust_score) || 0,
          pdf_session_count: Number(s?.pdf_session_count) || 0,
          total_sessions_count: Number(s?.total_sessions) || 0,
        };
      });

      setPlayers(merged);
      setLoading(false);
    };

    fetchPlayers();
  }, []);

  const filtered = players
    .filter((p) => {
      if (posFilter && p.position !== posFilter && p.position_specific !== posFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          p.full_name.toLowerCase().includes(q) ||
          p.current_club.toLowerCase().includes(q) ||
          p.country.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const map: Record<SortKey, keyof PlayerCard> = { cpi: "cpi", top_speed: "top_speed", distance: "distance_per90", sprint: "sprint_per90" };
      return (b[map[sortBy]] as number) - (a[map[sortBy]] as number);
    });

  const leaderboard = [...players]
    .filter(p => !pdfOnlyFilter || (p.total_sessions_count > 0 && p.pdf_session_count / p.total_sessions_count > 0.5))
    .sort((a, b) => {
    const map: Record<SortKey, keyof PlayerCard> = { cpi: "cpi", top_speed: "top_speed", distance: "distance_per90", sprint: "sprint_per90" };
    return (b[map[leaderboardTab]] as number) - (a[map[leaderboardTab]] as number);
  });

  const getStatDisplay = (p: PlayerCard, key: SortKey) => {
    switch (key) {
      case "cpi": return Math.round(p.cpi).toString();
      case "top_speed": return `${p.top_speed.toFixed(1)} km/h`;
      case "distance": return `${Math.round(p.distance_per90).toLocaleString()} m`;
      case "sprint": return `${Math.round(p.sprint_per90).toLocaleString()} m`;
    }
  };

  const cpiColor = (cpi: number) => cpi >= 75 ? "text-[#1D9E75]" : cpi >= 45 ? "text-amber-400" : "text-red-400";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-6xl pt-24 pb-16">
        <h1 className="text-3xl font-bold text-foreground mb-2">Explore Players</h1>
        <p className="text-muted-foreground mb-8">Discover athletes on Campometric — open to everyone.</p>

        {/* Search */}
        <div className="relative max-w-lg mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, club, or country..."
            className="pl-12 h-11 bg-card border-border"
          />
        </div>

        {/* Position chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setPosFilter(null)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
              !posFilter ? "bg-[#1D9E75] text-white border-[#1D9E75]" : "bg-card text-muted-foreground border-border hover:border-muted-foreground"
            )}
          >
            All
          </button>
          {ALL_POSITIONS.map((pos) => (
            <button
              key={pos}
              onClick={() => setPosFilter(posFilter === pos ? null : pos)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                posFilter === pos ? "bg-[#1D9E75] text-white border-[#1D9E75]" : "bg-card text-muted-foreground border-border hover:border-muted-foreground"
              )}
            >
              {pos}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 mb-8">
          <span className="text-xs text-muted-foreground">Sort by:</span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                sortBy === opt.value ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading players...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <p className="text-foreground font-medium mb-2">No public players yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Be the first — upgrade to Player Pro to appear here.
            </p>
            <Button className="bg-[#1D9E75] hover:bg-[#178a64] text-white" onClick={() => navigate("/#pricing")}>
              Go Pro — €9/month
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(p.username ? `/player/${p.username}` : "#")}
                className="text-left rounded-xl border border-border bg-card hover:border-[#1D9E75]/50 p-5 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-foreground">{p.full_name}</p>
                    <p className="text-xs text-muted-foreground">{p.current_club} · {p.country}</p>
                  </div>
                  <span className={cn("text-2xl font-bold", cpiColor(p.cpi))}>{Math.round(p.cpi) || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-secondary text-xs font-medium text-foreground">
                    {p.position_specific || p.position}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {p.top_speed > 0 ? `${p.top_speed.toFixed(1)} km/h` : "—"}
                  </span>
                </div>
                {p.trust_score > 0 && <TrustStars score={p.trust_score} size="sm" />}
              </button>
            ))}
          </div>
        )}

        {/* Leaderboard tabs */}
        {players.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">Leaderboard</h2>
            <div className="flex gap-2 mb-4">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setLeaderboardTab(opt.value)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    leaderboardTab === opt.value ? "bg-[#1D9E75] text-white" : "bg-card text-muted-foreground border border-border hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {leaderboard.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => p.username && navigate(`/player/${p.username}`)}
                  className="w-full text-left px-5 py-3.5 flex items-center gap-4 hover:bg-secondary/50 transition-colors"
                >
                  <span className="text-sm font-bold text-muted-foreground w-8 text-right">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.position_specific || p.position} · {p.current_club} · {p.country}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-[#1D9E75] shrink-0">
                    {getStatDisplay(p, leaderboardTab)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Explore;
