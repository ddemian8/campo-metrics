import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Copy, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";

const AdminPromoCodes = () => {
  const { loading: authLoading } = useAdmin();
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ code: "", plan_type: "player_pro", duration_days: 90, max_uses: 25, expires_at: "" });

  const fetchCodes = async () => {
    const { data } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false });
    setCodes(data || []);
    setLoading(false);
  };

  useEffect(() => { if (!authLoading) fetchCodes(); }, [authLoading]);

  const handleCreate = async () => {
    if (!form.code.trim()) { toast.error("Code is required"); return; }
    const { error } = await supabase.from("promo_codes").insert({
      code: form.code.trim().toUpperCase(),
      plan_type: form.plan_type,
      duration_days: form.duration_days,
      max_uses: form.max_uses || null,
      expires_at: form.expires_at || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Promo code created");
    setShowCreate(false);
    setForm({ code: "", plan_type: "player_pro", duration_days: 90, max_uses: 25, expires_at: "" });
    fetchCodes();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("promo_codes").update({ is_active: !current }).eq("id", id);
    fetchCodes();
  };

  const deleteCode = async (id: string) => {
    await supabase.from("promo_codes").delete().eq("id", id);
    toast.success("Deleted");
    fetchCodes();
  };

  if (authLoading || loading) return <AdminLayout><Loader2 className="animate-spin text-primary mx-auto mt-32" size={32} /></AdminLayout>;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Promo Codes</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={16} className="mr-1" />Create Code</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="p-3 text-muted-foreground font-medium">Code</th>
                  <th className="p-3 text-muted-foreground font-medium">Plan</th>
                  <th className="p-3 text-muted-foreground font-medium">Duration</th>
                  <th className="p-3 text-muted-foreground font-medium">Uses</th>
                  <th className="p-3 text-muted-foreground font-medium">Status</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3 font-mono font-bold">{c.code}</td>
                    <td className="p-3 capitalize">{c.plan_type.replace("_", " ")}</td>
                    <td className="p-3">{c.duration_days} days</td>
                    <td className="p-3">{c.times_used}/{c.max_uses || "∞"}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-3 flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Copied"); }}>
                        <Copy size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleActive(c.id, c.is_active)}>
                        {c.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCode(c.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Promo Code</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Code (e.g. SUMMER2025)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <Select value={form.plan_type} onValueChange={(v) => setForm({ ...form, plan_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="player_pro">Player Pro</SelectItem>
                <SelectItem value="club">Club</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Duration (days)" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: parseInt(e.target.value) || 30 })} />
            <Input type="number" placeholder="Max uses" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: parseInt(e.target.value) || 0 })} />
            <Input type="date" placeholder="Expiry date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminPromoCodes;
