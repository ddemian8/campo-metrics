import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, ChevronDown, Trophy, Zap, MapPin, Timer, FileCheck } from "lucide-react";
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
  isPro: boolean;
}

const countryFlag = (country: string) => {
  const flags: Record<string, string> = {
    "Romania": "🇷🇴", "Moldova": "🇲🇩", "Germany": "🇩🇪", "France": "🇫🇷",
    "Spain": "🇪🇸", "Italy": "🇮🇹", "England": "🇬🇧", "UK": "🇬🇧",
    "Portugal": "🇵🇹", "Netherlands": "🇳🇱", "Brazil": "🇧🇷", "Argentina": "🇦🇷",
    "Belgium": "🇧🇪", "Croatia": "🇭🇷", "Serbia": "🇷🇸", "Turkey": "🇹🇷",
    "Poland": "🇵🇱", "Czech Republic": "🇨🇿", "Austria": "🇦🇹", "Switzerland": "🇨🇭",
    "USA": "🇺🇸", "Mexico": "🇲🇽", "Japan": "🇯🇵", "South Korea": "🇰🇷",
    "Australia": "🇦🇺", "Greece": "🇬🇷", "Denmark": "🇩🇰", "Sweden": "🇸🇪",
    "Norway": "🇳🇴", "Finland": "🇫🇮", "Ukraine": "🇺🇦", "Hungary": "🇭🇺",
    "Bulgaria": "🇧🇬", "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "Wales": "🏴󠁧󠁢󠁷󠁬󠁳󠁿", "Ireland": "🇮🇪",
  };
  return flags[country] || "🌍";
};

const Explore = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [posFilter, setPosFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("cpi");
  const [players, setPlayers] = useState<PlayerCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaderboardTab, setLeaderboardTab] = useState<SortKey>("cpi");
  const [pdfOnlyFilter, setPdfOnlyFilter] = useState(true); // Default to PDF Verified

  useEffect(() => {
    const fetchPlayers = async () => {
      setLoading(true);

      // Fetch ALL profiles (all are public now)
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, position, position_specific, current_club, country, subscription_plan, account_type");

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
        const isPro = (p as any).subscription_plan !== "free" || (p as any).account_type !== "free";
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
          isPro,
        };
      });

      setPlayers(merged);
      setLoading(false);
    };

    fetchPlayers();
  }, []);

  const filtered = players
    .filter((p) => {
      if (pdfOnlyFilter && p.pdf_session_count === 0) return false;
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

  // Leaderboard always uses PDF-verified players only
  const leaderboard = [...players]
    .filter(p => p.pdf_session_count > 0)
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

        {/* Sort + PDF filter */}
        <div className="flex items-center gap-2 mb-4">
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

        <div className="flex items-center gap-2 mb-8">
          <button
            onClick={() => setPdfOnlyFilter(true)}
            className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5", pdfOnlyFilter ? "bg-[#1D9E75]/20 text-[#1D9E75]" : "text-muted-foreground hover:text-foreground")}
          >
            <FileCheck className="h-3.5 w-3.5" /> PDF Verified
          </button>
          <button
            onClick={() => setPdfOnlyFilter(false)}
            className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors", !pdfOnlyFilter ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            Show all players
          </button>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading players...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <p className="text-foreground font-medium mb-2">No players with reports yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Be the first — upload your GPS data to appear here.
            </p>
            <Button className="bg-[#1D9E75] hover:bg-[#178a64] text-white" onClick={() => navigate("/analyze")}>
              Analyze your GPS data →
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
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{countryFlag(p.country)}</span>
                      <p className="font-semibold text-foreground">{p.full_name}</p>
                      {p.isPro && (
                        <span className="text-[9px] font-bold text-white bg-[#1D9E75] px-1.5 py-0.5 rounded-full">Pro</span>
                      )}
                    </div>
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
                  {p.pdf_session_count > 0 && (
                    <span className="text-[9px] font-medium text-[#1D9E75] bg-[#1D9E75]/10 px-1.5 py-0.5 rounded">
                      PDF ✓
                    </span>
                  )}
                </div>
                {p.trust_score > 0 && <TrustStars score={p.trust_score} size="sm" />}
              </button>
            ))}
          </div>
        )}

        {/* Leaderboard tabs */}
        {players.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-foreground">Leaderboard</h2>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileCheck className="h-3.5 w-3.5 text-[#1D9E75]" />
                PDF-verified data only
              </div>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex gap-2">
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
            </div>
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {leaderboard.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-muted-foreground">No PDF-verified players yet. Be the first!</p>
                  <Button
                    size="sm"
                    className="mt-3 bg-[#1D9E75] hover:bg-[#178a64] text-white"
                    onClick={() => navigate("/analyze")}
                  >
                    Upload GPS PDF →
                  </Button>
                </div>
              ) : (
                leaderboard.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => p.username && navigate(`/player/${p.username}`)}
                    className="w-full text-left px-5 py-3.5 flex items-center gap-4 hover:bg-secondary/50 transition-colors"
                  >
                    <span className="text-sm font-bold text-muted-foreground w-8 text-right">#{i + 1}</span>
                    <span className="text-sm shrink-0">{countryFlag(p.country)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{p.full_name}</p>
                        <span className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-semibold text-foreground shrink-0">
                          {p.position_specific || p.position}
                        </span>
                        {p.trust_score > 0 && <TrustStars score={p.trust_score} size="sm" />}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {p.current_club} · {p.country}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-sm font-bold text-[#1D9E75]">
                        {getStatDisplay(p, leaderboardTab)}
                      </span>
                      <span className="text-[9px] font-medium text-[#1D9E75] bg-[#1D9E75]/10 px-1 py-0.5 rounded">
                        PDF ✓
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Explore;
