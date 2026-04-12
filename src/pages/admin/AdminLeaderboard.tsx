import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const AdminLeaderboard = () => {
  const { loading: authLoading } = useAdmin();
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  const fetch = async () => {
    const { data } = await supabase
      .from("player_stats_aggregate")
      .select("*, profiles!player_stats_aggregate_player_id_fkey(full_name, username, subscription_plan, is_public)")
      .gt("total_sessions", 0)
      .order("avg_performance_score", { ascending: false, nullsFirst: false });
    setPlayers(data || []);
    setLoading(false);
  };

  useEffect(() => { if (!authLoading) fetch(); }, [authLoading]);

  const recalcAll = async () => {
    setRecalculating(true);
    // Trigger recalculation by touching each report
    const { data: reports } = await supabase.from("reports").select("id, player_id").limit(500);
    // We just need to force a trigger update - since triggers fire on update
    for (const r of (reports || [])) {
      await supabase.from("reports").update({ updated_at: new Date().toISOString() }).eq("id", r.id);
    }
    toast.success("Recalculation triggered for all reports");
    setRecalculating(false);
    fetch();
  };

  if (authLoading || loading) return <AdminLayout><Loader2 className="animate-spin text-primary mx-auto mt-32" size={32} /></AdminLayout>;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Leaderboard Management</h1>
        <Button onClick={recalcAll} disabled={recalculating}>
          <RefreshCw size={16} className={`mr-1 ${recalculating ? "animate-spin" : ""}`} />
          Recalculate All Stats
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left">
                <th className="p-3 text-muted-foreground font-medium">#</th>
                <th className="p-3 text-muted-foreground font-medium">Player</th>
                <th className="p-3 text-muted-foreground font-medium">CPI</th>
                <th className="p-3 text-muted-foreground font-medium">Top Speed</th>
                <th className="p-3 text-muted-foreground font-medium">Distance</th>
                <th className="p-3 text-muted-foreground font-medium">Sessions</th>
                <th className="p-3 text-muted-foreground font-medium">Trust</th>
                <th className="p-3 text-muted-foreground font-medium">Plan</th>
              </tr></thead>
              <tbody>
                {players.map((p, i) => (
                  <tr key={p.player_id} className="border-b border-border/50">
                    <td className="p-3 text-muted-foreground">{i + 1}</td>
                    <td className="p-3">{(p.profiles as any)?.full_name || "—"}</td>
                    <td className="p-3 font-bold">{p.avg_performance_score ? Number(p.avg_performance_score).toFixed(1) : "—"}</td>
                    <td className="p-3">{p.best_top_speed ? Number(p.best_top_speed).toFixed(1) : "—"} km/h</td>
                    <td className="p-3">{p.avg_distance_per90 ? Number(p.avg_distance_per90).toFixed(0) : "—"} m</td>
                    <td className="p-3">{p.total_sessions}</td>
                    <td className="p-3">{p.trust_score}/100</td>
                    <td className="p-3 capitalize">{(p.profiles as any)?.subscription_plan?.replace("_", " ")}</td>
                  </tr>
                ))}
                {players.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No players on leaderboard</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminLeaderboard;
