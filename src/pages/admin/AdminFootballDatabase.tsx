import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, Search, Globe, Trophy, Users, Upload, ChevronDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Tab = "countries" | "leagues" | "teams" | "import";

interface ImportCountry {
  name: string;
  code?: string;
  flag_url?: string;
  leagues?: {
    name: string;
    type?: string;
    season?: number;
    teams?: string[];
  }[];
}

const JSON_EXAMPLE = `{
  "countries": [
    {
      "name": "Country Name",
      "code": "XX",
      "flag_url": "https://flagcdn.com/w80/xx.png",
      "leagues": [
        {
          "name": "League Name",
          "type": "league",
          "season": 2025,
          "teams": [
            "Team Name 1",
            "Team Name 2"
          ]
        }
      ]
    }
  ]
}`;

const AdminFootballDatabase = () => {
  const [tab, setTab] = useState<Tab>("countries");
  const [countries, setCountries] = useState<any[]>([]);
  const [leagues, setLeagues] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCountry, setFilterCountry] = useState<number | null>(null);
  const [filterLeague, setFilterLeague] = useState<number | null>(null);

  // Add/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Import state
  const [jsonText, setJsonText] = useState("");
  const [importPreview, setImportPreview] = useState<string[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");

  // Clear all state
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearInput, setClearInput] = useState("");
  const [clearing, setClearing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [c, l, t] = await Promise.all([
      supabase.from("football_countries").select("*").order("name"),
      supabase.from("football_leagues").select("*").order("name"),
      supabase.from("football_teams").select("*").order("name"),
    ]);
    setCountries(c.data || []);
    setLeagues(l.data || []);
    setTeams(t.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const toggleActive = async (table: string, id: number, currentVal: boolean) => {
    await (supabase.from(table as any) as any).update({ is_active: !currentVal }).eq("id", id);
    fetchData();
    toast.success("Updated");
  };

  const handleSaveItem = async () => {
    try {
      if (tab === "countries") {
        const payload = { name: formData.name, code: formData.code || null, flag_url: formData.flag_url || null, id: formData.id || Math.floor(Math.random() * 900000) + 100000 };
        if (editItem) {
          await supabase.from("football_countries").update(payload).eq("id", editItem.id);
        } else {
          await supabase.from("football_countries").insert(payload);
        }
      } else if (tab === "leagues") {
        const payload = { name: formData.name, country_id: formData.country_id, logo_url: formData.logo_url || null, type: formData.type || "league", season: formData.season || 2025, id: formData.id || Math.floor(Math.random() * 900000) + 100000 };
        if (editItem) {
          await supabase.from("football_leagues").update(payload).eq("id", editItem.id);
        } else {
          await supabase.from("football_leagues").insert(payload);
        }
      } else if (tab === "teams") {
        const payload = { name: formData.name, league_id: formData.league_id, country_id: formData.country_id, logo_url: formData.logo_url || null, id: formData.id || Math.floor(Math.random() * 900000) + 100000 };
        if (editItem) {
          await supabase.from("football_teams").update(payload).eq("id", editItem.id);
        } else {
          await supabase.from("football_teams").insert(payload);
        }
      }
      toast.success(editItem ? "Updated" : "Added");
      setShowModal(false);
      setEditItem(null);
      setFormData({});
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const openAdd = () => { setEditItem(null); setFormData({}); setShowModal(true); };
  const openEdit = (item: any) => { setEditItem(item); setFormData({ ...item }); setShowModal(true); };

  // Auto-generate flag URL from code
  const handleCodeChange = (code: string) => {
    setFormData(p => ({
      ...p,
      code,
      flag_url: code.length === 2 ? `https://flagcdn.com/w80/${code.toLowerCase()}.png` : p.flag_url,
    }));
  };

  const filteredCountries = countries.filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase()));
  const filteredLeagues = leagues.filter(l => {
    if (search && !l.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCountry && l.country_id !== filterCountry) return false;
    return true;
  });
  const filteredTeams = teams.filter(t => {
    if (search && !t.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCountry && t.country_id !== filterCountry) return false;
    if (filterLeague && t.league_id !== filterLeague) return false;
    return true;
  });

  const countryName = (id: number) => countries.find(c => c.id === id)?.name || "—";
  const leagueName = (id: number) => leagues.find(l => l.id === id)?.name || "—";
  const leaguesForCountry = (cid: number) => leagues.filter(l => l.country_id === cid).length;
  const teamsForCountry = (cid: number) => teams.filter(t => t.country_id === cid).length;
  const teamsForLeague = (lid: number) => teams.filter(t => t.league_id === lid).length;

  // ---- JSON Import Logic ----
  const parseJson = (): { data: ImportCountry[] | null; error: string } => {
    if (!jsonText.trim()) return { data: null, error: "JSON is empty." };
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed.countries || !Array.isArray(parsed.countries)) return { data: null, error: "JSON structure doesn't match the expected format. See the example above." };
      for (const c of parsed.countries) {
        if (!c.name) return { data: null, error: "Each country must have a 'name' field." };
      }
      return { data: parsed.countries, error: "" };
    } catch {
      return { data: null, error: "Invalid JSON format. Please check your syntax." };
    }
  };

  const handlePreview = () => {
    const { data, error } = parseJson();
    if (error) { setImportError(error); setImportPreview(null); return; }
    setImportError("");
    const log: string[] = [];
    let newC = 0, newL = 0, newT = 0, skipC = 0, skipL = 0, skipT = 0;

    for (const c of data!) {
      const existingCountry = countries.find(ec => ec.name.toLowerCase() === c.name.toLowerCase());
      if (existingCountry) { log.push(`⏭️ Skipped country: ${c.name} (already exists)`); skipC++; }
      else { log.push(`✅ Will add country: ${c.name}`); newC++; }

      for (const l of c.leagues || []) {
        const countryId = existingCountry?.id;
        const existingLeague = leagues.find(el => el.name.toLowerCase() === l.name.toLowerCase() && (countryId ? el.country_id === countryId : false));
        if (existingLeague) { log.push(`⏭️ Skipped league: ${l.name} (${c.name}) (already exists)`); skipL++; }
        else { log.push(`✅ Will add league: ${l.name} (${c.name})`); newL++; }

        for (const teamName of l.teams || []) {
          const leagueId = existingLeague?.id;
          const existingTeam = teams.find(et => et.name.toLowerCase() === teamName.toLowerCase() && (leagueId ? et.league_id === leagueId : false));
          if (existingTeam) { log.push(`⏭️ Skipped team: ${teamName} (already exists in ${l.name})`); skipT++; }
          else { log.push(`✅ Will add team: ${teamName} (${l.name}, ${c.name})`); newT++; }
        }
      }
    }

    log.unshift(`Summary: ${newC} new countries, ${newL} new leagues, ${newT} new teams. Skipping: ${skipC} countries, ${skipL} leagues, ${skipT} teams.`);
    setImportPreview(log);
  };

  const getNextId = (existing: any[]) => {
    if (existing.length === 0) return 1;
    return Math.max(...existing.map((e: any) => e.id)) + 1;
  };

  const handleImport = async () => {
    const { data, error } = parseJson();
    if (error) { setImportError(error); return; }
    setImporting(true);
    setImportError("");
    const log: string[] = [];

    // Refresh data first
    const [cRes, lRes, tRes] = await Promise.all([
      supabase.from("football_countries").select("*"),
      supabase.from("football_leagues").select("*"),
      supabase.from("football_teams").select("*"),
    ]);
    let allCountries = cRes.data || [];
    let allLeagues = lRes.data || [];
    let allTeams = tRes.data || [];
    let nextCountryId = getNextId(allCountries);
    let nextLeagueId = getNextId(allLeagues);
    let nextTeamId = getNextId(allTeams);

    for (const c of data!) {
      let countryId: number;
      const existing = allCountries.find(ec => ec.name.toLowerCase() === c.name.toLowerCase());
      if (existing) {
        countryId = existing.id;
        log.push(`⏭️ Skipped country: ${c.name} (already exists)`);
      } else {
        countryId = nextCountryId++;
        const { error: insertErr } = await supabase.from("football_countries").insert({
          id: countryId, name: c.name, code: c.code || null,
          flag_url: c.flag_url || null, is_active: true,
        });
        if (insertErr) { log.push(`❌ Error adding country ${c.name}: ${insertErr.message}`); continue; }
        allCountries.push({ id: countryId, name: c.name, code: c.code || null, flag_url: c.flag_url || null, is_active: true } as any);
        log.push(`✅ Added country: ${c.name}`);
      }

      for (const l of c.leagues || []) {
        let leagueId: number;
        const existingLeague = allLeagues.find(el => el.name.toLowerCase() === l.name.toLowerCase() && el.country_id === countryId);
        if (existingLeague) {
          leagueId = existingLeague.id;
          log.push(`⏭️ Skipped league: ${l.name} (${c.name}) (already exists)`);
        } else {
          leagueId = nextLeagueId++;
          const { error: insertErr } = await supabase.from("football_leagues").insert({
            id: leagueId, name: l.name, country_id: countryId,
            type: l.type || "league", season: l.season || 2025, is_active: true,
          });
          if (insertErr) { log.push(`❌ Error adding league ${l.name}: ${insertErr.message}`); continue; }
          allLeagues.push({ id: leagueId, name: l.name, country_id: countryId, type: l.type || "league", season: l.season || 2025, is_active: true, logo_url: null } as any);
          log.push(`✅ Added league: ${l.name} (${c.name})`);
        }

        for (const teamName of l.teams || []) {
          const existingTeam = allTeams.find(et => et.name.toLowerCase() === teamName.toLowerCase() && et.league_id === leagueId);
          if (existingTeam) {
            log.push(`⏭️ Skipped team: ${teamName} (already exists in ${l.name})`);
            continue;
          }
          const teamId = nextTeamId++;
          const { error: insertErr } = await supabase.from("football_teams").insert({
            id: teamId, name: teamName, league_id: leagueId,
            country_id: countryId, is_active: true,
          });
          if (insertErr) { log.push(`❌ Error adding team ${teamName}: ${insertErr.message}`); }
          else {
            allTeams.push({ id: teamId, name: teamName, league_id: leagueId, country_id: countryId, is_active: true, logo_url: null } as any);
            log.push(`✅ Added team: ${teamName} (${l.name}, ${c.name})`);
          }
        }
      }
    }

    setImportPreview(log);
    setImporting(false);
    fetchData();
    toast.success("Import completed!");
  };

  const handleClearAll = async () => {
    setClearing(true);
    await supabase.from("profiles").update({ country_id: null, league_id: null, team_id: null } as any).not("country_id", "is", null);
    await (supabase.from("football_teams") as any).delete().neq("id", 0);
    await (supabase.from("football_leagues") as any).delete().neq("id", 0);
    await (supabase.from("football_countries") as any).delete().neq("id", 0);
    setClearing(false);
    setShowClearConfirm(false);
    setClearInput("");
    fetchData();
    toast.success("All football data cleared");
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "countries", label: "Countries", icon: <Globe size={16} /> },
    { key: "leagues", label: "Leagues", icon: <Trophy size={16} /> },
    { key: "teams", label: "Teams", icon: <Users size={16} /> },
    { key: "import", label: "Import JSON", icon: <Upload size={16} /> },
  ];

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-foreground mb-6">Football Database</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSearch(""); setFilterCountry(null); setFilterLeague(null); }}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              tab === t.key ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border hover:text-foreground"
            )}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin" /></div>
      ) : tab === "import" ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-semibold text-foreground mb-2">Import Football Data from JSON</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Paste a JSON with the same structure as the example below to add new countries, leagues, and teams. Existing data will NOT be deleted — new entries will be ADDED to the database. If a country/league/team with the same name already exists, it will be skipped (no duplicates).
            </p>

            <p className="text-xs text-muted-foreground mb-4">
              Database: {countries.length} countries · {leagues.length} leagues · {teams.length} teams
            </p>

            <Textarea
              value={jsonText}
              onChange={(e) => { setJsonText(e.target.value); setImportError(""); setImportPreview(null); }}
              placeholder="Paste your JSON here..."
              className="min-h-[280px] font-mono text-xs bg-[hsl(var(--background))] border-border"
            />

            {importError && (
              <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                {importError}
              </div>
            )}

            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mt-4 transition-colors">
                <ChevronDown size={14} /> JSON format example
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="mt-2 p-4 rounded-lg bg-muted/50 border border-border text-xs font-mono text-muted-foreground overflow-x-auto">
                  {JSON_EXAMPLE}
                </pre>
              </CollapsibleContent>
            </Collapsible>

            <div className="flex gap-3 mt-5">
              <Button variant="outline" onClick={handlePreview} disabled={!jsonText.trim()}>
                Preview import
              </Button>
              <Button onClick={handleImport} disabled={!jsonText.trim() || importing} className="bg-primary text-primary-foreground">
                {importing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Importing...</> : "Import now"}
              </Button>
            </div>
          </div>

          {importPreview && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-medium text-foreground mb-3">Import Log</h3>
              <div className="max-h-80 overflow-y-auto space-y-1">
                {importPreview.map((line, i) => (
                  <p key={i} className={cn(
                    "text-xs font-mono",
                    line.startsWith("✅") ? "text-primary" :
                    line.startsWith("⏭️") ? "text-muted-foreground" :
                    line.startsWith("❌") ? "text-destructive" :
                    "text-foreground font-semibold"
                  )}>{line}</p>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-destructive/30 bg-card p-6">
            <h3 className="text-sm font-semibold text-destructive mb-2">Danger Zone</h3>
            <p className="text-xs text-muted-foreground mb-4">Clear ALL countries, leagues, and teams from the database. This cannot be undone.</p>
            <Button variant="destructive" size="sm" onClick={() => setShowClearDialog(true)}>
              <Trash2 className="h-4 w-4 mr-1.5" /> Clear all football data
            </Button>
          </div>

          {/* First confirmation */}
          <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete ALL countries, leagues, and teams from the database. Player profile references will also be cleared.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => { setShowClearDialog(false); setShowClearConfirm(true); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Second confirmation */}
          <AlertDialog open={showClearConfirm} onOpenChange={(o) => { setShowClearConfirm(o); if (!o) setClearInput(""); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Type DELETE to confirm</AlertDialogTitle>
                <AlertDialogDescription>
                  <Input
                    value={clearInput}
                    onChange={(e) => setClearInput(e.target.value)}
                    placeholder='Type "DELETE"'
                    className="mt-3 bg-background"
                  />
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={clearInput !== "DELETE" || clearing}
                  onClick={handleClearAll}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {clearing ? "Clearing..." : "Delete everything"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-9 bg-card" />
            </div>
            {(tab === "leagues" || tab === "teams") && (
              <select
                value={filterCountry || ""}
                onChange={(e) => setFilterCountry(e.target.value ? Number(e.target.value) : null)}
                className="px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground"
              >
                <option value="">All countries</option>
                {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            {tab === "teams" && filterCountry && (
              <select
                value={filterLeague || ""}
                onChange={(e) => setFilterLeague(e.target.value ? Number(e.target.value) : null)}
                className="px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground"
              >
                <option value="">All leagues</option>
                {leagues.filter(l => l.country_id === filterCountry).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            )}
            <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {tab === "countries" && <><th className="px-4 py-3 text-left font-medium text-muted-foreground">Flag</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Leagues</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Teams</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Active</th><th className="px-4 py-3"></th></>}
                    {tab === "leagues" && <><th className="px-4 py-3 text-left font-medium text-muted-foreground">Logo</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Country</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Teams</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Active</th><th className="px-4 py-3"></th></>}
                    {tab === "teams" && <><th className="px-4 py-3 text-left font-medium text-muted-foreground">Logo</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">League</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Country</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Active</th><th className="px-4 py-3"></th></>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tab === "countries" && filteredCountries.map(c => (
                    <tr key={c.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5">{c.flag_url ? <img src={c.flag_url} alt="" className="h-4 w-6 object-contain" /> : "—"}</td>
                      <td className="px-4 py-2.5 font-medium text-foreground">{c.name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{c.code || "—"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{leaguesForCountry(c.id)}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{teamsForCountry(c.id)}</td>
                      <td className="px-4 py-2.5"><Switch checked={c.is_active} onCheckedChange={() => toggleActive("football_countries", c.id, c.is_active)} /></td>
                      <td className="px-4 py-2.5"><button onClick={() => openEdit(c)} className="text-xs text-primary hover:underline">Edit</button></td>
                    </tr>
                  ))}
                  {tab === "leagues" && filteredLeagues.map(l => (
                    <tr key={l.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5">{l.logo_url ? <img src={l.logo_url} alt="" className="h-5 w-5 object-contain" /> : "—"}</td>
                      <td className="px-4 py-2.5 font-medium text-foreground">{l.name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{countryName(l.country_id)}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{teamsForLeague(l.id)}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{l.type}</td>
                      <td className="px-4 py-2.5"><Switch checked={l.is_active} onCheckedChange={() => toggleActive("football_leagues", l.id, l.is_active)} /></td>
                      <td className="px-4 py-2.5"><button onClick={() => openEdit(l)} className="text-xs text-primary hover:underline">Edit</button></td>
                    </tr>
                  ))}
                  {tab === "teams" && filteredTeams.map(t => (
                    <tr key={t.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5">{t.logo_url ? <img src={t.logo_url} alt="" className="h-5 w-5 object-contain" /> : "—"}</td>
                      <td className="px-4 py-2.5 font-medium text-foreground">{t.name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{leagueName(t.league_id)}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{countryName(t.country_id)}</td>
                      <td className="px-4 py-2.5"><Switch checked={t.is_active} onCheckedChange={() => toggleActive("football_teams", t.id, t.is_active)} /></td>
                      <td className="px-4 py-2.5"><button onClick={() => openEdit(t)} className="text-xs text-primary hover:underline">Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-4">{editItem ? "Edit" : "Add"} {tab.slice(0, -1)}</h3>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={formData.name || ""} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className="mt-1 bg-background" /></div>
              {tab === "countries" && (
                <>
                  <div>
                    <Label>Code (ISO)</Label>
                    <Input value={formData.code || ""} onChange={e => handleCodeChange(e.target.value)} className="mt-1 bg-background" placeholder="e.g. MD" />
                  </div>
                  <div>
                    <Label>Flag URL</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input value={formData.flag_url || ""} onChange={e => setFormData(p => ({ ...p, flag_url: e.target.value }))} className="bg-background flex-1" />
                      {formData.flag_url && <img src={formData.flag_url} alt="flag preview" className="h-5 w-7 object-contain border border-border rounded" />}
                    </div>
                  </div>
                </>
              )}
              {tab === "leagues" && (
                <>
                  <div>
                    <Label>Country</Label>
                    <select value={formData.country_id || ""} onChange={e => setFormData(p => ({ ...p, country_id: Number(e.target.value) }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground">
                      <option value="">Select...</option>
                      {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div><Label>Logo URL</Label><Input value={formData.logo_url || ""} onChange={e => setFormData(p => ({ ...p, logo_url: e.target.value }))} className="mt-1 bg-background" /></div>
                  <div><Label>Type</Label><Input value={formData.type || "league"} onChange={e => setFormData(p => ({ ...p, type: e.target.value }))} className="mt-1 bg-background" /></div>
                  <div><Label>Season</Label><Input type="number" value={formData.season || 2025} onChange={e => setFormData(p => ({ ...p, season: Number(e.target.value) }))} className="mt-1 bg-background" /></div>
                </>
              )}
              {tab === "teams" && (
                <>
                  <div>
                    <Label>Country</Label>
                    <select value={formData.country_id || ""} onChange={e => setFormData(p => ({ ...p, country_id: Number(e.target.value), league_id: null }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground">
                      <option value="">Select...</option>
                      {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>League</Label>
                    <select value={formData.league_id || ""} onChange={e => setFormData(p => ({ ...p, league_id: Number(e.target.value) }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground">
                      <option value="">Select...</option>
                      {leagues.filter(l => l.country_id === formData.country_id).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <div><Label>Logo URL</Label><Input value={formData.logo_url || ""} onChange={e => setFormData(p => ({ ...p, logo_url: e.target.value }))} className="mt-1 bg-background" /></div>
                </>
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary text-primary-foreground" onClick={handleSaveItem}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminFootballDatabase;
