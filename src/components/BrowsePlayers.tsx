import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, Zap, MapPin, Trophy, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AnimateIn from "@/components/AnimateIn";

interface LeaderboardEntry {
  player_id: string;
  value: number;
  full_name: string;
  username: string | null;
  position: string;
  position_specific: string | null;
  current_club: string;
  country: string;
}

const BrowsePlayers = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [fastest, setFastest] = useState<LeaderboardEntry[]>([]);
  const [mostDistance, setMostDistance] = useState<LeaderboardEntry[]>([]);
  const [highestCpi, setHighestCpi] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const fetchLeaderboards = async () => {
      // Only fetch players with PDF sessions
      const { data: statsData } = await supabase
        .from("player_stats_aggregate")
        .select("player_id, best_top_speed, avg_distance_per90, avg_performance_score, pdf_session_count")
        .gt("pdf_session_count", 0)
        .order("best_top_speed", { ascending: false })
        .limit(20);

      if (!statsData || statsData.length === 0) return;

      const playerIds = statsData.map((s) => s.player_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, username, position, position_specific, current_club, country")
        .in("id", playerIds);

      if (!profiles) return;

      const profileMap = new Map(profiles.map((p) => [p.id, p]));

      const mapEntries = (
        data: typeof statsData,
        key: "best_top_speed" | "avg_distance_per90" | "avg_performance_score"
      ): LeaderboardEntry[] =>
        data
          .filter((s) => profileMap.has(s.player_id) && s[key] != null)
          .sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0))
          .slice(0, 5)
          .map((s) => {
            const p = profileMap.get(s.player_id)!;
            return {
              player_id: s.player_id,
              value: Number(s[key]) || 0,
              full_name: p.full_name || "Unknown",
              username: p.username || null,
              position: p.position || "—",
              position_specific: p.position_specific || null,
              current_club: p.current_club || "—",
              country: p.country || "—",
            };
          });

      setFastest(mapEntries(statsData, "best_top_speed"));
      setMostDistance(mapEntries(statsData, "avg_distance_per90"));
      setHighestCpi(mapEntries(statsData, "avg_performance_score"));
    };

    fetchLeaderboards();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`/explore?q=${encodeURIComponent(search.trim())}`);
  };

  const placeholderRows = Array.from({ length: 5 }, (_, i) => i);
  const hasPlayers = fastest.length > 0 || mostDistance.length > 0 || highestCpi.length > 0;

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

  const renderLeaderboard = (
    title: string,
    icon: React.ReactNode,
    entries: LeaderboardEntry[],
    unit: string
  ) => (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 mb-5">
        {icon}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="space-y-3.5">
        {entries.length > 0
          ? entries.map((entry, i) => (
              <div key={entry.player_id} className="flex items-center gap-3 cursor-pointer hover:bg-secondary/50 rounded-lg px-2 py-2 transition-colors -mx-2" onClick={() => entry.username && navigate(`/player/${entry.username}`)}>
                <span className="text-xs font-bold text-muted-foreground w-5 text-right">
                  {i + 1}
                </span>
                <span className="text-sm shrink-0">{countryFlag(entry.country)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-foreground truncate">
                      {entry.full_name}
                    </p>
                    <span className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-semibold text-foreground shrink-0">
                      {entry.position_specific || entry.position}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {entry.current_club}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-sm font-bold text-[#1D9E75]">
                    {unit === "km/h"
                      ? `${entry.value.toFixed(1)} ${unit}`
                      : unit === "m/90"
                      ? `${Math.round(entry.value).toLocaleString()} ${unit}`
                      : Math.round(entry.value)}
                  </span>
                  <span className="text-[9px] font-medium text-[#1D9E75] bg-[#1D9E75]/10 px-1 py-0.5 rounded">
                    PDF ✓
                  </span>
                </div>
              </div>
            ))
          : placeholderRows.map((i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground w-5 text-right">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">—</p>
                  <p className="text-xs text-muted-foreground/50">More players coming soon</p>
                </div>
                <span className="text-sm text-muted-foreground/50">—</span>
              </div>
            ))}
      </div>
    </div>
  );

  return (
    <section className="py-20 bg-background">
      <div className="container max-w-6xl">
        <AnimateIn className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Browse players on Campometric
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Discover athletes by position, speed, distance, and more — open to everyone.
          </p>
        </AnimateIn>

        <AnimateIn delay={0.1}>
          <form onSubmit={handleSearch} className="max-w-lg mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, club, or country..."
                className="pl-12 h-12 text-base bg-card border-border"
              />
            </div>
          </form>
        </AnimateIn>

        {/* PDF-verified info badge */}
        <AnimateIn delay={0.15}>
          <div className="flex items-center justify-center gap-2 mb-6">
            <FileCheck className="h-4 w-4 text-[#1D9E75]" />
            <p className="text-xs text-muted-foreground">
              Leaderboard rankings are based on PDF-verified GPS data only
            </p>
          </div>
        </AnimateIn>

        <AnimateIn delay={0.2}>
          <div className="grid md:grid-cols-3 gap-5 mb-6">
            {renderLeaderboard("Fastest players", <Zap className="h-4 w-4 text-[#1D9E75]" />, fastest, "km/h")}
            {renderLeaderboard("Most distance/90", <MapPin className="h-4 w-4 text-[#1D9E75]" />, mostDistance, "m/90")}
            {renderLeaderboard("Highest CPI", <Trophy className="h-4 w-4 text-[#1D9E75]" />, highestCpi, "cpi")}
          </div>
        </AnimateIn>

        {/* CTA if not enough players */}
        {!hasPlayers && (
          <AnimateIn delay={0.25}>
            <div className="rounded-xl border border-dashed border-[#1D9E75]/30 bg-[#1D9E75]/5 p-6 text-center mb-6">
              <p className="text-sm font-medium text-foreground mb-1">
                Be the first on the leaderboard
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Upload your GPS PDF today and get ranked among athletes worldwide.
              </p>
              <Button
                size="sm"
                className="bg-[#1D9E75] hover:bg-[#178a64] text-white"
                onClick={() => navigate("/analyze")}
              >
                Upload GPS PDF →
              </Button>
            </div>
          </AnimateIn>
        )}

        <AnimateIn delay={0.3} className="text-center">
          <Button
            size="lg"
            className="bg-[#1D9E75] hover:bg-[#178a64] text-white font-semibold"
            onClick={() => navigate("/explore")}
          >
            Explore all players →
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            Free to browse · No account needed
          </p>
        </AnimateIn>
      </div>
    </section>
  );
};

export default BrowsePlayers;
