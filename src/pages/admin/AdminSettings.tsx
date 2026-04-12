import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";
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
  const { loading: authLoading } = useAdmin();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

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
