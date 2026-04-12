import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const PAGE_SIZE = 20;

const AdminReports = () => {
  const { loading: authLoading } = useAdmin();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, pdf: 0, screenshot: 0, manual: 0, avgCpi: 0 });

  const fetchReports = async () => {
    setLoading(true);
    let query = supabase
      .from("reports")
      .select("id, ai_report, created_at, sessions(session_type, input_method, session_date), profiles!reports_player_id_fkey(full_name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, count } = await query;
    setReports(data || []);
    setTotal(count || 0);

    // Stats
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
                  <th className="p-3 text-muted-foreground font-medium">Input</th>
                  <th className="p-3 text-muted-foreground font-medium">Date</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
                ) : reports.map((r: any) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3">{(r.profiles as any)?.full_name || "—"}</td>
                    <td className="p-3 capitalize">{r.sessions?.session_type || "—"}</td>
                    <td className="p-3">{r.ai_report?.cpi || "—"}</td>
                    <td className="p-3">{r.sessions?.input_method || "—"}</td>
                    <td className="p-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="p-3"><Link to={`/report/${r.id}`}><ExternalLink size={14} className="text-primary" /></Link></td>
                  </tr>
                ))}
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
    </AdminLayout>
  );
};

export default AdminReports;
