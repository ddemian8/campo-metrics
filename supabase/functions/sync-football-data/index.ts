import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API_BASE = "https://v3.football.api-sports.io";
const MAX_REQUESTS = 95;

const PRIORITY_COUNTRIES = [
  "Moldova", "Romania", "Bulgaria", "Serbia", "Ukraine", "Georgia", "Albania",
  "North Macedonia", "Montenegro", "Bosnia And Herzegovina", "Croatia", "Hungary",
  "Poland", "Czech Republic", "Slovakia", "Turkey", "Greece", "Portugal", "Spain",
  "France", "Italy", "Germany", "England", "Netherlands", "Belgium", "Austria",
  "Switzerland", "Sweden", "Denmark", "Norway", "Scotland", "Ireland", "Finland",
  "Iceland", "Russia", "Belarus", "Latvia", "Lithuania", "Estonia", "Armenia",
  "Azerbaijan", "Kazakhstan", "Uzbekistan",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const FOOTBALL_API_KEY = Deno.env.get("FOOTBALL_API_KEY");
  if (!FOOTBALL_API_KEY) {
    return new Response(JSON.stringify({ error: "FOOTBALL_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let requestsUsed = 0;
  const log: string[] = [];

  const apiFetch = async (endpoint: string, params: Record<string, string> = {}) => {
    if (requestsUsed >= MAX_REQUESTS) return null;
    const url = new URL(`${API_BASE}${endpoint}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    requestsUsed++;
    const res = await fetch(url.toString(), {
      headers: { "x-apisports-key": FOOTBALL_API_KEY },
    });
    if (!res.ok) { log.push(`API error ${res.status} for ${endpoint}`); return null; }
    const data = await res.json();
    return data?.response || [];
  };

  try {
    // Check sync progress
    const { data: progress } = await supabase.from("sync_progress").select("*");
    const doneCountries = new Set(
      (progress || []).filter((p: any) => p.sync_type === "countries" && p.status === "done").map((p: any) => p.entity_name)
    );
    const doneLeagues = new Set(
      (progress || []).filter((p: any) => p.sync_type === "leagues" && p.status === "done").map((p: any) => p.entity_id)
    );

    let countriesSynced = 0, leaguesSynced = 0, teamsSynced = 0;

    // Step 1: Fetch countries (1 API call)
    if (!doneCountries.has("__all_countries__")) {
      const countries = await apiFetch("/countries");
      if (countries) {
        for (const c of countries) {
          if (!c.name) continue;
          await supabase.from("football_countries").upsert({
            id: c.name.hashCode ? 0 : Math.abs(hashStr(c.name)),
            name: c.name,
            code: c.code || null,
            flag_url: c.flag || null,
          }, { onConflict: "name" });
          countriesSynced++;
        }
        await supabase.from("sync_progress").upsert({
          sync_type: "countries", entity_name: "__all_countries__", status: "done",
          requests_used: 1, items_synced: countriesSynced, synced_at: new Date().toISOString(),
        }, { onConflict: "sync_type,entity_name" });
        log.push(`Synced ${countriesSynced} countries`);
      }
    } else {
      log.push("Countries already synced");
    }

    // Get country IDs from DB
    const { data: dbCountries } = await supabase.from("football_countries").select("id, name");
    const countryMap = new Map((dbCountries || []).map((c: any) => [c.name, c.id]));

    // Step 2: Fetch leagues for priority countries
    for (const countryName of PRIORITY_COUNTRIES) {
      if (requestsUsed >= MAX_REQUESTS) { log.push("Rate limit approaching, stopping"); break; }
      const countryId = countryMap.get(countryName);
      if (!countryId) continue;
      if (doneLeagues.has(countryId)) continue;

      const leagues = await apiFetch("/leagues", { country: countryName });
      if (!leagues) continue;

      for (const l of leagues) {
        const league = l.league;
        const country = l.country;
        if (!league?.id || !league?.name) continue;
        await supabase.from("football_leagues").upsert({
          id: league.id,
          name: league.name,
          country_id: countryId,
          logo_url: league.logo || null,
          type: league.type || "league",
          season: 2025,
        }, { onConflict: "id" });
        leaguesSynced++;
      }

      await supabase.from("sync_progress").upsert({
        sync_type: "leagues", entity_id: countryId, entity_name: countryName, status: "done",
        requests_used: 1, items_synced: leagues.length, synced_at: new Date().toISOString(),
      }, { onConflict: "sync_type,entity_id" });
      log.push(`Synced ${leagues.length} leagues for ${countryName}`);
    }

    // Step 3: Fetch teams for leagues
    const { data: dbLeagues } = await supabase.from("football_leagues").select("id, name, country_id");
    const doneTeamLeagues = new Set(
      (progress || []).filter((p: any) => p.sync_type === "teams" && p.status === "done").map((p: any) => p.entity_id)
    );

    for (const league of (dbLeagues || [])) {
      if (requestsUsed >= MAX_REQUESTS) { log.push("Rate limit approaching, stopping"); break; }
      if (doneTeamLeagues.has(league.id)) continue;

      const teams = await apiFetch("/teams", { league: String(league.id), season: "2025" });
      if (!teams) continue;

      for (const t of teams) {
        const team = t.team;
        if (!team?.id || !team?.name) continue;
        await supabase.from("football_teams").upsert({
          id: team.id,
          name: team.name,
          league_id: league.id,
          country_id: league.country_id,
          logo_url: team.logo || null,
        }, { onConflict: "id" });
        teamsSynced++;
      }

      await supabase.from("sync_progress").upsert({
        sync_type: "teams", entity_id: league.id, entity_name: league.name, status: "done",
        requests_used: 1, items_synced: teams.length, synced_at: new Date().toISOString(),
      }, { onConflict: "sync_type,entity_id" });
      log.push(`Synced ${teams.length} teams for ${league.name}`);
    }

    return new Response(JSON.stringify({
      success: true,
      requests_used: requestsUsed,
      countries_synced: countriesSynced,
      leagues_synced: leaguesSynced,
      teams_synced: teamsSynced,
      log,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err), log }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function hashStr(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}
