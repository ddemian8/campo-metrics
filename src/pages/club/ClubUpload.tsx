import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ClubLayout from "@/components/club/ClubLayout";
import { useClub } from "@/hooks/useClub";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Check, AlertTriangle, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Step = "upload" | "details" | "players" | "generate" | "done";

interface DetectedPlayer {
  pdf_name: string;
  minutes_played?: number;
  distance?: number;
  dist_sp_z4plus?: number;
  dist_sp_z5?: number;
  max_sp?: number;
  acc_ev?: number;
  dec_ev?: number;
  sp_ev?: number;
  hmld?: number;
}

interface MatchedPlayer extends DetectedPlayer {
  matched_id: string | null;
  matched_full_name: string | null;
  add_to_roster: boolean;
}

interface ReportProgress {
  pdf_name: string;
  status: "waiting" | "running" | "done" | "error";
  cpi?: number;
  error?: string;
}

const normName = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

const ClubUpload = () => {
  const { club } = useClub();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("upload");
  const [busy, setBusy] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState("");
  const [detected, setDetected] = useState<DetectedPlayer[]>([]);
  const [matched, setMatched] = useState<MatchedPlayer[]>([]);

  const [sessionName, setSessionName] = useState("");
  const [sessionType, setSessionType] = useState<"match" | "training">("training");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [opponent, setOpponent] = useState("");
  const [competition, setCompetition] = useState("");

  const [progress, setProgress] = useState<ReportProgress[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handleFile = async (f: File) => {
    if (f.type !== "application/pdf") {
      toast.error("Please upload a PDF file.");
      return;
    }
    setBusy(true);
    setFile(f);
    try {
      const buf = await f.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = "";
      for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
      const b64 = btoa(bin);
      setPdfBase64(b64);

      const { data, error } = await supabase.functions.invoke("parse-team-pdf", {
        body: { pdf_base64: b64 },
      });
      if (error) throw error;
      if (!data?.players?.length) {
        toast.error("No players detected in the PDF.");
        setBusy(false);
        return;
      }

      setDetected(data.players);
      if (data.session_date) setSessionDate(data.session_date);
      if (data.session_type === "match" || data.session_type === "training") setSessionType(data.session_type);
      if (data.opponent) setOpponent(data.opponent);
      if (data.competition) setCompetition(data.competition);
      setSessionName(data.session_type === "match"
        ? `Match vs ${data.opponent || "Opponent"} — ${data.session_date || sessionDate}`
        : `Training — ${data.session_date || sessionDate}`);
      setStep("details");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Could not parse the PDF. Please try another file.");
    } finally {
      setBusy(false);
    }
  };

  const goToPlayers = async () => {
    if (!club || !sessionName.trim()) { toast.error("Session name is required."); return; }
    // Match against roster
    const { data: roster } = await supabase
      .from("club_players")
      .select("id, full_name, pdf_name")
      .eq("club_id", club.id)
      .eq("is_active", true);

    const m: MatchedPlayer[] = detected.map((p) => {
      const norm = normName(p.pdf_name);
      const found = (roster || []).find((r) => normName(r.pdf_name) === norm);
      return {
        ...p,
        matched_id: found?.id || null,
        matched_full_name: found?.full_name || null,
        add_to_roster: !found,
      };
    });
    setMatched(m);
    setStep("players");
  };

  const newPlayersCount = matched.filter((p) => !p.matched_id && p.add_to_roster).length;
  const existingCount = matched.filter((p) => p.matched_id).length;
  const willGenerateCount = existingCount + newPlayersCount;
  const rosterCount = (club?.max_players || 25);
  const overLimit = (existingCount + newPlayersCount) > rosterCount;

  const toggleAdd = (idx: number) => {
    setMatched((prev) => prev.map((p, i) => i === idx ? { ...p, add_to_roster: !p.add_to_roster } : p));
  };

  const addAllNew = () => {
    setMatched((prev) => prev.map((p) => p.matched_id ? p : { ...p, add_to_roster: true }));
  };

  const startGenerate = async () => {
    if (!club || willGenerateCount === 0) { toast.error("No players to generate reports for."); return; }
    setBusy(true);

    try {
      // 1. Upload PDF (best-effort; not required)
      let pdfUrl: string | null = null;
      if (file) {
        const path = `${club.id}/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("club-pdfs").upload(path, file, { upsert: false });
        if (!upErr) pdfUrl = path;
      }

      // 2. Insert new roster players
      const toInsert = matched.filter((p) => !p.matched_id && p.add_to_roster);
      if (toInsert.length) {
        const { data: created, error: insErr } = await supabase.from("club_players").insert(
          toInsert.map((p) => ({
            club_id: club.id,
            full_name: p.pdf_name,
            pdf_name: p.pdf_name,
            account_status: "pending",
          })),
        ).select("id, pdf_name");
        if (insErr) throw insErr;
        // Patch matched with new ids
        setMatched((prev) => prev.map((p) => {
          if (p.matched_id) return p;
          const found = (created || []).find((c) => c.pdf_name === p.pdf_name);
          return found ? { ...p, matched_id: found.id } : p;
        }));
        // Use the patched data locally too
        for (const p of matched) {
          if (!p.matched_id) {
            const found = (created || []).find((c) => c.pdf_name === p.pdf_name);
            if (found) p.matched_id = found.id;
          }
        }
      }

      // 3. Create session row
      const { data: prof } = await supabase.from("profiles").select("id").eq("user_id", (await supabase.auth.getUser()).data.user!.id).single();

      const { data: sess, error: sessErr } = await supabase.from("club_sessions").insert({
        club_id: club.id,
        uploaded_by: prof!.id,
        session_name: sessionName,
        session_type: sessionType,
        session_date: sessionDate,
        opponent: sessionType === "match" ? opponent : null,
        competition: sessionType === "match" ? competition : null,
        pdf_url: pdfUrl,
        players_detected: matched.length,
        raw_pdf_data: { players: detected, opponent, competition },
      }).select("id").single();
      if (sessErr) throw sessErr;
      setSessionId(sess.id);

      // 4. Generate reports per player
      const playersToProcess = matched.filter((p) => p.matched_id);
      const initial: ReportProgress[] = playersToProcess.map((p) => ({ pdf_name: p.pdf_name, status: "waiting" }));
      setProgress(initial);
      setStep("generate");

      let generated = 0;
      for (let i = 0; i < playersToProcess.length; i++) {
        const p = playersToProcess[i];
        setProgress((prev) => prev.map((r, idx) => idx === i ? { ...r, status: "running" } : r));
        try {
          const minutes = p.minutes_played || 90;
          const { data: report, error: repErr } = await supabase.functions.invoke("generate-report", {
            body: {
              player_name: p.pdf_name,
              position: "Unknown",
              session_type: sessionType,
              session_date: sessionDate,
              opponent: sessionType === "match" ? opponent : null,
              competition: sessionType === "match" ? competition : null,
              minutes_played: minutes,
              gps_data: {
                distance: p.distance,
                dist_sp_z4plus: p.dist_sp_z4plus,
                dist_sp_z5: p.dist_sp_z5,
                max_sp: p.max_sp,
                acc_ev: p.acc_ev,
                dec_ev: p.dec_ev,
                sp_ev: p.sp_ev,
                hmld: p.hmld,
              },
              input_method: "pdf_upload",
            },
          });

          if (repErr) throw repErr;
          const cpi = report?.ai_report?.cpi || report?.cpi || null;
          await supabase.from("club_reports").insert({
            club_session_id: sess.id,
            club_player_id: p.matched_id!,
            club_id: club.id,
            report_data: report?.ai_report || report,
            cpi_score: cpi,
            raw_metrics: {
              minutes_played: minutes,
              distance: p.distance,
              dist_sp_z4plus: p.dist_sp_z4plus,
              dist_sp_z5: p.dist_sp_z5,
              max_sp: p.max_sp,
              acc_ev: p.acc_ev,
              dec_ev: p.dec_ev,
              sp_ev: p.sp_ev,
              hmld: p.hmld,
            },
          });
          generated++;
          setProgress((prev) => prev.map((r, idx) => idx === i ? { ...r, status: "done", cpi } : r));
        } catch (err: any) {
          console.error("Report failed for", p.pdf_name, err);
          setProgress((prev) => prev.map((r, idx) => idx === i ? { ...r, status: "error", error: err.message } : r));
        }
      }

      await supabase.from("club_sessions").update({ reports_generated: generated }).eq("id", sess.id);
      setStep("done");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to start generation");
    } finally {
      setBusy(false);
    }
  };

  const completed = progress.filter((p) => p.status === "done").length;
  const totalProg = progress.length;
  const progPct = totalProg > 0 ? (completed / totalProg) * 100 : 0;

  return (
    <ClubLayout>
      <h1 className="text-3xl font-bold mb-2">Upload GPS Session</h1>
      <p className="text-muted-foreground mb-8">Drop your team's GPS PDF and we'll generate a report for every player.</p>

      {step === "upload" && (
        <Card className="p-10">
          <label
            htmlFor="pdf-input"
            className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl p-12 cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
          >
            {busy ? (
              <>
                <Loader2 size={36} className="text-primary animate-spin" />
                <p className="font-medium">Analyzing your PDF…</p>
                <p className="text-xs text-muted-foreground">This usually takes 10–30 seconds.</p>
              </>
            ) : (
              <>
                <Upload size={36} className="text-muted-foreground" />
                <p className="font-medium">Drop your GPS session PDF here</p>
                <p className="text-xs text-muted-foreground">or click to browse</p>
                <Button type="button" variant="outline" size="sm" className="mt-2">Browse files</Button>
              </>
            )}
            <input
              id="pdf-input"
              type="file"
              accept="application/pdf"
              className="hidden"
              disabled={busy}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </label>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Compatible with gpexe, STATSports, Catapult, PlayerData, Polar Team Pro, and more.
          </p>
        </Card>
      )}

      {step === "details" && (
        <Card className="p-6 max-w-2xl">
          <h2 className="text-lg font-semibold mb-1">Session details</h2>
          <p className="text-sm text-muted-foreground mb-6">We pre-filled what we could detect from the PDF.</p>
          <div className="space-y-4">
            <div>
              <Label>Session name</Label>
              <Input value={sessionName} onChange={(e) => setSessionName(e.target.value)} />
            </div>
            <div>
              <Label>Type</Label>
              <div className="flex gap-2 mt-1.5">
                {(["match", "training"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setSessionType(t)}
                    className={`px-4 py-2 rounded-lg border text-sm capitalize ${sessionType === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
            </div>
            {sessionType === "match" && (
              <>
                <div>
                  <Label>Opponent</Label>
                  <Input value={opponent} onChange={(e) => setOpponent(e.target.value)} placeholder="e.g. FC Zimbru" />
                </div>
                <div>
                  <Label>Competition</Label>
                  <Input value={competition} onChange={(e) => setCompetition(e.target.value)} placeholder="e.g. Super Liga 2025/26" />
                </div>
              </>
            )}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
              <Button className="flex-1" onClick={goToPlayers}>Continue <ArrowRight size={16} className="ml-1" /></Button>
            </div>
          </div>
        </Card>
      )}

      {step === "players" && (
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold mb-1">{matched.length} players detected</h2>
              <p className="text-sm text-muted-foreground">
                {existingCount} already in your roster · {matched.filter((p) => !p.matched_id).length} new
              </p>
            </div>
            {matched.some((p) => !p.matched_id) && (
              <Button variant="outline" size="sm" onClick={addAllNew}>Add all new players</Button>
            )}
          </div>

          {overLimit && (
            <div className="mb-4 p-3 rounded-lg border border-primary/30 bg-primary/5 text-sm flex gap-2">
              <AlertTriangle size={16} className="text-primary shrink-0 mt-0.5" />
              <span>This will exceed your {rosterCount}-player limit. Extra players cost €2/month each.</span>
            </div>
          )}

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">#</th>
                  <th className="p-3 text-left">Name from PDF</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {matched.map((p, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="p-3 text-muted-foreground">{i + 1}</td>
                    <td className="p-3 font-medium">{p.pdf_name}</td>
                    <td className="p-3">
                      {p.matched_id ? (
                        <span className="inline-flex items-center gap-1 text-primary"><Check size={14} /> In roster</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-primary/10 text-primary">🆕 New player</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {!p.matched_id && (
                        <Button size="sm" variant={p.add_to_roster ? "default" : "outline"} onClick={() => toggleAdd(i)}>
                          {p.add_to_roster ? "Will add" : "Add to roster"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 pt-6">
            <Button variant="outline" onClick={() => setStep("details")}>Back</Button>
            <Button className="flex-1" onClick={startGenerate} disabled={busy || willGenerateCount === 0}>
              {busy ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
              Generate {willGenerateCount} {willGenerateCount === 1 ? "report" : "reports"} <ArrowRight size={16} className="ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {step === "generate" && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-2">Generating reports…</h2>
          <p className="text-sm text-muted-foreground mb-4">{completed} of {totalProg} done</p>
          <Progress value={progPct} className="mb-6" />
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {progress.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded border border-border">
                <div className="flex items-center gap-2">
                  {p.status === "done" && <Check size={16} className="text-primary" />}
                  {p.status === "running" && <Loader2 size={16} className="text-primary animate-spin" />}
                  {p.status === "waiting" && <div className="h-4 w-4 rounded border border-muted-foreground/40" />}
                  {p.status === "error" && <AlertTriangle size={16} className="text-destructive" />}
                  <span className="text-sm">{p.pdf_name}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {p.status === "done" && `CPI: ${p.cpi ?? "—"}`}
                  {p.status === "running" && "Generating…"}
                  {p.status === "waiting" && "Waiting"}
                  {p.status === "error" && "Failed"}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {step === "done" && (
        <Card className="p-10 text-center">
          <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-primary/20 grid place-items-center">
            <Check size={32} className="text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Reports generated!</h2>
          <p className="text-muted-foreground mb-6">{completed} reports are ready to view.</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate("/club/dashboard")}>Back to dashboard</Button>
            <Button onClick={() => sessionId && navigate(`/club/dashboard/sessions/${sessionId}`)}>
              View session <ArrowRight size={16} className="ml-1" />
            </Button>
          </div>
        </Card>
      )}
    </ClubLayout>
  );
};

export default ClubUpload;
