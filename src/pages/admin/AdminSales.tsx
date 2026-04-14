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
  const [stats, setStats] = useState({ revenue: 0, proCount: 0, clubCount: 0, totalSubs: 0 });
  const [prevStats, setPrevStats] = useState({ revenue: 0, proCount: 0, clubCount: 0, totalSubs: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    const load = async () => {
      setLoading(true);
      const from = range.from.toISOString();
      const to = range.to.toISOString();
      const prev = getPreviousPeriod(range);

      // Fetch real transactions
      const { data: txns } = await supabase.from("transactions").select("*, profiles(full_name, subscription_plan)").gte("created_at", from).lte("created_at", to).order("created_at", { ascending: false });
      const { data: prevTxns } = await supabase.from("transactions").select("*").gte("created_at", prev.from.toISOString()).lte("created_at", prev.to.toISOString());

      const all = txns || [];
      const prevAll = prevTxns || [];

      const completed = all.filter(t => t.status === "completed");
      const prevCompleted = prevAll.filter(t => t.status === "completed");

      const revenue = completed.reduce((sum, t) => sum + Number(t.amount), 0);
      const prevRevenue = prevCompleted.reduce((sum, t) => sum + Number(t.amount), 0);

      const proCount = completed.filter(t => t.plan_type === "player_pro").length;
      const clubCount = completed.filter(t => t.plan_type === "club").length;
      const prevProCount = prevCompleted.filter(t => t.plan_type === "player_pro").length;
      const prevClubCount = prevCompleted.filter(t => t.plan_type === "club").length;

      setStats({ revenue, proCount, clubCount, totalSubs: proCount + clubCount });
      setPrevStats({ revenue: prevRevenue, proCount: prevProCount, clubCount: prevClubCount, totalSubs: prevProCount + prevClubCount });
      setTransactions(all);
      setLoading(false);
    };
    load();
  }, [authLoading, range]);

  if (authLoading || loading) return <AdminLayout><Loader2 className="animate-spin text-primary mx-auto mt-32" size={32} /></AdminLayout>;

  const cards = [
    { l: "Revenue", v: `€${stats.revenue.toFixed(2)}`, prev: prevStats.revenue, raw: stats.revenue, icon: DollarSign },
    { l: "Pro Transactions", v: stats.proCount, prev: prevStats.proCount, raw: stats.proCount, icon: TrendingUp },
    { l: "Club Transactions", v: stats.clubCount, prev: prevStats.clubCount, raw: stats.clubCount, icon: Users },
    { l: "Total Transactions", v: stats.totalSubs, prev: prevStats.totalSubs, raw: stats.totalSubs, icon: Users },
  ];

  const exportCSV = () => {
    const rows = transactions.map(t => `${(t as any).profiles?.full_name || ""},${t.plan_type},${t.status},€${t.amount},${t.currency},${t.created_at}`);
    const csv = `Name,Plan,Status,Amount,Currency,Date\n${rows.join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "transactions.csv";
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
          <CardTitle className="text-base">Transactions</CardTitle>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download size={14} className="mr-1" />Export CSV</Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="p-3 text-muted-foreground font-medium">Name</th>
                  <th className="p-3 text-muted-foreground font-medium">Plan</th>
                  <th className="p-3 text-muted-foreground font-medium">Amount</th>
                  <th className="p-3 text-muted-foreground font-medium">Status</th>
                  <th className="p-3 text-muted-foreground font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No sales recorded yet</td></tr>
                ) : transactions.map(t => (
                  <tr key={t.id} className="border-b border-border/50">
                    <td className="p-3">{(t as any).profiles?.full_name || "—"}</td>
                    <td className="p-3 capitalize">{(t.plan_type || "").replace("_", " ")}</td>
                    <td className="p-3">€{Number(t.amount).toFixed(2)}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === "completed" ? "bg-green-500/20 text-green-400" : t.status === "failed" ? "bg-red-500/20 text-red-400" : "bg-muted text-muted-foreground"}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
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
