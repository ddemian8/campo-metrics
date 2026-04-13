import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2, Camera, Check, X, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import FootballDropdowns from "@/components/FootballDropdowns";

const POSITION_ZONES = [
  { zone: "GK", label: "Goalkeeper", positions: ["GK"] },
  { zone: "DEF", label: "Defender", positions: ["CB", "RB", "LB", "RWB", "LWB"] },
  { zone: "MID", label: "Midfielder", positions: ["CDM", "CM", "CAM", "RM", "LM"] },
  { zone: "FWD", label: "Forward", positions: ["ST", "SS", "RW", "LW", "CF"] },
];

const Settings = () => {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  // Form state
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [preferredFoot, setPreferredFoot] = useState("");
  const [position, setPosition] = useState("");
  const [positionSpecific, setPositionSpecific] = useState("");
  const [currentClub, setCurrentClub] = useState("");
  const [currentLeague, setCurrentLeague] = useState("");
  const [country, setCountry] = useState("");
  const [countryId, setCountryId] = useState<number | null>(null);
  const [leagueId, setLeagueId] = useState<number | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [transfermarktUrl, setTransfermarktUrl] = useState("");
  const [username, setUsername] = useState("");
  const [isPublic] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState("");

  // Username validation
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  // Password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      setUser(session.user);

      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (p) {
        setProfile(p);
        setFullName(p.full_name || "");
        setDob(p.date_of_birth || "");
        setHeightCm(p.height_cm?.toString() || "");
        setWeightKg(p.weight_kg?.toString() || "");
        setPreferredFoot(p.preferred_foot || "");
        setPosition(p.position || "");
        setPositionSpecific(p.position_specific || "");
        setCurrentClub(p.current_club || "");
        setCurrentLeague(p.current_league || "");
        setCountry(p.country || "");
        setCountryId((p as any).country_id || null);
        setLeagueId((p as any).league_id || null);
        setTeamId((p as any).team_id || null);
        setTransfermarktUrl(p.transfermarkt_url || "");
        setUsername(p.username || "");
        // is_public is always true — no toggle needed
        setAvatarUrl(p.avatar_url || "");
      }
      setLoading(false);
    };
    init();
  }, [navigate]);

  // Username check
  useEffect(() => {
    if (!username || username === profile?.username) {
      setUsernameAvailable(username === profile?.username ? true : null);
      return;
    }
    const timer = setTimeout(async () => {
      setUsernameChecking(true);
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .neq("id", profile?.id || "")
        .limit(1);
      setUsernameAvailable(!data || data.length === 0);
      setUsernameChecking(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [username, profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed"); return; }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(urlData.publicUrl + "?t=" + Date.now());
    toast.success("Avatar uploaded");
  };

  const handleSave = async () => {
    if (!profile) return;
    if (username && usernameAvailable === false) {
      toast.error("This username is already taken");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName || null,
        date_of_birth: dob || null,
        height_cm: heightCm ? parseInt(heightCm) : null,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        preferred_foot: preferredFoot || null,
        position: position || null,
        position_specific: positionSpecific || null,
        current_club: currentClub || null,
        current_league: currentLeague || null,
        country: country || null,
        country_id: countryId,
        league_id: leagueId,
        team_id: teamId,
        transfermarkt_url: transfermarktUrl || null,
        username: username || null,
        is_public: isPublic,
        avatar_url: avatarUrl || null,
      })
      .eq("id", profile.id);

    setSaving(false);
    if (error) toast.error("Failed to save changes");
    else toast.success("Profile updated successfully");
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated");
      setShowPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const selectedZone = POSITION_ZONES.find((z) => z.zone === position || z.positions.includes(positionSpecific || ""));
  const zoneForSpecific = POSITION_ZONES.find((z) => z.zone === position);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight">
            <span className="text-foreground">Campo</span>
            <span className="text-primary">metric</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft size={16} className="mr-1" /> Dashboard
          </Button>
        </div>
      </nav>

      <div className="container max-w-2xl py-10">
        <h1 className="text-2xl font-bold text-foreground mb-8">Settings</h1>

        {/* Section 1 — Personal Info */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-foreground mb-5">Personal Information</h2>

          <div className="flex items-center gap-5 mb-6">
            <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="bg-secondary text-foreground text-xl">
                  {fullName ? fullName[0].toUpperCase() : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Profile photo</p>
              <p className="text-xs text-muted-foreground">Click to upload</p>
            </div>
          </div>

          <div className="grid gap-4">
            <div>
              <Label>Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5 bg-card" />
            </div>
            <div>
              <Label>Date of Birth</Label>
              <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="mt-1.5 bg-card" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Height (cm)</Label>
                <Input type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} className="mt-1.5 bg-card" />
              </div>
              <div>
                <Label>Weight (kg)</Label>
                <Input type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} className="mt-1.5 bg-card" />
              </div>
            </div>
            <div>
              <Label>Preferred Foot</Label>
              <div className="flex gap-2 mt-1.5">
                {["Left", "Right", "Both"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setPreferredFoot(f)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                      preferredFoot === f ? "bg-[#1D9E75] text-white border-[#1D9E75]" : "bg-card text-muted-foreground border-border hover:text-foreground"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 2 — Football Profile */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-foreground mb-5">Football Profile</h2>
          <div className="grid gap-4">
            <div>
              <Label>Position Zone</Label>
              <div className="flex gap-2 mt-1.5">
                {POSITION_ZONES.map((z) => (
                  <button
                    key={z.zone}
                    onClick={() => { setPosition(z.zone); setPositionSpecific(""); }}
                    className={cn(
                      "flex-1 px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors text-center",
                      position === z.zone ? "bg-[#1D9E75] text-white border-[#1D9E75]" : "bg-card text-muted-foreground border-border hover:text-foreground"
                    )}
                  >
                    {z.zone}
                  </button>
                ))}
              </div>
            </div>

            {zoneForSpecific && (
              <div>
                <Label>Specific Position</Label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {zoneForSpecific.positions.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPositionSpecific(p)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                        positionSpecific === p ? "bg-[#1D9E75] text-white border-[#1D9E75]" : "bg-card text-muted-foreground border-border hover:text-foreground"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <FootballDropdowns
              countryId={countryId}
              leagueId={leagueId}
              teamId={teamId}
              countryName={country}
              leagueName={currentLeague}
              teamName={currentClub}
              onCountryChange={(id, name) => { setCountryId(id); setCountry(name); }}
              onLeagueChange={(id, name) => { setLeagueId(id); setCurrentLeague(name); }}
              onTeamChange={(id, name) => { setTeamId(id); setCurrentClub(name); }}
            />
            <div>
              <Label>Transfermarkt URL</Label>
              <Input value={transfermarktUrl} onChange={(e) => setTransfermarktUrl(e.target.value)} placeholder="https://www.transfermarkt.com/..." className="mt-1.5 bg-card" />
            </div>
          </div>
        </section>

        {/* Section 3 — Username */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-foreground mb-5">Username & Profile URL</h2>
          <div className="grid gap-4">
            <div>
              <Label>Username</Label>
              <div className="relative mt-1.5">
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder={fullName ? fullName.toLowerCase().replace(/\s+/g, "-") : "your-username"}
                  className="bg-card pr-10"
                />
                {usernameChecking && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                {!usernameChecking && usernameAvailable === true && username && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1D9E75]" />
                )}
                {!usernameChecking && usernameAvailable === false && (
                  <X className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-400" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {username ? (
                  <>Your public profile: <a href={`/player/${username}`} className="text-[#1D9E75] hover:underline">campometric.io/player/{username}</a></>
                ) : (
                  "Set your username to enable your public profile URL"
                )}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-medium text-foreground">Your profile is public</p>
              <p className="text-xs text-muted-foreground">
                All Campometric profiles are visible on the leaderboard and player directory.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4 — Account */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-foreground mb-5">Account</h2>
          <div className="grid gap-4">
            <div>
              <Label>Email</Label>
              <Input value={user?.email || ""} readOnly className="mt-1.5 bg-card opacity-60 cursor-not-allowed" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Password</p>
                <p className="text-xs text-muted-foreground">Change your password</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowPasswordModal(true)}>
                Change password
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Current Plan</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {profile?.subscription_plan === "free" ? "Free" : profile?.subscription_plan || "Free"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/#pricing")}>
                View plans
              </Button>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="text-sm text-red-400 hover:text-red-300 text-left mt-4 transition-colors"
            >
              Delete my account
            </button>
          </div>
        </section>

        {/* Save button */}
        <Button
          className="w-full bg-[#1D9E75] hover:bg-[#178a64] text-white font-semibold h-12"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save changes
        </Button>
      </div>

      {/* Password modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowPasswordModal(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Change Password</h3>
            <div className="space-y-3">
              <div>
                <Label>New Password</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1 bg-background" />
              </div>
              <div>
                <Label>Confirm Password</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 bg-background" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setShowPasswordModal(false)}>Cancel</Button>
              <Button className="flex-1 bg-[#1D9E75] hover:bg-[#178a64] text-white" onClick={handleChangePassword} disabled={changingPassword}>
                {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete Account</h3>
            <p className="text-sm text-muted-foreground mb-5">
              This will permanently delete your account and all your data. This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={async () => {
                toast.error("Please contact support to delete your account");
                setShowDeleteModal(false);
              }}>
                Delete account
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
