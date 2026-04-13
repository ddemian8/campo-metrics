import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, FileText, Crown, DollarSign, TrendingUp, UserPlus, ArrowUp, ArrowDown } from "lucide-react";
import { AdminDateRangeSelector, getDefaultDateRange, getPreviousPeriod, calcChange, type DateRange } from "@/components/admin/AdminDateRangeSelector";

const AdminDashboard = () => {
  const { loading: authLoading } = useAdmin();
  const [range, setRange] = useState<DateRange>(getDefaultDateRange);
  const [stats, setStats] = useState<any>(null);
  const [prevStats, setPrevStats] = useState<any>(null);
  const [recentSignups, setRecentSignups] = useState<any[]>([]);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    const load = async () => {
      setLoading(true);
      const from = range.from.toISOString();
      const to = range.to.toISOString();
      const prev = getPreviousPeriod(range);
      const prevFrom = prev.from.toISOString();
      const prevTo = prev.to.toISOString();

      const [usersRes, reportsRes, proRes, clubRes, prevUsersRes, prevReportsRes, prevProRes, prevClubRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact" }).gte("created_at", from).lte("created_at", to),
        supabase.from("reports").select("id", { count: "exact" }).gte("created_at", from).lte("created_at", to),
        supabase.from("profiles").select("id", { count: "exact" }).eq("subscription_plan", "player_pro").gte("created_at", from).lte("created_at", to),
        supabase.from("profiles").select("id", { count: "exact" }).eq("subscription_plan", "club").gte("created_at", from).lte("created_at", to),
        supabase.from("profiles").select("id", { count: "exact" }).gte("created_at", prevFrom).lte("created_at", prevTo),
        supabase.from("reports").select("id", { count: "exact" }).gte("created_at", prevFrom).lte("created_at", prevTo),
        supabase.from("profiles").select("id", { count: "exact" }).eq("subscription_plan", "player_pro").gte("created_at", prevFrom).lte("created_at", prevTo),
        supabase.from("profiles").select("id", { count: "exact" }).eq("subscription_plan", "club").gte("created_at", prevFrom).lte("created_at", prevTo),
      ]);

      const newUsers = usersRes.count || 0;
      const newReports = reportsRes.count || 0;
      const proCount = proRes.count || 0;
      const clubCount = clubRes.count || 0;
      const mrr = proCount * 9 + clubCount * 59;

      setStats({ newUsers, newReports, proCount, clubCount, mrr });
      setPrevStats({
        newUsers: prevUsersRes.count || 0,
        newReports: prevReportsRes.count || 0,
        proCount: prevProRes.count || 0,
        clubCount: prevClubRes.count || 0,
        mrr: (prevProRes.count || 0) * 9 + (prevClubRes.count || 0) * 59,
      });

      const { data: signups } = await supabase.from("profiles").select("full_name, user_id, created_at")
        .gte("created_at", from).lte("created_at", to).order("created_at", { ascending: false }).limit(10);
      setRecentSignups(signups || []);

      const { data: reports } = await supabase.from("reports")
        .select("id, ai_report, created_at, sessions(session_type, session_date), profiles!reports_player_id_fkey(full_name)")
        .gte("created_at", from).lte("created_at", to).order("created_at", { ascending: false }).limit(10);
      setRecentReports(reports || []);

      setLoading(false);
    };
    load();
  }, [authLoading, range]);

  if (authLoading || loading) {
    return <AdminLayout><div className="flex items-center justify-center h-96"><Loader2 className="animate-spin text-primary" size={32} /></div></AdminLayout>;
  }

  const cards = [
    { label: "New Users", value: stats.newUsers, prev: prevStats.newUsers, icon: Users, color: "text-blue-400" },
    { label: "Reports", value: stats.newReports, prev: prevStats.newReports, icon: FileText, color: "text-purple-400" },
    { label: "Pro Signups", value: stats.proCount, prev: prevStats.proCount, icon: Crown, color: "text-yellow-400" },
    { label: "Club Signups", value: stats.clubCount, prev: prevStats.clubCount, icon: Users, color: "text-orange-400" },
    { label: "MRR", value: `€${stats.mrr}`, prev: prevStats.mrr, icon: DollarSign, color: "text-emerald-400", raw: stats.mrr },
  ];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <AdminDateRangeSelector value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {cards.map((c) => {
          const change = calcChange(c.raw ?? (typeof c.value === "number" ? c.value : 0), c.prev);
          return (
            <Card key={c.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{c.label}</span>
                  <c.icon size={16} className={c.color} />
                </div>
                <p className="text-2xl font-bold">{c.value}</p>
                {change.direction !== "flat" && (
                  <div className={`flex items-center gap-1 mt-1 text-xs ${change.direction === "up" ? "text-green-400" : "text-red-400"}`}>
                    {change.direction === "up" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                    {change.pct}% vs prev period
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Signups</CardTitle></CardHeader>
          <CardContent>
            {recentSignups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No signups in this period</p>
            ) : (
              <div className="space-y-3">
                {recentSignups.map((s, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{s.full_name || "—"}</span>
                    <span className="text-muted-foreground text-xs">{new Date(s.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent Reports</CardTitle></CardHeader>
          <CardContent>
            {recentReports.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No reports in this period</p>
            ) : (
              <div className="space-y-3">
                {recentReports.map((r: any, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{(r.profiles as any)?.full_name || "—"}</span>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>CPI: {r.ai_report?.cpi || "—"}</span>
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
