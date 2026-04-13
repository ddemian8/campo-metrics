import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  id: number;
  name: string;
  logo_url?: string | null;
  flag_url?: string | null;
  code?: string | null;
}

interface FootballDropdownsProps {
  countryId: number | null;
  leagueId: number | null;
  teamId: number | null;
  countryName?: string;
  leagueName?: string;
  teamName?: string;
  onCountryChange: (id: number | null, name: string) => void;
  onLeagueChange: (id: number | null, name: string) => void;
  onTeamChange: (id: number | null, name: string) => void;
  showManualFallback?: boolean;
}

const SearchableDropdown = ({
  label,
  options,
  loading,
  value,
  displayValue,
  placeholder,
  emptyText,
  onSelect,
  visible,
  renderOption,
}: {
  label: string;
  options: Option[];
  loading: boolean;
  value: number | null;
  displayValue: string;
  placeholder: string;
  emptyText: string;
  onSelect: (opt: Option | null) => void;
  visible: boolean;
  renderOption?: (opt: Option) => React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!visible) return null;

  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-in slide-in-from-top-2 duration-300" ref={ref}>
      <Label className="text-sm font-medium">{label}</Label>
      <div className="relative mt-1.5">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm text-left transition-colors bg-card",
            open ? "border-primary ring-1 ring-primary/20" : "border-border hover:border-muted-foreground"
          )}
        >
          <span className={value ? "text-foreground" : "text-muted-foreground"}>
            {displayValue || placeholder}
          </span>
          <div className="flex items-center gap-1">
            {value && (
              <X
                className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
                onClick={(e) => { e.stopPropagation(); onSelect(null); setSearch(""); }}
              />
            )}
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
          </div>
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-60 overflow-hidden">
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-48">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">{emptyText}</div>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => { onSelect(opt); setOpen(false); setSearch(""); }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-secondary/50 transition-colors",
                      value === opt.id && "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    {renderOption ? renderOption(opt) : (
                      <>
                        {(opt.flag_url || opt.logo_url) && (
                          <img src={opt.flag_url || opt.logo_url || ""} alt="" className="h-4 w-4 object-contain shrink-0" />
                        )}
                        <span className="truncate">{opt.name}</span>
                      </>
                    )}
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

const FootballDropdowns = ({
  countryId, leagueId, teamId,
  countryName = "", leagueName = "", teamName = "",
  onCountryChange, onLeagueChange, onTeamChange,
  showManualFallback = true,
}: FootballDropdownsProps) => {
  const [countries, setCountries] = useState<Option[]>([]);
  const [leagues, setLeagues] = useState<Option[]>([]);
  const [teams, setTeams] = useState<Option[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualCountry, setManualCountry] = useState(countryName);
  const [manualLeague, setManualLeague] = useState(leagueName);
  const [manualTeam, setManualTeam] = useState(teamName);

  // Fetch countries
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("football_countries")
        .select("id, name, code, flag_url")
        .eq("is_active", true)
        .order("name");
      setCountries((data as Option[]) || []);
      setLoadingCountries(false);
    };
    fetch();
  }, []);

  // Fetch leagues when country changes
  useEffect(() => {
    if (!countryId) { setLeagues([]); return; }
    setLoadingLeagues(true);
    const fetch = async () => {
      const { data } = await supabase
        .from("football_leagues")
        .select("id, name, logo_url")
        .eq("country_id", countryId)
        .eq("is_active", true)
        .order("name");
      setLeagues((data as Option[]) || []);
      setLoadingLeagues(false);
    };
    fetch();
  }, [countryId]);

  // Fetch teams when league changes
  useEffect(() => {
    if (!leagueId) { setTeams([]); return; }
    setLoadingTeams(true);
    const fetch = async () => {
      const { data } = await supabase
        .from("football_teams")
        .select("id, name, logo_url")
        .eq("league_id", leagueId)
        .eq("is_active", true)
        .order("name");
      setTeams((data as Option[]) || []);
      setLoadingTeams(false);
    };
    fetch();
  }, [leagueId]);

  if (manualMode) {
    return (
      <div className="space-y-3">
        <div>
          <Label>Country</Label>
          <Input value={manualCountry} onChange={(e) => { setManualCountry(e.target.value); onCountryChange(null, e.target.value); }} placeholder="e.g. Moldova" className="mt-1.5 bg-card" />
        </div>
        <div>
          <Label>League</Label>
          <Input value={manualLeague} onChange={(e) => { setManualLeague(e.target.value); onLeagueChange(null, e.target.value); }} placeholder="e.g. Super Liga" className="mt-1.5 bg-card" />
        </div>
        <div>
          <Label>Team</Label>
          <Input value={manualTeam} onChange={(e) => { setManualTeam(e.target.value); onTeamChange(null, e.target.value); }} placeholder="e.g. FC Petrocub" className="mt-1.5 bg-card" />
        </div>
        <button type="button" onClick={() => setManualMode(false)} className="text-xs text-primary hover:underline">
          ← Back to dropdown search
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SearchableDropdown
        label="Country"
        options={countries}
        loading={loadingCountries}
        value={countryId}
        displayValue={countryName}
        placeholder="Select country..."
        emptyText="No countries found"
        visible={true}
        onSelect={(opt) => {
          onCountryChange(opt?.id || null, opt?.name || "");
          onLeagueChange(null, "");
          onTeamChange(null, "");
        }}
        renderOption={(opt) => (
          <>
            {opt.flag_url && <img src={opt.flag_url} alt="" className="h-4 w-5 object-contain shrink-0" />}
            <span className="truncate">{opt.name}</span>
          </>
        )}
      />

      <SearchableDropdown
        label="League"
        options={leagues}
        loading={loadingLeagues}
        value={leagueId}
        displayValue={leagueName}
        placeholder="Select league..."
        emptyText={countryId ? "No leagues found for this country" : "Select a country first"}
        visible={!!countryId}
        onSelect={(opt) => {
          onLeagueChange(opt?.id || null, opt?.name || "");
          onTeamChange(null, "");
        }}
        renderOption={(opt) => (
          <>
            {opt.logo_url && <img src={opt.logo_url} alt="" className="h-4 w-4 object-contain shrink-0" />}
            <span className="truncate">{opt.name}</span>
          </>
        )}
      />

      <SearchableDropdown
        label="Team"
        options={teams}
        loading={loadingTeams}
        value={teamId}
        displayValue={teamName}
        placeholder="Select team..."
        emptyText={leagueId ? "No teams found for this league" : "Select a league first"}
        visible={!!leagueId}
        onSelect={(opt) => {
          onTeamChange(opt?.id || null, opt?.name || "");
        }}
        renderOption={(opt) => (
          <>
            {opt.logo_url && <img src={opt.logo_url} alt="" className="h-4 w-4 object-contain shrink-0" />}
            <span className="truncate">{opt.name}</span>
          </>
        )}
      />

      {showManualFallback && (
        <button type="button" onClick={() => setManualMode(true)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Can't find your team? Enter manually →
        </button>
      )}
    </div>
  );
};

export default FootballDropdowns;
