import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, KeyRound, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const SETTINGS_KEYS = [
  { key: "sender_email", label: "Sender Email Address", type: "text" },
  { key: "free_report_limit", label: "Free Plan Report Limit / Month", type: "number" },
  { key: "admin_emails", label: "Admin Emails (comma-separated)", type: "text" },
  { key: "maintenance_mode", label: "Maintenance Mode", type: "toggle" },
  { key: "default_commission_rate", label: "Default Affiliate Commission Rate", type: "number" },
  { key: "min_payout_referrals", label: "Min Payout Referrals", type: "number" },
  { key: "min_payout_amount", label: "Min Payout Amount (€)", type: "number" },
  { key: "registration_enabled", label: "Registration Enabled", type: "toggle" },
  { key: "min_leaderboard_sessions", label: "Min Sessions for Leaderboard", type: "number" },
];

const AdminPlatformSettings = () => {
  const { loading: authLoading, user } = useAdmin();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    supabase.from("platform_settings").select("*").then(({ data }) => {
      const map: Record<string, string> = {};
      (data || []).forEach(s => { map[s.key] = s.value; });
      setSettings(map);
      setLoading(false);
    });
  }, [authLoading]);

  const save = async (key: string) => {
    await supabase.from("platform_settings").update({ value: settings[key], updated_at: new Date().toISOString() }).eq("key", key);
    toast.success(`${key} saved`);
  };

  if (authLoading || loading) return <AdminLayout><Loader2 className="animate-spin text-primary mx-auto mt-32" size={32} /></AdminLayout>;

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Platform Settings</h1>

      {/* Change admin password */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound size={18} className="text-primary" />
            Change admin password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Signed in as <span className="text-foreground font-medium">{user?.email}</span>. Minimum 6 characters. Common/leaked passwords are blocked.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 max-w-2xl">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide" : "Show"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <Button
            onClick={async () => {
              if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
              if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
              setChangingPassword(true);
              const { error } = await supabase.auth.updateUser({ password: newPassword });
              setChangingPassword(false);
              if (error) {
                toast.error(error.message || "Failed to update password");
                return;
              }
              toast.success("Password updated successfully");
              setNewPassword("");
              setConfirmPassword("");
            }}
            disabled={changingPassword || !newPassword || !confirmPassword}
          >
            {changingPassword ? <Loader2 size={14} className="animate-spin mr-2" /> : <KeyRound size={14} className="mr-2" />}
            Update password
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-6">
          {SETTINGS_KEYS.map(s => (
            <div key={s.key} className="flex items-center justify-between gap-4">
              <label className="text-sm font-medium min-w-[200px]">{s.label}</label>
              {s.type === "toggle" ? (
                <div className="flex items-center gap-3">
                  <Switch
                    checked={settings[s.key] === "true"}
                    onCheckedChange={(v) => {
                      setSettings({ ...settings, [s.key]: v ? "true" : "false" });
                    }}
                  />
                  <Button size="sm" variant="outline" onClick={() => save(s.key)}><Save size={14} /></Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <Input
                    type={s.type === "number" ? "number" : "text"}
                    value={settings[s.key] || ""}
                    onChange={(e) => setSettings({ ...settings, [s.key]: e.target.value })}
                  />
                  <Button size="sm" variant="outline" onClick={() => save(s.key)}><Save size={14} /></Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminPlatformSettings;
