import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo.svg";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface InvitedPlayer {
  id: string;
  full_name: string;
  email: string | null;
  position: string | null;
  club_id: string;
  club_name?: string;
}

const POSITION_ZONES = [
  { label: "Goalkeeper", positions: ["GK"] },
  { label: "Defender", positions: ["CB", "RB", "LB", "RWB", "LWB"] },
  { label: "Midfielder", positions: ["CDM", "CM", "CAM", "RM", "LM"] },
  { label: "Forward", positions: ["RW", "LW", "ST", "CF", "SS"] },
];

const PlayerActivate = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [player, setPlayer] = useState<InvitedPlayer | null>(null);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [zone, setZone] = useState<string>("");
  const [position, setPosition] = useState<string>("");
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!token) { setError("Missing activation token."); setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase
        .from("club_players")
        .select("id, full_name, email, position, club_id, clubs(name)")
        .eq("activation_token", token)
        .gt("token_expires_at", new Date().toISOString())
        .maybeSingle();
      if (error || !data) {
        setError("This invitation link is invalid or has expired.");
      } else {
        const c: any = data;
        setPlayer({
          id: c.id, full_name: c.full_name, email: c.email, position: c.position,
          club_id: c.club_id, club_name: c.clubs?.name,
        });
        if (c.position) {
          const z = POSITION_ZONES.find((x) => x.positions.includes(c.position));
          if (z) { setZone(z.label); setPosition(c.position); }
        }
      }
      setLoading(false);
    })();
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!player) return;
    if (!player.email) { setError("This invitation doesn't have an email yet. Ask your coach to add one."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (!position) { setError("Please pick your position."); return; }

    setSubmitting(true);
    try {
      // 1. Sign up the user
      const { data: signUp, error: suErr } = await supabase.auth.signUp({
        email: player.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/player/dashboard`,
          data: { full_name: player.full_name },
        },
      });
      if (suErr) {
        // user may already exist — try sign in instead
        const { data: si, error: siErr } = await supabase.auth.signInWithPassword({
          email: player.email, password,
        });
        if (siErr || !si.user) throw new Error(suErr.message);
      }

      // 2. Sign in (in case email confirmations are on, signUp returns no session)
      let { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { data: si } = await supabase.auth.signInWithPassword({ email: player.email, password });
        session = si.session;
      }
      if (!session) {
        toast.success("Account created — check your email to confirm, then log in.");
        navigate("/login");
        return;
      }

      // 3. Get profile id (created by handle_new_user trigger)
      let profileId: string | null = null;
      for (let i = 0; i < 5 && !profileId; i++) {
        const { data: prof } = await supabase
          .from("profiles").select("id").eq("user_id", session.user.id).maybeSingle();
        if (prof?.id) profileId = prof.id;
        else await new Promise((r) => setTimeout(r, 400));
      }
      if (!profileId) throw new Error("Could not load your profile. Try again.");

      // 4. Mark profile as club_player + position
      await supabase.from("profiles").update({
        account_type: "club_player",
        position,
        full_name: player.full_name,
      }).eq("id", profileId);

      // 5. Activate club_players row (RLS allows this when token is valid + WITH CHECK matches our profile)
      const { error: actErr } = await supabase.from("club_players").update({
        user_id: profileId,
        position,
        account_status: "active",
        activated_at: new Date().toISOString(),
        activation_token: null,
        token_expires_at: null,
      }).eq("id", player.id);
      if (actErr) throw actErr;

      toast.success("Welcome to Campometric!");
      navigate("/player/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Could not create your account.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  if (error && !player) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-4">
        <Card className="p-8 max-w-md text-center">
          <h1 className="text-xl font-semibold mb-2">Invitation unavailable</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Link to="/login" className="text-primary hover:underline">Go to login</Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center mb-8">
          <img src={logo} alt="Campometric" className="h-[54px] mx-auto" />
        </Link>
        <Card className="p-8">
          <h1 className="text-2xl font-bold mb-1">Welcome to Campometric!</h1>
          <p className="text-muted-foreground text-sm mb-6">
            <strong>{player?.club_name || "Your club"}</strong> has shared your GPS performance reports with you. Set your password to access your data.
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input type="email" value={player?.email || ""} disabled />
            </div>
            <div>
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="pr-10"
                />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <Label>Confirm password</Label>
              <Input
                type={show ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <div>
              <Label>Position zone</Label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                {POSITION_ZONES.map((z) => (
                  <button key={z.label} type="button"
                    onClick={() => { setZone(z.label); setPosition(""); }}
                    className={`px-3 py-2 rounded-lg border text-sm ${zone === z.label ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                    {z.label}
                  </button>
                ))}
              </div>
            </div>
            {zone && (
              <div>
                <Label>Specific position</Label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {POSITION_ZONES.find((z) => z.label === zone)!.positions.map((p) => (
                    <button key={p} type="button" onClick={() => setPosition(p)}
                      className={`px-3 py-1.5 rounded-lg border text-xs ${position === p ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Button type="submit" disabled={submitting} className="w-full h-11 bg-[hsl(157,68%,37%)] hover:bg-[hsl(157,68%,30%)] text-white">
              {submitting ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
              Create my account
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default PlayerActivate;
