import { useEffect, useState } from "react";
import ClubLayout from "@/components/club/ClubLayout";
import { useClub, trialDaysRemaining } from "@/hooks/useClub";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import FootballDropdowns from "@/components/FootballDropdowns";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePaddle } from "@/hooks/usePaddle";

const ClubSettings = () => {
  const { club, profile } = useClub();
  const navigate = useNavigate();
  const { openCheckout } = usePaddle();

  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [countryId, setCountryId] = useState<number | null>(null);
  const [leagueId, setLeagueId] = useState<number | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [countryName, setCountryName] = useState("");
  const [leagueName, setLeagueName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!club) return;
    setName(club.name);
    setLogoUrl(club.logo_url || "");
    setCountryId(club.country_id);
    setLeagueId(club.league_id);
    setTeamId(club.team_id);
    setCountryName(club.country_name || "");
    setLeagueName(club.league_name || "");
    setTeamName(club.team_name || "");
  }, [club]);

  const save = async () => {
    if (!club) return;
    setSaving(true);
    const { error } = await supabase.from("clubs").update({
      name, logo_url: logoUrl || null,
      country_id: countryId, league_id: leagueId, team_id: teamId,
      country_name: countryName || null, league_name: leagueName || null, team_name: teamName || null,
      country: countryName || null, league: leagueName || null,
    }).eq("id", club.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Club updated");
  };

  const uploadLogo = async (file: File) => {
    if (!club) return;
    const path = `club-logos/${club.id}-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setLogoUrl(data.publicUrl);
    toast.success("Logo uploaded — don't forget to save");
  };

  const deleteClub = async () => {
    if (!club) return;
    if (!confirm(`This will permanently delete "${club.name}", all its players, sessions and reports. This cannot be undone. Continue?`)) return;
    if (!confirm("Are you absolutely sure?")) return;
    const { error } = await supabase.from("clubs").delete().eq("id", club.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Club deleted");
    navigate("/");
  };

  const trialDays = trialDaysRemaining(club?.trial_ends_at || null);

  return (
    <ClubLayout>
      <h1 className="text-3xl font-bold mb-1">Settings</h1>
      <p className="text-muted-foreground mb-8">Manage your club, subscription and account.</p>

      <div className="space-y-6 max-w-2xl">
        <Card className="p-6">
          <h2 className="font-semibold mb-4">Club details</h2>
          <div className="space-y-4">
            <div>
              <Label>Club name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Sport</Label>
              <Input value={club?.sport === "football" ? "Football (Soccer)" : club?.sport || ""} disabled />
              <p className="text-xs text-muted-foreground mt-1">More sports coming soon.</p>
            </div>
            <div>
              <Label>Logo</Label>
              <div className="flex items-center gap-3 mt-1.5">
                {logoUrl && <img src={logoUrl} alt="Logo" className="h-12 w-12 rounded-full object-cover bg-muted" />}
                <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }} />
              </div>
            </div>
            <FootballDropdowns
              countryId={countryId}
              leagueId={leagueId}
              teamId={teamId}
              countryName={countryName}
              leagueName={leagueName}
              teamName={teamName}
              onCountryChange={(id, n) => { setCountryId(id); setCountryName(n || ""); }}
              onLeagueChange={(id, n) => { setLeagueId(id); setLeagueName(n || ""); }}
              onTeamChange={(id, n) => { setTeamId(id); setTeamName(n || ""); }}
            />
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold mb-4">Subscription</h2>
          {club?.subscription_plan === "trial" && (
            <div className="space-y-3">
              <p className="text-sm">
                <span className="text-primary font-medium">Free trial</span> · {trialDays} days remaining
              </p>
              <p className="text-xs text-muted-foreground">After trial: €69/month for up to 25 players.</p>
              <Button onClick={() => openCheckout("club")}>Upgrade to Premium</Button>
            </div>
          )}
          {club?.subscription_plan === "premium" && (
            <div className="space-y-3">
              <p className="text-sm"><span className="text-primary font-medium">Premium</span> — €69/month</p>
              <Button variant="outline" onClick={() => openCheckout("club")}>Manage subscription</Button>
            </div>
          )}
          {club?.subscription_plan === "canceled" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Subscription canceled.</p>
              <Button onClick={() => openCheckout("club")}>Reactivate</Button>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold mb-4">Your profile</h2>
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Name:</span> {profile?.full_name || "—"}</p>
            <p><span className="text-muted-foreground">Account type:</span> Club owner</p>
          </div>
        </Card>

        <Card className="p-6 border-destructive/40">
          <h2 className="font-semibold mb-2 text-destructive">Danger zone</h2>
          <p className="text-xs text-muted-foreground mb-4">Permanently delete this club and all of its data.</p>
          <Button variant="destructive" onClick={deleteClub}>
            <Trash2 size={14} className="mr-1" /> Delete club
          </Button>
        </Card>
      </div>
    </ClubLayout>
  );
};

export default ClubSettings;
