import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign, TrendingUp, Users, Download, ArrowUp, ArrowDown } from "lucide-react";
import { AdminDateRangeSelector, getDefaultDateRange, getPreviousPeriod, calcChange, type DateRange } from "@/components/admin/AdminDateRangeSelector";

const AdminSales = () => {
  const { loading: authLoading } = useAdmin();
  const [range, setRange] = useState<DateRange>(getDefaultDateRange);
  const [stats, setStats] = useState({ mrr: 0, proCount: 0, clubCount: 0, totalSubs: 0 });
  const [prevStats, setPrevStats] = useState({ mrr: 0, proCount: 0, clubCount: 0, totalSubs: 0 });
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    const load = async () => {
      setLoading(true);
      const from = range.from.toISOString();
      const to = range.to.toISOString();
      const prev = getPreviousPeriod(range);

      const { data: profiles } = await supabase.from("profiles").select("*")
        .in("subscription_plan", ["player_pro", "club"]);
      const all = profiles || [];

      const inRange = all.filter(p => p.created_at >= from && p.created_at <= to);
      const inPrev = all.filter(p => p.created_at >= prev.from.toISOString() && p.created_at <= prev.to.toISOString());

      const pro = inRange.filter(p => p.subscription_plan === "player_pro");
      const club = inRange.filter(p => p.subscription_plan === "club");
      const mrr = pro.length * 9 + club.length * 59;

      const prevPro = inPrev.filter(p => p.subscription_plan === "player_pro");
      const prevClub = inPrev.filter(p => p.subscription_plan === "club");

      setStats({ mrr, proCount: pro.length, clubCount: club.length, totalSubs: pro.length + club.length });
      setPrevStats({ mrr: prevPro.length * 9 + prevClub.length * 59, proCount: prevPro.length, clubCount: prevClub.length, totalSubs: prevPro.length + prevClub.length });
      setSubscribers(inRange.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setLoading(false);
    };
    load();
  }, [authLoading, range]);

  if (authLoading || loading) return <AdminLayout><Loader2 className="animate-spin text-primary mx-auto mt-32" size={32} /></AdminLayout>;

  const cards = [
    { l: "Revenue", v: `€${stats.mrr}`, prev: prevStats.mrr, raw: stats.mrr, icon: DollarSign },
    { l: "Pro Subscribers", v: stats.proCount, prev: prevStats.proCount, raw: stats.proCount, icon: TrendingUp },
    { l: "Club Subscribers", v: stats.clubCount, prev: prevStats.clubCount, raw: stats.clubCount, icon: Users },
    { l: "Total Active", v: stats.totalSubs, prev: prevStats.totalSubs, raw: stats.totalSubs, icon: Users },
  ];

  const exportCSV = () => {
    const rows = subscribers.map(s => `${s.full_name || ""},${s.subscription_plan},${s.subscription_status},${s.created_at}`);
    const csv = `Name,Plan,Status,Joined\n${rows.join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "subscribers.csv";
    a.click();
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Sales & Revenue</h1>
        <AdminDateRangeSelector value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {cards.map(c => {
          const change = calcChange(c.raw, c.prev);
          return (
            <Card key={c.l}><CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{c.l}</span>
                <c.icon size={16} className="text-emerald-400" />
              </div>
              <p className="text-2xl font-bold">{c.v}</p>
              {change.direction !== "flat" && (
                <div className={`flex items-center gap-1 mt-1 text-xs ${change.direction === "up" ? "text-green-400" : "text-red-400"}`}>
                  {change.direction === "up" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                  {change.pct}% vs prev period
                </div>
              )}
            </CardContent></Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Subscribers</CardTitle>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download size={14} className="mr-1" />Export CSV</Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="p-3 text-muted-foreground font-medium">Name</th>
                  <th className="p-3 text-muted-foreground font-medium">Plan</th>
                  <th className="p-3 text-muted-foreground font-medium">Status</th>
                  <th className="p-3 text-muted-foreground font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No sales recorded yet</td></tr>
                ) : subscribers.map(s => (
                  <tr key={s.id} className="border-b border-border/50">
                    <td className="p-3">{s.full_name || "—"}</td>
                    <td className="p-3 capitalize">{s.subscription_plan.replace("_", " ")}</td>
                    <td className="p-3"><span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">{s.subscription_status === "none" ? "promo" : s.subscription_status}</span></td>
                    <td className="p-3 text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminSales;
