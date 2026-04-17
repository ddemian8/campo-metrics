import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import ClubLayout from "@/components/club/ClubLayout";
import { useClub } from "@/hooks/useClub";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";

interface SessionDetail {
  id: string;
  session_name: string;
  session_date: string;
  session_type: string;
  opponent: string | null;
  competition: string | null;
  players_detected: number;
  reports_generated: number;
}

interface ReportRow {
  id: string;
  cpi_score: number | null;
  raw_metrics: any;
  club_player_id: string;
  club_players: { full_name: string; pdf_name: string } | null;
}

const fmtNum = (v: any, digits = 0) => v == null ? "—" : Number(v).toFixed(digits);

const ClubSessionDetail = () => {
  const { id } = useParams();
  const { club } = useClub();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);

  useEffect(() => {
    if (!club || !id) return;
    const load = async () => {
      const { data: s } = await supabase
        .from("club_sessions")
        .select("id, session_name, session_date, session_type, opponent, competition, players_detected, reports_generated")
        .eq("id", id)
        .eq("club_id", club.id)
        .maybeSingle();
      setSession(s as SessionDetail | null);

      const { data: r } = await supabase
        .from("club_reports")
        .select("id, cpi_score, raw_metrics, club_player_id, club_players(full_name, pdf_name)")
        .eq("club_session_id", id)
        .order("cpi_score", { ascending: false });
      setReports((r as any) || []);
    };
    load();
  }, [club, id]);

  if (!session) {
    return <ClubLayout><p className="text-muted-foreground">Loading…</p></ClubLayout>;
  }

  return (
    <ClubLayout>
      <Link to="/club/dashboard/sessions" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft size={14} /> Back to sessions
      </Link>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{session.session_name}</h1>
        <p className="text-muted-foreground">
          {format(new Date(session.session_date), "PPP")} · <span className="capitalize">{session.session_type}</span>
          {session.opponent && <> · vs {session.opponent}</>}
          {session.competition && <> · {session.competition}</>}
        </p>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">Player reports ({reports.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Player</th>
              <th className="p-3 text-right">CPI</th>
              <th className="p-3 text-right">Distance</th>
              <th className="p-3 text-right">HSR</th>
              <th className="p-3 text-right">Sprint</th>
              <th className="p-3 text-right">Top Speed</th>
              <th className="p-3 text-right">Min</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => {
              const m = r.raw_metrics || {};
              return (
                <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                  <td className="p-3 font-medium">{r.club_players?.full_name || r.club_players?.pdf_name || "Unknown"}</td>
                  <td className="p-3 text-right font-semibold text-primary">{r.cpi_score ?? "—"}</td>
                  <td className="p-3 text-right">{fmtNum(m.distance ? m.distance / 1000 : null, 2)} km</td>
                  <td className="p-3 text-right">{fmtNum(m.dist_sp_z4plus, 0)} m</td>
                  <td className="p-3 text-right">{fmtNum(m.dist_sp_z5, 0)} m</td>
                  <td className="p-3 text-right">{fmtNum(m.max_sp, 1)} km/h</td>
                  <td className="p-3 text-right text-muted-foreground">{fmtNum(m.minutes_played, 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {reports.length === 0 && (
          <div className="p-10 text-center text-muted-foreground">No reports yet.</div>
        )}
      </Card>
    </ClubLayout>
  );
};

export default ClubSessionDetail;
