import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, FileText, Crown, DollarSign, TrendingUp, UserPlus } from "lucide-react";

const AdminDashboard = () => {
  const { loading: authLoading } = useAdmin();
  const [stats, setStats] = useState<any>(null);
  const [recentSignups, setRecentSignups] = useState<any[]>([]);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    const load = async () => {
      const today = new Date().toISOString().split("T")[0];

      const [profilesRes, reportsRes, proRes, clubRes] = await Promise.all([
        supabase.from("profiles").select("id, created_at, subscription_plan", { count: "exact" }),
        supabase.from("reports").select("id, created_at", { count: "exact" }),
        supabase.from("profiles").select("id", { count: "exact" }).eq("subscription_plan", "player_pro"),
        supabase.from("profiles").select("id", { count: "exact" }).eq("subscription_plan", "club"),
      ]);

      const totalUsers = profilesRes.count || 0;
      const newToday = (profilesRes.data || []).filter(p => p.created_at?.startsWith(today)).length;
      const totalReports = reportsRes.count || 0;
      const reportsToday = (reportsRes.data || []).filter(r => r.created_at?.startsWith(today)).length;
      const proCount = proRes.count || 0;
      const clubCount = clubRes.count || 0;
      const mrr = proCount * 9 + clubCount * 59;

      setStats({ totalUsers, newToday, totalReports, reportsToday, proCount, clubCount, mrr });

      // Recent signups
      const { data: signups } = await supabase
        .from("profiles")
        .select("full_name, user_id, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      setRecentSignups(signups || []);

      // Recent reports
      const { data: reports } = await supabase
        .from("reports")
        .select("id, ai_report, created_at, sessions(session_type, session_date), profiles!reports_player_id_fkey(full_name)")
        .order("created_at", { ascending: false })
        .limit(10);
      setRecentReports(reports || []);

      setLoading(false);
    };
    load();
  }, [authLoading]);

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      </AdminLayout>
    );
  }

  const cards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-400" },
    { label: "New Today", value: stats.newToday, icon: UserPlus, color: "text-green-400" },
    { label: "Total Reports", value: stats.totalReports, icon: FileText, color: "text-purple-400" },
    { label: "Reports Today", value: stats.reportsToday, icon: TrendingUp, color: "text-cyan-400" },
    { label: "Pro Subscribers", value: stats.proCount, icon: Crown, color: "text-yellow-400" },
    { label: "Club Subscribers", value: stats.clubCount, icon: Users, color: "text-orange-400" },
    { label: "MRR", value: `€${stats.mrr}`, icon: DollarSign, color: "text-emerald-400" },
  ];

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{c.label}</span>
                <c.icon size={16} className={c.color} />
              </div>
              <p className="text-2xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Signups</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSignups.map((s, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{s.full_name || "—"}</span>
                  <span className="text-muted-foreground text-xs">{new Date(s.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent Reports</CardTitle></CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
