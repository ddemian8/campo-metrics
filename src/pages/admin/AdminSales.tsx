import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign, TrendingUp, Users, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminSales = () => {
  const { loading: authLoading } = useAdmin();
  const [stats, setStats] = useState({ mrr: 0, proCount: 0, clubCount: 0, totalSubs: 0 });
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    const load = async () => {
      const { data: profiles } = await supabase.from("profiles").select("*");
      const all = profiles || [];
      const pro = all.filter(p => p.subscription_plan === "player_pro");
      const club = all.filter(p => p.subscription_plan === "club");
      const mrr = pro.length * 9 + club.length * 59;
      setStats({ mrr, proCount: pro.length, clubCount: club.length, totalSubs: pro.length + club.length });
      setSubscribers([...pro, ...club].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setLoading(false);
    };
    load();
  }, [authLoading]);

  if (authLoading || loading) return <AdminLayout><Loader2 className="animate-spin text-primary mx-auto mt-32" size={32} /></AdminLayout>;

  const cards = [
    { l: "MRR", v: `€${stats.mrr}`, icon: DollarSign },
    { l: "Pro Subscribers", v: stats.proCount, icon: TrendingUp },
    { l: "Club Subscribers", v: stats.clubCount, icon: Users },
    { l: "Total Active", v: stats.totalSubs, icon: Users },
  ];

  const exportCSV = () => {
    const rows = subscribers.map(s => `${s.full_name},${s.subscription_plan},${s.created_at}`);
    const csv = `Name,Plan,Joined\n${rows.join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "subscribers.csv";
    a.click();
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Sales & Revenue</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {cards.map(c => (
          <Card key={c.l}><CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{c.l}</span>
              <c.icon size={16} className="text-emerald-400" />
            </div>
            <p className="text-2xl font-bold">{c.v}</p>
          </CardContent></Card>
        ))}
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
                {subscribers.map(s => (
                  <tr key={s.id} className="border-b border-border/50">
                    <td className="p-3">{s.full_name || "—"}</td>
                    <td className="p-3 capitalize">{s.subscription_plan.replace("_", " ")}</td>
                    <td className="p-3"><span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">{s.subscription_status === "none" ? "promo" : s.subscription_status}</span></td>
                    <td className="p-3 text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {subscribers.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No subscribers yet</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminSales;
