import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Search, RefreshCw, Globe, Trophy, Users, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Tab = "countries" | "leagues" | "teams" | "sync";

const AdminFootballDatabase = () => {
  const [tab, setTab] = useState<Tab>("countries");
  const [countries, setCountries] = useState<any[]>([]);
  const [leagues, setLeagues] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCountry, setFilterCountry] = useState<number | null>(null);
  const [filterLeague, setFilterLeague] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncLog, setSyncLog] = useState<string[]>([]);
  const [syncProgress, setSyncProgress] = useState<any[]>([]);

  // Add/Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const fetchData = async () => {
    setLoading(true);
    const [c, l, t, sp] = await Promise.all([
      supabase.from("football_countries").select("*").order("name"),
      supabase.from("football_leagues").select("*").order("name"),
      supabase.from("football_teams").select("*").order("name"),
      supabase.from("sync_progress").select("*").order("synced_at", { ascending: false }),
    ]);
    setCountries(c.data || []);
    setLeagues(l.data || []);
    setTeams(t.data || []);
    setSyncProgress(sp.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const toggleActive = async (table: string, id: number, currentVal: boolean) => {
    await (supabase.from(table as any) as any).update({ is_active: !currentVal }).eq("id", id);
    fetchData();
    toast.success("Updated");
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncLog(["Starting sync..."]);
    try {
      const { data, error } = await supabase.functions.invoke("sync-football-data");
      if (error) throw error;
      setSyncLog(data?.log || ["Sync completed"]);
      toast.success(`Sync complete: ${data?.requests_used || 0} API requests used`);
      fetchData();
    } catch (err: any) {
      setSyncLog(prev => [...prev, `Error: ${err.message}`]);
      toast.error("Sync failed");
    }
    setSyncing(false);
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

  const lastSync = syncProgress.length > 0 ? syncProgress[0].synced_at : null;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "countries", label: "Countries", icon: <Globe size={16} /> },
    { key: "leagues", label: "Leagues", icon: <Trophy size={16} /> },
    { key: "teams", label: "Teams", icon: <Users size={16} /> },
    { key: "sync", label: "Sync", icon: <Zap size={16} /> },
  ];

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-foreground mb-6">Football Database</h1>

      <div className="flex gap-2 mb-6">
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
      ) : tab === "sync" ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-semibold text-foreground mb-2">API-Football Sync</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Sync countries, leagues, and teams from API-Football. Free plan: 100 requests/day.
            </p>
            {lastSync && (
              <p className="text-xs text-muted-foreground mb-4">Last sync: {new Date(lastSync).toLocaleString()}</p>
            )}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm text-muted-foreground">Database: {countries.length} countries · {leagues.length} leagues · {teams.length} teams</span>
            </div>
            <Button onClick={handleSync} disabled={syncing} className="bg-primary text-primary-foreground">
              {syncing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Syncing...</> : <><RefreshCw className="h-4 w-4 mr-2" /> Sync from API-Football</>}
            </Button>
          </div>
          {syncLog.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-medium text-foreground mb-2">Sync Log</h3>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {syncLog.map((line, i) => (
                  <p key={i} className="text-xs text-muted-foreground font-mono">{line}</p>
                ))}
              </div>
            </div>
          )}
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
                  <div><Label>Code (ISO)</Label><Input value={formData.code || ""} onChange={e => setFormData(p => ({ ...p, code: e.target.value }))} className="mt-1 bg-background" placeholder="e.g. MD" /></div>
                  <div><Label>Flag URL</Label><Input value={formData.flag_url || ""} onChange={e => setFormData(p => ({ ...p, flag_url: e.target.value }))} className="mt-1 bg-background" /></div>
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
