import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const AdminLeaderboard = () => {
  const { loading: authLoading } = useAdmin();
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, errors: 0 });

  const fetchPlayers = async () => {
    const { data } = await supabase
      .from("player_stats_aggregate")
      .select("*, profiles!player_stats_aggregate_player_id_fkey(full_name, username, subscription_plan, is_public)")
      .gt("total_sessions", 0)
      .order("avg_performance_score", { ascending: false, nullsFirst: false });
    setPlayers(data || []);
    setLoading(false);
  };

  useEffect(() => { if (!authLoading) fetchPlayers(); }, [authLoading]);

  const recalcAll = async () => {
    setRecalculating(true);
    // Find all players who have at least 1 report
    const { data: reportPlayers } = await supabase
      .from("reports")
      .select("player_id");

    if (!reportPlayers || reportPlayers.length === 0) {
      toast.info("No reports found");
      setRecalculating(false);
      return;
    }

    const uniquePlayerIds = [...new Set(reportPlayers.map(r => r.player_id))];
    setProgress({ current: 0, total: uniquePlayerIds.length, errors: 0 });

    let errors = 0;
    for (let i = 0; i < uniquePlayerIds.length; i++) {
      const playerId = uniquePlayerIds[i];
      // Touch the latest report for this player to trigger the DB recalculate function
      const { data: latestReport } = await supabase
        .from("reports")
        .select("id")
        .eq("player_id", playerId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (latestReport) {
        const { error } = await supabase
          .from("reports")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", latestReport.id);
        if (error) errors++;
      } else {
        errors++;
      }

      setProgress({ current: i + 1, total: uniquePlayerIds.length, errors });
    }

    toast.success(`Done. ${uniquePlayerIds.length} players updated, ${errors} errors`);
    setRecalculating(false);
    setProgress({ current: 0, total: 0, errors: 0 });
    fetchPlayers();
  };

  if (authLoading || loading) return <AdminLayout><Loader2 className="animate-spin text-primary mx-auto mt-32" size={32} /></AdminLayout>;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Leaderboard Management</h1>
        <div className="flex items-center gap-3">
          {recalculating && progress.total > 0 && (
            <span className="text-sm text-muted-foreground">
              Recalculated {progress.current}/{progress.total} players...
              {progress.errors > 0 && ` (${progress.errors} errors)`}
            </span>
          )}
          <Button onClick={recalcAll} disabled={recalculating}>
            <RefreshCw size={16} className={`mr-1 ${recalculating ? "animate-spin" : ""}`} />
            Recalculate All Stats
          </Button>
        </div>
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
                <th className="p-3 text-muted-foreground font-medium">HSR</th>
                <th className="p-3 text-muted-foreground font-medium">Sprint</th>
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
                    <td className="p-3">{p.best_top_speed ? `${Number(p.best_top_speed).toFixed(1)} km/h` : "—"}</td>
                    <td className="p-3">{p.avg_distance_per90 ? `${Number(p.avg_distance_per90).toFixed(0)} m` : "—"}</td>
                    <td className="p-3">{p.avg_hsr_per90 ? `${Number(p.avg_hsr_per90).toFixed(0)} m` : "—"}</td>
                    <td className="p-3">{p.avg_sprint_distance_per90 ? `${Number(p.avg_sprint_distance_per90).toFixed(0)} m` : "—"}</td>
                    <td className="p-3">{p.total_sessions}</td>
                    <td className="p-3">{p.trust_score}/100</td>
                    <td className="p-3 capitalize">{(p.profiles as any)?.subscription_plan?.replace("_", " ")}</td>
                  </tr>
                ))}
                {players.length === 0 && <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">No players on leaderboard</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminLeaderboard;
