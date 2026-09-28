import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function removeDiacritics(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

interface Team {
  id: number;
  name: string;
  league_name: string;
  country_name: string;
}

interface OpponentSearchProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const OpponentSearch = ({ value, onChange, className }: OpponentSearchProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!search || search.length < 2) { setTeams([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from("football_teams")
        .select("id, name, league_id, country_id")
        .eq("is_active", true)
        .order("name");
      
      if (!data) { setTeams([]); setLoading(false); return; }

      const norm = removeDiacritics(search.toLowerCase());
      const filtered = data.filter(t => removeDiacritics(t.name.toLowerCase()).includes(norm)).slice(0, 15);

      // Fetch league/country names
      const leagueIds = [...new Set(filtered.map(t => t.league_id).filter(Boolean))];
      const countryIds = [...new Set(filtered.map(t => t.country_id).filter(Boolean))];

      const [leaguesRes, countriesRes] = await Promise.all([
        leagueIds.length ? supabase.from("football_leagues").select("id, name").in("id", leagueIds) : { data: [] },
        countryIds.length ? supabase.from("football_countries").select("id, name").in("id", countryIds) : { data: [] },
      ]);

      const leagueMap = new Map((leaguesRes.data || []).map(l => [l.id, l.name]));
      const countryMap = new Map((countriesRes.data || []).map(c => [c.id, c.name]));

      setTeams(filtered.map(t => ({
        id: t.id,
        name: t.name,
        league_name: leagueMap.get(t.league_id!) || "",
        country_name: countryMap.get(t.country_id!) || "",
      })));
      setLoading(false);
    }, 200);
  }, [search]);

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          className={cn(
            "w-full pl-9 pr-8 py-2.5 rounded-lg border text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 border-border",
            className
          )}
          placeholder="e.g. FC Milsami"
          value={search}
          onChange={(e) => { setSearch(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => search.length >= 2 && setOpen(true)}
        />
        {search && (
          <X
            className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => { setSearch(""); onChange(""); setTeams([]); }}
          />
        )}
      </div>
      {open && teams.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-48 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            teams.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setSearch(t.name); onChange(t.name); setOpen(false); }}
                className="w-full px-3 py-2 text-sm text-left hover:bg-secondary/50 transition-colors"
              >
                <span className="font-medium text-foreground">{t.name}</span>
                {(t.league_name || t.country_name) && (
                  <span className="text-xs text-muted-foreground ml-1.5">
                    ({[t.league_name, t.country_name].filter(Boolean).join(", ")})
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default OpponentSearch;
