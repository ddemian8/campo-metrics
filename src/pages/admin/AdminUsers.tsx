import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Search, ChevronLeft, ChevronRight, Trash2, RotateCcw, StickyNote } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 20;

const AdminUsers = () => {
  const { loading: authLoading } = useAdmin();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<any>(null);
  const [editPlan, setEditPlan] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    let query = supabase
      .from("profiles")
      .select("*, player_stats_aggregate(avg_performance_score, trust_score, total_sessions)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (planFilter !== "all") query = query.eq("subscription_plan", planFilter);
    if (search) query = query.or(`full_name.ilike.%${search}%,username.ilike.%${search}%`);

    const { data, count } = await query;
    setUsers(data || []);
    setTotal(count || 0);
    setLoading(false);
  };

  useEffect(() => { if (!authLoading) fetchUsers(); }, [authLoading, page, planFilter, search]);

  const handleSavePlan = async () => {
    if (!selected) return;
    await supabase.from("profiles").update({ subscription_plan: editPlan }).eq("id", selected.id);
    toast.success("Plan updated");
    setSelected(null);
    fetchUsers();
  };

  const handleResetReports = async () => {
    if (!selected) return;
    await supabase.from("profiles").update({ reports_used_this_month: 0 }).eq("id", selected.id);
    toast.success("Reports counter reset");
    setSelected(null);
    fetchUsers();
  };

  const handleSaveNotes = async () => {
    if (!selected) return;
    setSavingNotes(true);
    await supabase.from("profiles").update({ admin_notes: adminNotes } as any).eq("id", selected.id);
    setSavingNotes(false);
    toast.success("Notes saved");
  };

  const handleDeleteUser = async () => {
    if (!selected) return;
    // Delete related data first, then profile
    await supabase.from("reports").delete().eq("player_id", selected.id);
    await supabase.from("sessions").delete().eq("player_id", selected.id);
    await supabase.from("player_stats_aggregate").delete().eq("player_id", selected.id);
    await supabase.from("profiles").delete().eq("id", selected.id);
    toast.success("User deleted successfully");
    setShowDelete(false);
    setSelected(null);
    setDeleteReason("");
    fetchUsers();
  };

  const openUser = (u: any) => {
    setSelected(u);
    setEditPlan(u.subscription_plan);
    setAdminNotes((u as any).admin_notes || "");
  };

  if (authLoading) return <AdminLayout><Loader2 className="animate-spin text-primary mx-auto mt-32" size={32} /></AdminLayout>;

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Users</h1>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search name or username..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
        </div>
        <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(0); }}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="player_pro">Pro</SelectItem>
            <SelectItem value="club">Club</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="p-3 text-muted-foreground font-medium">Name</th>
                  <th className="p-3 text-muted-foreground font-medium">Plan</th>
                  <th className="p-3 text-muted-foreground font-medium">Sessions</th>
                  <th className="p-3 text-muted-foreground font-medium">CPI Avg</th>
                  <th className="p-3 text-muted-foreground font-medium">Trust</th>
                  <th className="p-3 text-muted-foreground font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No users registered yet</td></tr>
                ) : users.map((u) => {
                  const stats = Array.isArray(u.player_stats_aggregate) ? u.player_stats_aggregate[0] : u.player_stats_aggregate;
                  return (
                    <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => openUser(u)}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {u.full_name || "—"}
                          {(u as any).admin_notes && <StickyNote size={12} className="text-yellow-400" />}
                        </div>
                      </td>
                      <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${u.subscription_plan === 'player_pro' ? 'bg-green-500/20 text-green-400' : u.subscription_plan === 'club' ? 'bg-blue-500/20 text-blue-400' : 'bg-muted text-muted-foreground'}`}>{u.subscription_plan}</span></td>
                      <td className="p-3">{stats?.total_sessions || 0}</td>
                      <td className="p-3">{stats?.avg_performance_score ? Number(stats.avg_performance_score).toFixed(1) : "—"}</td>
                      <td className="p-3">{stats?.trust_score || 0}</td>
                      <td className="p-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mt-4">
        <span className="text-sm text-muted-foreground">{total} users total</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></Button>
          <span className="text-sm py-1 px-2">Page {page + 1}</span>
          <Button variant="outline" size="sm" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></Button>
        </div>
      </div>

      {/* User detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selected?.full_name || "User Detail"}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <p><span className="text-muted-foreground">Username:</span> {selected?.username || "—"}</p>
            <p><span className="text-muted-foreground">Position:</span> {selected?.position_specific || selected?.position || "—"}</p>
            <p><span className="text-muted-foreground">Club:</span> {selected?.current_club || "—"}</p>
            <p><span className="text-muted-foreground">Country:</span> {selected?.country || "—"}</p>
            <p><span className="text-muted-foreground">Reports this month:</span> {selected?.reports_used_this_month || 0}</p>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Plan:</span>
              <Select value={editPlan} onValueChange={setEditPlan}>
                <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="player_pro">Pro</SelectItem>
                  <SelectItem value="club">Club</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleSavePlan}>Save</Button>
            </div>

            {/* Admin Notes */}
            <div className="pt-3 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">Admin Notes (internal only)</p>
              <Textarea
                placeholder="Add internal notes about this user..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                className="text-xs"
              />
              <Button size="sm" variant="outline" className="mt-2" onClick={handleSaveNotes} disabled={savingNotes}>
                {savingNotes ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
                Save notes
              </Button>
            </div>
          </div>
          <DialogFooter className="flex gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={handleResetReports}><RotateCcw size={14} className="mr-1" />Reset reports</Button>
            <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}><Trash2 size={14} className="mr-1" />Delete user</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete user account</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete this user's account, all their reports, sessions, and stats. This action cannot be undone.
          </p>
          <Textarea
            placeholder="Reason for deletion (optional)"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDelete(false); setDeleteReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteUser}>Delete permanently</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminUsers;
