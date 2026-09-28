import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

const PAGE_SIZE = 20;

const AdminReports = () => {
  const { loading: authLoading } = useAdmin();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, pdf: 0, screenshot: 0, manual: 0, avgCpi: 0 });
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userReports, setUserReports] = useState<any[]>([]);

  const fetchReports = async () => {
    setLoading(true);
    const { data, count } = await supabase
      .from("reports")
      .select("id, ai_report, created_at, player_id, sessions(session_type, input_method, session_date), profiles!reports_player_id_fkey(full_name, username, subscription_plan, country, current_club, position_specific, position)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    setReports(data || []);
    setTotal(count || 0);

    const { data: all } = await supabase.from("reports").select("ai_report, sessions(input_method)");
    const allReports = all || [];
    const pdfCount = allReports.filter((r: any) => r.sessions?.input_method === "pdf_upload").length;
    const ssCount = allReports.filter((r: any) => r.sessions?.input_method === "screenshot").length;
    const manCount = allReports.filter((r: any) => r.sessions?.input_method === "manual").length;
    const cpis = allReports.map((r: any) => r.ai_report?.cpi).filter(Boolean).map(Number);
    const avgCpi = cpis.length ? cpis.reduce((a: number, b: number) => a + b, 0) / cpis.length : 0;
    setStats({ total: allReports.length, pdf: pdfCount, screenshot: ssCount, manual: manCount, avgCpi });
    setLoading(false);
  };

  useEffect(() => { if (!authLoading) fetchReports(); }, [authLoading, page]);

  const openUserProfile = async (playerId: string) => {
    const { data: profile } = await supabase.from("profiles")
      .select("*, player_stats_aggregate(avg_performance_score, trust_score, total_sessions)")
      .eq("id", playerId).single();
    const { data: reports } = await supabase.from("reports")
      .select("id, ai_report, created_at, sessions(session_type, input_method)")
      .eq("player_id", playerId).order("created_at", { ascending: false });
    setSelectedUser(profile);
    setUserReports(reports || []);
  };

  // Group reports by player_id and get per-player stats
  const getPlayerStats = (playerId: string) => {
    const playerReports = reports.filter(r => r.player_id === playerId);
    const cpis = playerReports.map(r => r.ai_report?.cpi).filter(Boolean).map(Number);
    const avgCpi = cpis.length ? cpis.reduce((a, b) => a + b, 0) / cpis.length : 0;
    return { avgCpi, count: playerReports.length };
  };

  if (authLoading) return <AdminLayout><Loader2 className="animate-spin text-primary mx-auto mt-32" size={32} /></AdminLayout>;

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Reports</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { l: "Total", v: stats.total },
          { l: "PDF", v: stats.pdf },
          { l: "Screenshot", v: stats.screenshot },
          { l: "Manual", v: stats.manual },
          { l: "Avg CPI", v: stats.avgCpi.toFixed(1) },
        ].map(s => (
          <Card key={s.l}><CardContent className="p-3"><p className="text-xs text-muted-foreground">{s.l}</p><p className="text-xl font-bold">{s.v}</p></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="p-3 text-muted-foreground font-medium">Player</th>
                  <th className="p-3 text-muted-foreground font-medium">Type</th>
                  <th className="p-3 text-muted-foreground font-medium">CPI</th>
                  <th className="p-3 text-muted-foreground font-medium">Avg CPI</th>
                  <th className="p-3 text-muted-foreground font-medium">Input</th>
                  <th className="p-3 text-muted-foreground font-medium">Date</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
                ) : reports.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No reports generated yet</td></tr>
                ) : reports.map((r: any) => {
                  const ps = getPlayerStats(r.player_id);
                  return (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => openUserProfile(r.player_id)}>
                      <td className="p-3 text-primary hover:underline">{(r.profiles as any)?.full_name || "—"}</td>
                      <td className="p-3 capitalize">{r.sessions?.session_type || "—"}</td>
                      <td className="p-3">{r.ai_report?.cpi || "—"}</td>
                      <td className="p-3">{ps.avgCpi ? ps.avgCpi.toFixed(1) : "—"}</td>
                      <td className="p-3">{r.sessions?.input_method || "—"}</td>
                      <td className="p-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <a href={`/report/${r.id}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          <ExternalLink size={14} />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mt-4">
        <span className="text-sm text-muted-foreground">{total} reports total</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></Button>
          <span className="text-sm py-1 px-2">Page {page + 1}</span>
          <Button variant="outline" size="sm" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></Button>
        </div>
      </div>

      {/* User profile dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selectedUser?.full_name || "User Detail"}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <p><span className="text-muted-foreground">Username:</span> {selectedUser?.username || "—"}</p>
              <p><span className="text-muted-foreground">Position:</span> {selectedUser?.position_specific || selectedUser?.position || "—"}</p>
              <p><span className="text-muted-foreground">Club:</span> {selectedUser?.current_club || "—"}</p>
              <p><span className="text-muted-foreground">Country:</span> {selectedUser?.country || "—"}</p>
              <p><span className="text-muted-foreground">Plan:</span> {selectedUser?.subscription_plan}</p>
              <p><span className="text-muted-foreground">Trust:</span> {(Array.isArray(selectedUser?.player_stats_aggregate) ? selectedUser?.player_stats_aggregate[0] : selectedUser?.player_stats_aggregate)?.trust_score || 0}</p>
            </div>

            <div className="pt-3 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">Reports ({userReports.length})</p>
              {userReports.length === 0 ? (
                <p className="text-muted-foreground text-center py-2">No reports</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {userReports.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                      <div>
                        <span className="capitalize">{r.sessions?.session_type || "—"}</span>
                        <span className="text-muted-foreground ml-2">CPI: {r.ai_report?.cpi || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                        <a href={`/report/${r.id}`} target="_blank" rel="noopener noreferrer" className="text-primary">
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminReports;
