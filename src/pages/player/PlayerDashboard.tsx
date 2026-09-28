import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.svg";
import { LogOut, Trophy, ChevronRight, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface ClubReportRow {
  id: string;
  cpi_score: number | null;
  created_at: string;
  club_session_id: string;
  club_sessions: {
    session_name: string;
    session_date: string;
    session_type: string;
    opponent: string | null;
  } | null;
}

interface PlayerInfo {
  id: string;
  full_name: string;
  position: string | null;
  club: { id: string; name: string; logo_url: string | null } | null;
}

const PlayerDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<PlayerInfo | null>(null);
  const [reports, setReports] = useState<ClubReportRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      const { data: prof } = await supabase
        .from("profiles").select("id, full_name, position")
        .eq("user_id", session.user.id).maybeSingle();
      if (!prof) { navigate("/login"); return; }

      const { data: cp } = await supabase
        .from("club_players")
        .select("id, full_name, position, clubs(id, name, logo_url)")
        .eq("user_id", prof.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!cp) {
        // Not a club player → fall back to standard dashboard
        navigate("/dashboard");
        return;
      }

      const c: any = cp;
      setInfo({
        id: c.id,
        full_name: c.full_name,
        position: c.position || prof.position,
        club: c.clubs || null,
      });

      const { data: reps } = await supabase
        .from("club_reports")
        .select("id, cpi_score, created_at, club_session_id, club_sessions(session_name, session_date, session_type, opponent)")
        .eq("club_player_id", c.id)
        .order("created_at", { ascending: false });

      setReports((reps as any) || []);
      setLoading(false);
    })();
  }, [navigate]);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="animate-spin text-primary" size={28} /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/player/dashboard"><img src={logo} alt="Campometric" className="h-[54px]" /></Link>
          <Button variant="ghost" size="sm" onClick={logout}><LogOut size={16} className="mr-1" /> Log out</Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Your performance</div>
        <h1 className="text-3xl font-bold mb-6">{info?.full_name}</h1>

        <Card className="p-5 mb-8 flex items-center gap-4">
          {info?.club?.logo_url ? (
            <img src={info.club.logo_url} alt={info.club.name} className="h-12 w-12 rounded-lg object-cover" />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-primary/10 grid place-items-center"><Trophy className="text-primary" /></div>
          )}
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{info?.club?.name || "Independent"}</p>
            <p className="font-medium">{info?.position || "Position not set"}</p>
          </div>
          {!info?.position && (
            <Link to="/settings" className="text-xs text-primary hover:underline">Set position →</Link>
          )}
        </Card>

        <h2 className="text-xl font-semibold mb-4">Your reports ({reports.length})</h2>
        {reports.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">
            No reports yet. Your coach will upload sessions soon.
          </Card>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <Link key={r.id} to={`/report/${r.id}?source=club`}>
                <Card className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
                  <div>
                    <p className="font-semibold">{r.club_sessions?.session_name || "Session"}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.club_sessions?.session_date ? format(new Date(r.club_sessions.session_date), "PPP") : ""}
                      {" · "}
                      <span className="capitalize">{r.club_sessions?.session_type}</span>
                      {r.club_sessions?.opponent && <> · vs {r.club_sessions.opponent}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">CPI</p>
                      <p className="text-2xl font-bold text-primary">{r.cpi_score ?? "—"}</p>
                    </div>
                    <ChevronRight className="text-muted-foreground" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default PlayerDashboard;
