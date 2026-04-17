import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ClubLayout from "@/components/club/ClubLayout";
import { useClub, trialDaysRemaining } from "@/hooks/useClub";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, FileText, BarChart3, Clock, Upload, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Stats {
  players: number;
  sessions: number;
  reports: number;
}

interface RecentSession {
  id: string;
  session_name: string;
  session_date: string;
  session_type: string;
  players_detected: number;
  reports_generated: number;
}

const ClubDashboardOverview = () => {
  const { club } = useClub();
  const [stats, setStats] = useState<Stats>({ players: 0, sessions: 0, reports: 0 });
  const [recent, setRecent] = useState<RecentSession[]>([]);

  useEffect(() => {
    if (!club) return;
    const load = async () => {
      const [{ count: players }, { count: sessions }, { count: reports }, { data: recentSessions }] = await Promise.all([
        supabase.from("club_players").select("*", { count: "exact", head: true }).eq("club_id", club.id).eq("is_active", true),
        supabase.from("club_sessions").select("*", { count: "exact", head: true }).eq("club_id", club.id),
        supabase.from("club_reports").select("*", { count: "exact", head: true }).eq("club_id", club.id),
        supabase.from("club_sessions").select("id, session_name, session_date, session_type, players_detected, reports_generated").eq("club_id", club.id).order("session_date", { ascending: false }).limit(5),
      ]);
      setStats({ players: players || 0, sessions: sessions || 0, reports: reports || 0 });
      setRecent((recentSessions as RecentSession[]) || []);
    };
    load();
  }, [club]);

  const trialDays = trialDaysRemaining(club?.trial_ends_at || null);
  const trialLabel = club?.subscription_plan === "premium"
    ? "Premium — Active"
    : trialDays !== null ? `${trialDays} days remaining` : "—";

  const cards = [
    { label: "Total Players", value: stats.players, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Total Sessions", value: stats.sessions, icon: FileText, color: "text-primary", bg: "bg-primary/10" },
    { label: "Reports Generated", value: stats.reports, icon: BarChart3, color: "text-primary", bg: "bg-primary/10" },
    { label: "Trial Status", value: trialLabel, icon: Clock, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <ClubLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Welcome back{club?.name ? `, ${club.name}` : ""}</h1>
        <p className="text-muted-foreground">Here's what's happening with your team.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className={`h-10 w-10 rounded-lg grid place-items-center mb-3 ${c.bg}`}>
              <c.icon size={20} className={c.color} />
            </div>
            <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
            <p className="text-2xl font-bold">{c.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <Button asChild size="lg" className="h-auto py-6 justify-between">
          <Link to="/club/dashboard/upload">
            <span className="flex items-center gap-3">
              <Upload size={20} />
              <span className="text-left">
                <div className="font-semibold">Upload GPS Session</div>
                <div className="text-xs opacity-80 font-normal">Drop a PDF and generate reports for all players</div>
              </span>
            </span>
            <ArrowRight size={20} />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-auto py-6 justify-between">
          <Link to="/club/dashboard/roster">
            <span className="flex items-center gap-3">
              <Users size={20} />
              <span className="text-left">
                <div className="font-semibold">Manage Roster</div>
                <div className="text-xs opacity-80 font-normal">Add players, emails, and positions</div>
              </span>
            </span>
            <ArrowRight size={20} />
          </Link>
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent sessions</h2>
          <Link to="/club/dashboard/sessions" className="text-xs text-primary hover:underline">View all →</Link>
        </div>
        {recent.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            No sessions yet.{" "}
            <Link to="/club/dashboard/upload" className="text-primary hover:underline">Upload your first PDF</Link>.
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map((s) => (
              <Link
                key={s.id}
                to={`/club/dashboard/sessions/${s.id}`}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{s.session_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(s.session_date), "PPP")} · {s.session_type}
                  </p>
                </div>
                <div className="text-right text-sm shrink-0">
                  <p className="text-muted-foreground">{s.reports_generated} / {s.players_detected} reports</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </ClubLayout>
  );
};

export default ClubDashboardOverview;
