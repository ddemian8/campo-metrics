import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ClubLayout from "@/components/club/ClubLayout";
import { useClub } from "@/hooks/useClub";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Upload, FileText } from "lucide-react";

interface SessionRow {
  id: string;
  session_name: string;
  session_date: string;
  session_type: string;
  opponent: string | null;
  players_detected: number;
  reports_generated: number;
}

const ClubSessions = () => {
  const { club } = useClub();
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  useEffect(() => {
    if (!club) return;
    supabase
      .from("club_sessions")
      .select("id, session_name, session_date, session_type, opponent, players_detected, reports_generated")
      .eq("club_id", club.id)
      .order("session_date", { ascending: false })
      .then(({ data }) => setSessions((data as SessionRow[]) || []));
  }, [club]);

  return (
    <ClubLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Sessions</h1>
          <p className="text-muted-foreground">All GPS sessions you've uploaded.</p>
        </div>
        <Button asChild>
          <Link to="/club/dashboard/upload"><Upload size={16} className="mr-2" /> Upload session</Link>
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        {sessions.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <FileText size={36} className="mx-auto mb-3 opacity-50" />
            <p className="mb-3">No sessions yet.</p>
            <Button asChild size="sm">
              <Link to="/club/dashboard/upload">Upload your first PDF</Link>
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Session</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Opponent</th>
                <th className="p-3 text-right">Reports</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-t border-border hover:bg-muted/20">
                  <td className="p-3">
                    <Link to={`/club/dashboard/sessions/${s.id}`} className="font-medium hover:text-primary">
                      {s.session_name}
                    </Link>
                  </td>
                  <td className="p-3 text-muted-foreground">{format(new Date(s.session_date), "PPP")}</td>
                  <td className="p-3 capitalize">{s.session_type}</td>
                  <td className="p-3 text-muted-foreground">{s.opponent || "—"}</td>
                  <td className="p-3 text-right">{s.reports_generated} / {s.players_detected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </ClubLayout>
  );
};

export default ClubSessions;
