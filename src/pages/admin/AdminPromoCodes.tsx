import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Copy, Trash2, Edit2, Eye, Shuffle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const genCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

const AdminPromoCodes = () => {
  const { loading: authLoading } = useAdmin();
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<any>(null);
  const [showDelete, setShowDelete] = useState<any>(null);
  const [showRedemptions, setShowRedemptions] = useState<any>(null);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [form, setForm] = useState({ code: "", plan_type: "player_pro", duration_days: "90", max_uses: "25", expires_at: "" });
  const [editForm, setEditForm] = useState({ max_uses: "", expires_at: "", is_active: true });

  const fetchCodes = async () => {
    const { data } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false });
    setCodes(data || []);
    setLoading(false);
  };

  useEffect(() => { if (!authLoading) fetchCodes(); }, [authLoading]);

  const handleCreate = async () => {
    const code = form.code.trim().toUpperCase();
    if (!code) { toast.error("Code is required"); return; }
    // Check uniqueness
    const existing = codes.find(c => c.code === code);
    if (existing) { toast.error("A promo code with this name already exists"); return; }

    const { error } = await supabase.from("promo_codes").insert({
      code,
      plan_type: form.plan_type,
      duration_days: parseInt(form.duration_days) || 30,
      max_uses: parseInt(form.max_uses) || null,
      expires_at: form.expires_at || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Promo code created");
    setShowCreate(false);
    setForm({ code: "", plan_type: "player_pro", duration_days: "90", max_uses: "25", expires_at: "" });
    fetchCodes();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("promo_codes").update({ is_active: !current }).eq("id", id);
    fetchCodes();
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    await supabase.from("promo_codes").delete().eq("id", showDelete.id);
    toast.success("Promo code deleted");
    setShowDelete(null);
    fetchCodes();
  };

  const openEdit = (c: any) => {
    setEditForm({ max_uses: c.max_uses?.toString() || "", expires_at: c.expires_at ? c.expires_at.split("T")[0] : "", is_active: c.is_active });
    setShowEdit(c);
  };

  const handleSaveEdit = async () => {
    if (!showEdit) return;
    await supabase.from("promo_codes").update({
      max_uses: editForm.max_uses ? parseInt(editForm.max_uses) : null,
      expires_at: editForm.expires_at || null,
      is_active: editForm.is_active,
    }).eq("id", showEdit.id);
    toast.success("Promo code updated");
    setShowEdit(null);
    fetchCodes();
  };

  const viewRedemptions = async (c: any) => {
    setShowRedemptions(c);
    const { data } = await supabase.from("promo_redemptions").select("*, profiles:user_id(full_name)").eq("promo_code_id", c.id).order("redeemed_at", { ascending: false });
    setRedemptions(data || []);
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
                  <th className="p-3 text-muted-foreground font-medium">Expires</th>
                  <th className="p-3 text-muted-foreground font-medium">Active</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {codes.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No promo codes created yet. Create your first one above.</td></tr>
                ) : codes.map((c) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3 font-mono font-bold">{c.code}</td>
                    <td className="p-3 capitalize">{c.plan_type.replace("_", " ")}</td>
                    <td className="p-3">{c.duration_days}d</td>
                    <td className="p-3">{c.times_used}/{c.max_uses || "∞"}</td>
                    <td className="p-3 text-muted-foreground">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "Never"}</td>
                    <td className="p-3">
                      <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c.id, c.is_active)} />
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Copied"); }}>
                          <Copy size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                          <Edit2 size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => viewRedemptions(c)}>
                          <Eye size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setShowDelete(c)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Promo Code</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Code (e.g. SUMMER2025)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="flex-1" />
              <Button variant="outline" size="sm" onClick={() => setForm({ ...form, code: genCode() })}><Shuffle size={14} className="mr-1" />Random</Button>
            </div>
            <Select value={form.plan_type} onValueChange={(v) => setForm({ ...form, plan_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="player_pro">Player Pro</SelectItem>
                <SelectItem value="club">Club</SelectItem>
              </SelectContent>
            </Select>
            <Select value={form.duration_days} onValueChange={(v) => setForm({ ...form, duration_days: v })}>
              <SelectTrigger><SelectValue placeholder="Duration" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="180">180 days</SelectItem>
                <SelectItem value="365">365 days</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Max uses" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} />
            <Input type="date" placeholder="Expiry date (optional)" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!showEdit} onOpenChange={() => setShowEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit: {showEdit?.code}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Code (immutable)</p>
              <Input value={showEdit?.code || ""} disabled className="opacity-50" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Plan (immutable)</p>
              <Input value={showEdit?.plan_type?.replace("_", " ") || ""} disabled className="opacity-50 capitalize" />
            </div>
            <Input type="number" placeholder="Max uses" value={editForm.max_uses} onChange={(e) => setEditForm({ ...editForm, max_uses: e.target.value })} />
            <Input type="date" value={editForm.expires_at} onChange={(e) => setEditForm({ ...editForm, expires_at: e.target.value })} />
            <div className="flex items-center gap-2">
              <Switch checked={editForm.is_active} onCheckedChange={(v) => setEditForm({ ...editForm, is_active: v })} />
              <span className="text-sm">{editForm.is_active ? "Active" : "Inactive"}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!showDelete} onOpenChange={() => setShowDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete promo code {showDelete?.code}?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Users who already redeemed it will keep their Pro access until it expires.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Redemptions dialog */}
      <Dialog open={!!showRedemptions} onOpenChange={() => setShowRedemptions(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Redemptions: {showRedemptions?.code}</DialogTitle></DialogHeader>
          {redemptions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No redemptions yet</p>
          ) : (
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="p-2 text-muted-foreground font-medium">User</th>
                    <th className="p-2 text-muted-foreground font-medium">Redeemed</th>
                    <th className="p-2 text-muted-foreground font-medium">Expires</th>
                    <th className="p-2 text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {redemptions.map((r: any) => (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="p-2">{(r.profiles as any)?.full_name || "—"}</td>
                      <td className="p-2">{new Date(r.redeemed_at).toLocaleDateString()}</td>
                      <td className="p-2">{new Date(r.expires_at).toLocaleDateString()}</td>
                      <td className="p-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${new Date(r.expires_at) > new Date() ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {new Date(r.expires_at) > new Date() ? "Active" : "Expired"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminPromoCodes;
