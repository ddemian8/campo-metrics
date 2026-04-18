import { useEffect, useState } from "react";
import ClubLayout from "@/components/club/ClubLayout";
import { useClub } from "@/hooks/useClub";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Edit2, Trash2, Mail, Save, X } from "lucide-react";

interface RosterPlayer {
  id: string;
  full_name: string;
  pdf_name: string;
  email: string | null;
  position: string | null;
  account_status: string;
  is_active: boolean;
  session_count?: number;
  avg_cpi?: number | null;
}

const ClubRoster = () => {
  const { club } = useClub();
  const [players, setPlayers] = useState<RosterPlayer[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const load = async () => {
    if (!club) return;
    const { data } = await supabase
      .from("club_players")
      .select("id, full_name, pdf_name, email, position, account_status, is_active")
      .eq("club_id", club.id)
      .eq("is_active", true)
      .order("full_name");

    const list = (data as RosterPlayer[]) || [];

    // Per-player aggregates from club_reports
    const ids = list.map((p) => p.id);
    if (ids.length) {
      const { data: agg } = await supabase
        .from("club_reports")
        .select("club_player_id, cpi_score")
        .in("club_player_id", ids);
      const groups: Record<string, number[]> = {};
      (agg || []).forEach((r: any) => {
        if (r.cpi_score == null) return;
        groups[r.club_player_id] ??= [];
        groups[r.club_player_id].push(r.cpi_score);
      });
      list.forEach((p) => {
        const arr = groups[p.id] || [];
        p.session_count = arr.length;
        p.avg_cpi = arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
      });
    }
    setPlayers(list);
  };

  useEffect(() => { load(); }, [club]);

  const beginEdit = (p: RosterPlayer) => {
    setEditing(p.id);
    setEditFullName(p.full_name);
    setEditEmail(p.email || "");
  };

  const saveEdit = async (id: string) => {
    const update: any = { full_name: editFullName.trim() };
    const newEmail = editEmail.trim().toLowerCase();
    if (newEmail) {
      update.email = newEmail;
      const cur = players.find((p) => p.id === id);

      // Try to link to an existing profile by matching the auth user email
      // (we can't query auth.users directly, so we look in profiles where the user_id matches)
      // Best-effort: list profiles whose linked user has this email.
      const { data: linkedUser } = await supabase
        .rpc("is_admin"); // dummy call to not break — actual matching uses listUsers below

      // Use auth admin via edge function isn't available here; rely on activation token instead.
      // Mark as invited so coach knows to send the activation link.
      if (cur && cur.account_status === "pending") {
        update.account_status = "invited";
        update.invited_at = new Date().toISOString();
      }
      // Generate an activation token immediately so the coach can copy a link from session detail.
      if (cur && !cur.account_status?.includes("active")) {
        const token = crypto.randomUUID().replace(/-/g, "") + Date.now().toString(36);
        update.activation_token = token;
        update.token_expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }
    }
    const { error } = await supabase.from("club_players").update(update).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(newEmail ? "Player updated — invitation link is ready to share" : "Player updated");
    setEditing(null);
    load();
  };

  const copyInvite = async (p: RosterPlayer) => {
    if (!p.email) { toast.error("Add an email first."); return; }
    // Get or refresh activation token
    const { data: cur } = await supabase
      .from("club_players").select("activation_token, token_expires_at")
      .eq("id", p.id).maybeSingle();
    let token = (cur as any)?.activation_token;
    const expired = !cur?.token_expires_at || new Date(cur.token_expires_at) < new Date();
    if (!token || expired) {
      token = crypto.randomUUID().replace(/-/g, "") + Date.now().toString(36);
      await supabase.from("club_players").update({
        activation_token: token,
        token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }).eq("id", p.id);
    }
    const link = `${window.location.origin}/player/activate?token=${token}`;
    await navigator.clipboard.writeText(link);
    toast.success("Invite link copied — share it via WhatsApp, email, etc.");
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this player from the roster? Their data is kept but they won't appear in new sessions.")) return;
    const { error } = await supabase.from("club_players").update({ is_active: false }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Player removed");
    load();
  };

  const max = club?.max_players || 25;
  const pct = (players.length / max) * 100;

  return (
    <ClubLayout>
      <h1 className="text-3xl font-bold mb-1">Roster</h1>
      <p className="text-muted-foreground mb-6">Manage your players and their accounts.</p>

      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">{players.length} / {max} players</p>
          {pct > 80 && pct <= 100 && (
            <p className="text-xs text-primary">You're close to your limit</p>
          )}
        </div>
        <Progress value={Math.min(100, pct)} />
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">#</th>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">PDF Name</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-right">Sessions</th>
                <th className="p-3 text-right">Avg CPI</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3 text-muted-foreground">{i + 1}</td>
                  <td className="p-3 font-medium">
                    {editing === p.id ? (
                      <Input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} className="h-8" />
                    ) : p.full_name}
                  </td>
                  <td className="p-3 text-muted-foreground">{p.pdf_name}</td>
                  <td className="p-3">
                    {editing === p.id ? (
                      <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="email@…" className="h-8" />
                    ) : (p.email || <span className="text-muted-foreground">—</span>)}
                  </td>
                  <td className="p-3">
                    {p.account_status === "active" && <span className="text-primary text-xs">✅ Active</span>}
                    {p.account_status === "invited" && <span className="text-xs">📧 Invited</span>}
                    {p.account_status === "pending" && <span className="text-muted-foreground text-xs">⏳ Pending</span>}
                  </td>
                  <td className="p-3 text-right">{p.session_count ?? 0}</td>
                  <td className="p-3 text-right font-semibold">{p.avg_cpi ?? "—"}</td>
                  <td className="p-3 text-right">
                    {editing === p.id ? (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}><X size={14} /></Button>
                        <Button size="sm" onClick={() => saveEdit(p.id)}><Save size={14} /></Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        {!p.email && (
                          <Button size="sm" variant="ghost" onClick={() => beginEdit(p)}>
                            <Mail size={14} className="mr-1" /> Add email
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => beginEdit(p)}><Edit2 size={14} /></Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>
                          <Trash2 size={14} className="text-destructive" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {players.length === 0 && (
          <div className="p-10 text-center text-muted-foreground">
            No players yet. Upload a session and we'll detect them automatically.
          </div>
        )}
      </Card>
    </ClubLayout>
  );
};

export default ClubRoster;
