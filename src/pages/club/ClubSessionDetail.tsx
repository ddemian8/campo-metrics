import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import ClubLayout from "@/components/club/ClubLayout";
import { useClub } from "@/hooks/useClub";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ArrowLeft, Copy, Check, Download, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  notification_sent: boolean;
  notification_sent_at: string | null;
  club_players: {
    id: string;
    full_name: string;
    pdf_name: string;
    email: string | null;
    account_status: string;
    activation_token: string | null;
  } | null;
}

const fmtNum = (v: any, digits = 0) => v == null ? "—" : Number(v).toFixed(digits);

const generateToken = () => {
  return crypto.randomUUID().replace(/-/g, "") + Date.now().toString(36);
};

const ClubSessionDetail = () => {
  const { id } = useParams();
  const { club } = useClub();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!club || !id) return;
    const { data: s } = await supabase
      .from("club_sessions")
      .select("id, session_name, session_date, session_type, opponent, competition, players_detected, reports_generated")
      .eq("id", id).eq("club_id", club.id).maybeSingle();
    setSession(s as SessionDetail | null);

    const { data: r } = await supabase
      .from("club_reports")
      .select("id, cpi_score, raw_metrics, club_player_id, notification_sent, notification_sent_at, club_players(id, full_name, pdf_name, email, account_status, activation_token)")
      .eq("club_session_id", id)
      .order("cpi_score", { ascending: false });
    setReports((r as any) || []);
  };

  useEffect(() => { load(); }, [club, id]);

  const ensureActivationLink = async (player: ReportRow["club_players"]): Promise<string | null> => {
    if (!player?.email) return null;
    let token = player.activation_token;
    if (!token) {
      token = generateToken();
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from("club_players").update({
        activation_token: token, token_expires_at: expires,
      }).eq("id", player.id);
    }
    return `${window.location.origin}/player/activate?token=${token}`;
  };

  const copyLink = async (r: ReportRow) => {
    if (!r.club_players) return;
    let link: string;
    if (r.club_players.account_status === "active") {
      link = `${window.location.origin}/report/${r.id}?source=club`;
    } else {
      const a = await ensureActivationLink(r.club_players);
      if (!a) { toast.error("Add an email for this player first."); return; }
      link = a;
    }
    await navigator.clipboard.writeText(link);
    setCopiedId(r.id);
    setTimeout(() => setCopiedId(null), 1500);
    toast.success("Link copied");
  };

  const markSent = async (r: ReportRow) => {
    if (!r.club_players?.email) { toast.error("No email on file."); return; }
    await ensureActivationLink(r.club_players);
    await supabase.from("club_reports").update({
      notification_sent: true, notification_sent_at: new Date().toISOString(),
    }).eq("id", r.id);
    toast.success("Marked as notified");
    load();
  };

  const sendAll = async () => {
    const targets = reports.filter((r) => r.club_players?.email && !r.notification_sent);
    if (!targets.length) { toast.info("Nothing to send."); return; }
    for (const r of targets) await ensureActivationLink(r.club_players!);
    await supabase.from("club_reports").update({
      notification_sent: true, notification_sent_at: new Date().toISOString(),
    }).in("id", targets.map((t) => t.id));
    toast.success(`Marked ${targets.length} reports as notified`);
    load();
  };

  const downloadTeamPDF = async () => {
    if (!session) return;
    setDownloading(true);
    try {
      const { default: html2pdf } = await import("html2pdf.js");
      const el = tableRef.current;
      if (!el) return;
      const filename = `${session.session_date}_${session.session_type}_${(club?.name || "team").replace(/\s+/g, "-")}_Team_Report.pdf`;
      await html2pdf().set({
        margin: 10,
        filename,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2, backgroundColor: "#0d1b2a" },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
      }).from(el).save();
    } finally {
      setDownloading(false);
    }
  };

  if (!session) {
    return <ClubLayout><p className="text-muted-foreground">Loading…</p></ClubLayout>;
  }

  const sentCount = reports.filter((r) => r.notification_sent).length;
  const pendingWithEmail = reports.filter((r) => r.club_players?.email && !r.notification_sent).length;

  return (
    <ClubLayout>
      <Link to="/club/dashboard/sessions" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft size={14} /> Back to sessions
      </Link>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">{session.session_name}</h1>
          <p className="text-muted-foreground">
            {format(new Date(session.session_date), "PPP")} · <span className="capitalize">{session.session_type}</span>
            {session.opponent && <> · vs {session.opponent}</>}
            {session.competition && <> · {session.competition}</>}
          </p>
        </div>
        <Button variant="outline" onClick={downloadTeamPDF} disabled={downloading || !reports.length}>
          {downloading ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Download size={14} className="mr-1" />}
          Download team report
        </Button>
      </div>

      <Card className="p-0 overflow-hidden mb-6" ref={tableRef as any}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Player reports ({reports.length})</h2>
            <p className="text-xs text-muted-foreground">{sentCount} notified · {pendingWithEmail} pending</p>
          </div>
          {pendingWithEmail > 0 && (
            <Button size="sm" onClick={sendAll}>
              <Send size={14} className="mr-1" /> Mark all as sent
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
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
                <th className="p-3 text-left">Notify</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => {
                const m = r.raw_metrics || {};
                const player = r.club_players;
                const noEmail = !player?.email;
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                    <td className="p-3">
                      <Link to={`/report/${r.id}?source=club`} className="font-medium hover:underline">
                        {player?.full_name || player?.pdf_name || "Unknown"}
                      </Link>
                      {player?.email && <p className="text-xs text-muted-foreground">{player.email}</p>}
                    </td>
                    <td className="p-3 text-right font-semibold text-primary">{r.cpi_score ?? "—"}</td>
                    <td className="p-3 text-right">{fmtNum(m.distance ? m.distance / 1000 : null, 2)} km</td>
                    <td className="p-3 text-right">{fmtNum(m.dist_sp_z4plus, 0)} m</td>
                    <td className="p-3 text-right">{fmtNum(m.dist_sp_z5, 0)} m</td>
                    <td className="p-3 text-right">{fmtNum(m.max_sp, 1)} km/h</td>
                    <td className="p-3 text-right text-muted-foreground">{fmtNum(m.minutes_played, 0)}</td>
                    <td className="p-3">
                      {noEmail ? (
                        <span className="text-xs text-muted-foreground">📧 No email</span>
                      ) : r.notification_sent ? (
                        <span className="text-xs text-primary inline-flex items-center gap-1"><Check size={12} /> Sent</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => copyLink(r)} className="h-7 px-2">
                            {copiedId === r.id ? <Check size={12} /> : <Copy size={12} />}
                            <span className="ml-1 text-xs">Copy link</span>
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => markSent(r)} className="h-7 px-2">
                            <Send size={12} />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {reports.length === 0 && (
          <div className="p-10 text-center text-muted-foreground">No reports yet.</div>
        )}
      </Card>

      <Card className="p-4 text-xs text-muted-foreground">
        💡 Email delivery is not yet configured. Use <strong>Copy link</strong> to share each player's activation or report URL via WhatsApp, Telegram, or email manually. Activation links are valid for 30 days.
      </Card>
    </ClubLayout>
  );
};

export default ClubSessionDetail;
