import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowRight, Check, ShieldCheck, Sparkles } from "lucide-react";
import logo from "@/assets/logo.svg";
import FootballDropdowns from "@/components/FootballDropdowns";

const SPORTS = [
  { value: "football", label: "Football (Soccer)", available: true },
  { value: "american_football", label: "American Football", available: false },
  { value: "rugby", label: "Rugby", available: false },
  { value: "ice_hockey", label: "Ice Hockey", available: false },
  { value: "basketball", label: "Basketball", available: false },
  { value: "volleyball", label: "Volleyball", available: false },
];

const ROLES = [
  "Head Coach",
  "Assistant Coach",
  "Fitness Coach",
  "Performance Analyst",
  "Team Manager",
  "Other",
];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const ClubSignup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Head Coach");

  // Step 2
  const [clubName, setClubName] = useState("");
  const [sport, setSport] = useState("football");
  const [countryId, setCountryId] = useState<number | null>(null);
  const [leagueId, setLeagueId] = useState<number | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [countryName, setCountryName] = useState("");
  const [leagueName, setLeagueName] = useState("");
  const [teamName, setTeamName] = useState("");

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      toast.error("Please fill all fields. Password must be 6+ characters.");
      return;
    }
    setStep(2);
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalClubName = clubName.trim() || teamName.trim();
    if (!finalClubName) {
      toast.error("Please select your team (or enter it manually).");
      return;
    }
    setSubmitting(true);

    try {
      // Create auth user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/club/dashboard`,
          data: { full_name: fullName, role },
        },
      });
      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error("Could not create account");

      // Wait briefly for the handle_new_user trigger
      let profileId: string | null = null;
      for (let i = 0; i < 10 && !profileId; i++) {
        await new Promise((r) => setTimeout(r, 300));
        const { data: prof } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", signUpData.user.id)
          .maybeSingle();
        if (prof?.id) profileId = prof.id;
      }
      if (!profileId) throw new Error("Profile creation failed");

      // Mark account as club_owner
      await supabase
        .from("profiles")
        .update({ account_type: "club_owner", full_name: fullName })
        .eq("id", profileId);

      // Create the club
      const baseSlug = slugify(clubName);
      const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      const trialEnds = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const { error: clubErr } = await supabase.from("clubs").insert({
        name: clubName,
        slug,
        sport,
        admin_id: profileId,
        country_id: countryId,
        league_id: leagueId,
        team_id: teamId,
        country_name: countryName || null,
        league_name: leagueName || null,
        team_name: teamName || null,
        country: countryName || null,
        league: leagueName || null,
        subscription_plan: "trial",
        subscription_status: "active",
        trial_ends_at: trialEnds,
        max_players: 25,
      });
      if (clubErr) throw clubErr;

      setStep(3);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Sign up failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="Campometric" className="h-12" />
          </Link>
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Already have a club account? Log in
          </Link>
        </div>
      </header>

      <main className="flex-1 container max-w-2xl py-12">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full grid place-items-center text-sm font-semibold border-2 ${
                  step === n
                    ? "bg-primary text-primary-foreground border-primary"
                    : step > n
                      ? "bg-primary/20 text-primary border-primary/40"
                      : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {step > n ? <Check size={16} /> : n}
              </div>
              {n < 3 && <div className={`h-0.5 w-12 ${step > n ? "bg-primary/40" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <Card className="p-8">
            <h1 className="text-2xl font-bold mb-2">Create your club account</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Start your 30-day free trial. No credit card required.
            </p>
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <Label htmlFor="fullName">Your full name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Alex Coach" required />
              </div>
              <div>
                <Label htmlFor="email">Your email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@yourclub.com" required />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required minLength={6} />
              </div>
              <div>
                <Label>Your role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" size="lg">
                Continue <ArrowRight size={16} className="ml-1" />
              </Button>
            </form>
          </Card>
        )}

        {step === 2 && (
          <Card className="p-8">
            <h1 className="text-2xl font-bold mb-2">About your club</h1>
            <p className="text-sm text-muted-foreground mb-6">Tell us where your team plays.</p>
            <form onSubmit={handleStep2} className="space-y-4">
              <div>
                <Label>Sport</Label>
                <Select value={sport} onValueChange={setSport}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SPORTS.map((s) => (
                      <SelectItem key={s.value} value={s.value} disabled={!s.available}>
                        <div className="flex items-center gap-2">
                          <span>{s.label}</span>
                          {!s.available && (
                            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              Coming soon
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <FootballDropdowns
                countryId={countryId}
                leagueId={leagueId}
                teamId={teamId}
                countryName={countryName}
                leagueName={leagueName}
                teamName={teamName}
                onCountryChange={(id, name) => { setCountryId(id); setCountryName(name || ""); }}
                onLeagueChange={(id, name) => { setLeagueId(id); setLeagueName(name || ""); }}
                onTeamChange={(id, name) => {
                  setTeamId(id);
                  setTeamName(name || "");
                  if (name && !clubName) setClubName(name);
                }}
              />

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button type="submit" className="flex-1" size="lg" disabled={submitting}>
                  {submitting ? "Creating club…" : (<>Create Club <ArrowRight size={16} className="ml-1" /></>)}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {step === 3 && (
          <Card className="p-10 text-center">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-primary/20 grid place-items-center">
              <Sparkles size={32} className="text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-3">Welcome to Campometric!</h1>
            <p className="text-muted-foreground mb-6">
              Your <strong className="text-foreground">30-day free trial</strong> starts now. Explore the platform with your full team — completely free.
            </p>
            <div className="bg-muted/30 rounded-lg p-4 mb-6 text-left max-w-sm mx-auto space-y-2 text-sm">
              <div className="flex items-center gap-2"><Check size={14} className="text-primary" /> Up to 25 players</div>
              <div className="flex items-center gap-2"><Check size={14} className="text-primary" /> Unlimited GPS sessions</div>
              <div className="flex items-center gap-2"><Check size={14} className="text-primary" /> AI-generated reports</div>
              <div className="flex items-center gap-2"><ShieldCheck size={14} className="text-primary" /> No credit card required</div>
            </div>
            <p className="text-xs text-muted-foreground mb-6">After trial: €69/month for up to 25 players.</p>
            <Button size="lg" onClick={() => navigate("/club/dashboard")}>
              Go to Dashboard <ArrowRight size={16} className="ml-1" />
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
};

export default ClubSignup;
