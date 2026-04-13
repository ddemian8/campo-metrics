import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, ChevronDown, Trophy, Zap, MapPin, Timer, FileCheck, X, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Navbar from "@/components/Navbar";
import { TrustStars } from "@/components/TrustStars";

const ALL_POSITIONS = ["GK", "CB", "RB", "LB", "RWB", "LWB", "CDM", "CM", "CAM", "RM", "LM", "ST", "SS", "RW", "LW", "CF"];
const AGE_RANGES = [
  { label: "All ages", min: 0, max: 99 },
  { label: "U18", min: 0, max: 17 },
  { label: "U21", min: 0, max: 20 },
  { label: "U23", min: 0, max: 22 },
  { label: "18-25", min: 18, max: 25 },
  { label: "25-30", min: 25, max: 30 },
  { label: "30-35", min: 30, max: 35 },
  { label: "35+", min: 35, max: 99 },
];
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
  current_league: string | null;
  country: string;
  country_id: number | null;
  league_id: number | null;
  team_id: number | null;
  date_of_birth: string | null;
  cpi: number;
  top_speed: number;
  distance_per90: number;
  sprint_per90: number;
  trust_score: number;
  pdf_session_count: number;
  total_sessions_count: number;
  isPro: boolean;
}

interface FootballOption {
  id: number;
  name: string;
  flag_url?: string | null;
  logo_url?: string | null;
  country_id?: number | null;
  league_id?: number | null;
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

const getAge = (dob: string | null) => {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const FilterDropdown = ({
  label, options, value, onChange, renderOption,
}: {
  label: string;
  options: { id: number | string; name: string; extra?: React.ReactNode }[];
  value: number | string | null;
  onChange: (val: number | string | null) => void;
  renderOption?: (opt: any) => React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.id === value);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap",
          value ? "bg-primary/10 text-primary border-primary/30" : "bg-card text-muted-foreground border-border hover:text-foreground"
        )}
      >
        {selected?.name || label}
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 w-48 max-h-60 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
            <button
              onClick={() => { onChange(null); setOpen(false); }}
              className={cn("w-full px-3 py-2 text-xs text-left hover:bg-secondary/50", !value && "font-medium text-primary")}
            >
              All {label.toLowerCase()}s
            </button>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { onChange(opt.id); setOpen(false); }}
                className={cn("w-full px-3 py-2 text-xs text-left hover:bg-secondary/50 flex items-center gap-2", value === opt.id && "font-medium text-primary")}
              >
                {opt.extra}
                <span className="truncate">{opt.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const Explore = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [posFilters, setPosFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>("cpi");
  const [players, setPlayers] = useState<PlayerCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaderboardTab, setLeaderboardTab] = useState<SortKey>("cpi");
  const [pdfOnlyFilter, setPdfOnlyFilter] = useState(true);

  // Advanced filters
  const [filterCountryId, setFilterCountryId] = useState<number | null>(null);
  const [filterLeagueId, setFilterLeagueId] = useState<number | null>(null);
  const [filterTeamId, setFilterTeamId] = useState<number | null>(null);
  const [filterAge, setFilterAge] = useState<string | null>(null);
  const [countries, setCountries] = useState<FootballOption[]>([]);
  const [leagues, setLeagues] = useState<FootballOption[]>([]);
  const [teams, setTeams] = useState<FootballOption[]>([]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch football data for filters
  useEffect(() => {
    const fetchFootball = async () => {
      const [c, l, t] = await Promise.all([
        supabase.from("football_countries").select("id, name, flag_url").eq("is_active", true).order("name"),
        supabase.from("football_leagues").select("id, name, logo_url, country_id").eq("is_active", true).order("name"),
        supabase.from("football_teams").select("id, name, logo_url, league_id, country_id").eq("is_active", true).order("name"),
      ]);
      setCountries((c.data || []) as FootballOption[]);
      setLeagues((l.data || []) as FootballOption[]);
      setTeams((t.data || []) as FootballOption[]);
    };
    fetchFootball();
  }, []);

  useEffect(() => {
    const fetchPlayers = async () => {
      setLoading(true);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, position, position_specific, current_club, current_league, country, country_id, league_id, team_id, date_of_birth, subscription_plan, account_type");

      if (!profiles || profiles.length === 0) { setPlayers([]); setLoading(false); return; }

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
          current_league: p.current_league || null,
          country: p.country || "—",
          country_id: (p as any).country_id || null,
          league_id: (p as any).league_id || null,
          team_id: (p as any).team_id || null,
          date_of_birth: p.date_of_birth || null,
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

  const filteredLeagues = useMemo(() =>
    filterCountryId ? leagues.filter(l => l.country_id === filterCountryId) : leagues
  , [leagues, filterCountryId]);

  const filteredTeams = useMemo(() =>
    filterLeagueId ? teams.filter(t => t.league_id === filterLeagueId) : 
    filterCountryId ? teams.filter(t => t.country_id === filterCountryId) : teams
  , [teams, filterCountryId, filterLeagueId]);

  const ageRange = AGE_RANGES.find(a => a.label === filterAge);

  const filtered = useMemo(() => players
    .filter((p) => {
      if (pdfOnlyFilter && p.pdf_session_count === 0) return false;
      if (posFilters.length > 0 && !posFilters.includes(p.position) && !posFilters.includes(p.position_specific || "")) return false;
      if (filterCountryId && p.country_id !== filterCountryId) {
        // Also check text match for backward compat
        const matchCountry = countries.find(c => c.id === filterCountryId);
        if (!matchCountry || p.country !== matchCountry.name) return false;
      }
      if (filterLeagueId && p.league_id !== filterLeagueId) {
        const matchLeague = leagues.find(l => l.id === filterLeagueId);
        if (!matchLeague || p.current_league !== matchLeague.name) return false;
      }
      if (filterTeamId && p.team_id !== filterTeamId) {
        const matchTeam = teams.find(t => t.id === filterTeamId);
        if (!matchTeam || p.current_club !== matchTeam.name) return false;
      }
      if (ageRange && filterAge !== "All ages") {
        const age = getAge(p.date_of_birth);
        if (age === null) return false;
        if (age < ageRange.min || age > ageRange.max) return false;
      }
      if (debouncedQuery) {
        const q = debouncedQuery.toLowerCase();
        return (
          p.full_name.toLowerCase().includes(q) ||
          p.current_club.toLowerCase().includes(q) ||
          (p.current_league || "").toLowerCase().includes(q) ||
          p.country.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const map: Record<SortKey, keyof PlayerCard> = { cpi: "cpi", top_speed: "top_speed", distance: "distance_per90", sprint: "sprint_per90" };
      return (b[map[sortBy]] as number) - (a[map[sortBy]] as number);
    })
  , [players, pdfOnlyFilter, posFilters, filterCountryId, filterLeagueId, filterTeamId, filterAge, ageRange, debouncedQuery, sortBy, countries, leagues, teams]);

  const leaderboard = useMemo(() => [...players]
    .filter(p => p.pdf_session_count > 0)
    .sort((a, b) => {
      const map: Record<SortKey, keyof PlayerCard> = { cpi: "cpi", top_speed: "top_speed", distance: "distance_per90", sprint: "sprint_per90" };
      return (b[map[leaderboardTab]] as number) - (a[map[leaderboardTab]] as number);
    })
  , [players, leaderboardTab]);

  const hasActiveFilters = filterCountryId || filterLeagueId || filterTeamId || filterAge || posFilters.length > 0;

  const resetFilters = () => {
    setFilterCountryId(null);
    setFilterLeagueId(null);
    setFilterTeamId(null);
    setFilterAge(null);
    setPosFilters([]);
    setQuery("");
    setPdfOnlyFilter(true);
  };

  const togglePosition = (pos: string) => {
    setPosFilters(prev => prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]);
  };

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
        <p className="text-muted-foreground mb-6">Discover athletes on Campometric — open to everyone.</p>

        {/* Advanced Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
          
          <FilterDropdown
            label="Country"
            options={countries.map(c => ({ id: c.id, name: c.name, extra: c.flag_url ? <img src={c.flag_url} alt="" className="h-3 w-4 object-contain" /> : undefined }))}
            value={filterCountryId}
            onChange={(v) => { setFilterCountryId(v as number | null); setFilterLeagueId(null); setFilterTeamId(null); }}
          />
          <FilterDropdown
            label="League"
            options={filteredLeagues.map(l => ({ id: l.id, name: l.name, extra: l.logo_url ? <img src={l.logo_url} alt="" className="h-3 w-3 object-contain" /> : undefined }))}
            value={filterLeagueId}
            onChange={(v) => { setFilterLeagueId(v as number | null); setFilterTeamId(null); }}
          />
          <FilterDropdown
            label="Team"
            options={filteredTeams.map(t => ({ id: t.id, name: t.name, extra: t.logo_url ? <img src={t.logo_url} alt="" className="h-3 w-3 object-contain" /> : undefined }))}
            value={filterTeamId}
            onChange={(v) => setFilterTeamId(v as number | null)}
          />
          <FilterDropdown
            label="Age"
            options={AGE_RANGES.map(a => ({ id: a.label, name: a.label }))}
            value={filterAge}
            onChange={(v) => setFilterAge(v as string | null)}
          />

          {hasActiveFilters && (
            <button onClick={resetFilters} className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-3 w-3" /> Reset
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-lg mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, club, league, or country..."
            className="pl-12 h-11 bg-card border-border"
          />
        </div>

        {/* Position chips */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {ALL_POSITIONS.map((pos) => (
            <button
              key={pos}
              onClick={() => togglePosition(pos)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium transition-colors border",
                posFilters.includes(pos) ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-muted-foreground"
              )}
            >
              {pos}
            </button>
          ))}
        </div>

        {/* Sort + PDF filter */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort:</span>
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
            <span className="text-border">|</span>
            <button
              onClick={() => setPdfOnlyFilter(true)}
              className={cn("px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1", pdfOnlyFilter ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              <FileCheck className="h-3 w-3" /> PDF
            </button>
            <button
              onClick={() => setPdfOnlyFilter(false)}
              className={cn("px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors", !pdfOnlyFilter ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              All
            </button>
          </div>
          <span className="text-xs text-muted-foreground">
            Showing {filtered.length} player{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading players...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <p className="text-foreground font-medium mb-2">No players found</p>
            <p className="text-sm text-muted-foreground mb-4">
              {hasActiveFilters ? "Try adjusting your filters." : "Be the first — upload your GPS data to appear here."}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={resetFilters}>Reset filters</Button>
            ) : (
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => navigate("/analyze")}>
                Analyze your GPS data →
              </Button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(p.username ? `/player/${p.username}` : "#")}
                className="text-left rounded-xl border border-border bg-card hover:border-primary/50 p-5 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{countryFlag(p.country)}</span>
                      <p className="font-semibold text-foreground">{p.full_name}</p>
                      {p.isPro && (
                        <span className="text-[9px] font-bold text-primary-foreground bg-primary px-1.5 py-0.5 rounded-full">Pro</span>
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
                    <span className="text-[9px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      PDF ✓
                    </span>
                  )}
                </div>
                {p.trust_score > 0 && <TrustStars score={p.trust_score} size="sm" />}
              </button>
            ))}
          </div>
        )}

        {/* Leaderboard */}
        {players.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-foreground">Leaderboard</h2>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileCheck className="h-3.5 w-3.5 text-primary" />
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
                      leaderboardTab === opt.value ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border hover:text-foreground"
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
                  <Button size="sm" className="mt-3 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => navigate("/analyze")}>
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
                      <span className="text-sm font-bold text-primary">
                        {getStatDisplay(p, leaderboardTab)}
                      </span>
                      <span className="text-[9px] font-medium text-primary bg-primary/10 px-1 py-0.5 rounded">
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
