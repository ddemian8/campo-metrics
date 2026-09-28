import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Check, X, Copy, DollarSign, Download } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const AdminAffiliates = () => {
  const { loading: authLoading } = useAdmin();
  const [applications, setApplications] = useState<any[]>([]);
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<any>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutRef, setPayoutRef] = useState("");
  const [showPayout, setShowPayout] = useState(false);

  const fetchAll = async () => {
    const [appRes, affRes, payRes] = await Promise.all([
      supabase.from("affiliate_applications").select("*").order("created_at", { ascending: false }),
      supabase.from("affiliate_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("affiliate_payouts").select("*, affiliate_profiles(affiliate_code)").order("requested_at", { ascending: false }),
    ]);
    setApplications(appRes.data || []);
    setAffiliates(affRes.data || []);
    setPayouts(payRes.data || []);
    setLoading(false);
  };

  useEffect(() => { if (!authLoading) fetchAll(); }, [authLoading]);

  const approveApp = async (app: any) => {
    const code = app.full_name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Math.random().toString(36).slice(2, 6);
    const link = `https://www.campometric.com/signup?ref=${code}`;

    // Check if user already exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .ilike("full_name", app.full_name)
      .limit(1)
      .maybeSingle();

    const paymentDetails = app.payment_method === "revolut"
      ? { revolut_name: app.revolut_name, revolut_tag_or_iban: app.revolut_tag_or_iban }
      : { bank_account_name: app.bank_account_name, bank_iban: app.bank_iban, bank_swift: app.bank_swift, bank_name: app.bank_name };

    await supabase.from("affiliate_profiles").insert({
      user_id: existingProfile?.id || null,
      application_id: app.id,
      affiliate_code: code,
      affiliate_link: link,
      payment_method: app.payment_method,
      payment_details: paymentDetails,
    });

    await supabase.from("affiliate_applications").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", app.id);
    toast.success("Approved! Affiliate profile created.");
    setSelectedApp(null);
    fetchAll();
  };

  const rejectApp = async () => {
    if (!selectedApp) return;
    await supabase.from("affiliate_applications").update({
      status: "rejected",
      rejection_reason: rejectReason,
      reviewed_at: new Date().toISOString(),
    }).eq("id", selectedApp.id);
    toast.success("Application rejected");
    setShowReject(false);
    setSelectedApp(null);
    fetchAll();
  };

  const markPaid = async (payout: any) => {
    await supabase.from("affiliate_payouts").update({
      status: "completed",
      completed_at: new Date().toISOString(),
    }).eq("id", payout.id);

    // Deduct from affiliate balance
    const aff = affiliates.find(a => a.id === payout.affiliate_id);
    if (aff) {
      await supabase.from("affiliate_profiles").update({
        balance: Math.max(0, (aff.balance || 0) - payout.amount),
        total_paid: (aff.total_paid || 0) + payout.amount,
      }).eq("id", aff.id);
    }
    toast.success("Marked as paid");
    fetchAll();
  };

  const createPayout = async () => {
    if (!selectedAffiliate || !payoutAmount) return;
    await supabase.from("affiliate_payouts").insert({
      affiliate_id: selectedAffiliate.id,
      amount: parseFloat(payoutAmount),
      payment_method: selectedAffiliate.payment_method,
      payment_reference: payoutRef,
      status: "completed",
      completed_at: new Date().toISOString(),
    });
    await supabase.from("affiliate_profiles").update({
      balance: Math.max(0, (selectedAffiliate.balance || 0) - parseFloat(payoutAmount)),
      total_paid: (selectedAffiliate.total_paid || 0) + parseFloat(payoutAmount),
    }).eq("id", selectedAffiliate.id);
    toast.success("Payout recorded");
    setShowPayout(false);
    fetchAll();
  };

  if (authLoading || loading) return <AdminLayout><Loader2 className="animate-spin text-primary mx-auto mt-32" size={32} /></AdminLayout>;

  const totalStats = {
    affiliates: affiliates.length,
    clicks: affiliates.reduce((s, a) => s + (a.total_clicks || 0), 0),
    referrals: affiliates.reduce((s, a) => s + (a.total_referrals || 0), 0),
    conversions: affiliates.reduce((s, a) => s + (a.total_conversions || 0), 0),
    earned: affiliates.reduce((s, a) => s + Number(a.total_earned || 0), 0),
    paid: affiliates.reduce((s, a) => s + Number(a.total_paid || 0), 0),
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Affiliates</h1>

      <Tabs defaultValue="applications">
        <TabsList className="mb-4">
          <TabsTrigger value="applications">Applications ({applications.filter(a => a.status === "pending").length})</TabsTrigger>
          <TabsTrigger value="active">Active ({affiliates.length})</TabsTrigger>
          <TabsTrigger value="payouts">Payouts ({payouts.filter(p => p.status === "pending").length})</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="applications">
          <Card><CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left">
                <th className="p-3 text-muted-foreground font-medium">Name</th>
                <th className="p-3 text-muted-foreground font-medium">Email</th>
                <th className="p-3 text-muted-foreground font-medium">Country</th>
                <th className="p-3 text-muted-foreground font-medium">Reach</th>
                <th className="p-3 text-muted-foreground font-medium">Status</th>
                <th className="p-3"></th>
              </tr></thead>
              <tbody>
                {applications.map(a => (
                  <tr key={a.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedApp(a)}>
                    <td className="p-3">{a.full_name}</td>
                    <td className="p-3 text-muted-foreground">{a.email}</td>
                    <td className="p-3">{a.country}</td>
                    <td className="p-3">{a.estimated_reach?.replace("_", "-")}</td>
                    <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${a.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : a.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{a.status}</span></td>
                    <td className="p-3">{a.status === 'pending' && <div className="flex gap-1"><Button size="icon" variant="ghost" className="h-7 w-7 text-green-400" onClick={(e) => { e.stopPropagation(); approveApp(a); }}><Check size={14} /></Button><Button size="icon" variant="ghost" className="h-7 w-7 text-red-400" onClick={(e) => { e.stopPropagation(); setSelectedApp(a); setShowReject(true); }}><X size={14} /></Button></div>}</td>
                  </tr>
                ))}
                {applications.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No applications yet</td></tr>}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="active">
          <Card><CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left">
                <th className="p-3 text-muted-foreground font-medium">Code</th>
                <th className="p-3 text-muted-foreground font-medium">Clicks</th>
                <th className="p-3 text-muted-foreground font-medium">Referrals</th>
                <th className="p-3 text-muted-foreground font-medium">Conversions</th>
                <th className="p-3 text-muted-foreground font-medium">Earned</th>
                <th className="p-3 text-muted-foreground font-medium">Balance</th>
                <th className="p-3"></th>
              </tr></thead>
              <tbody>
                {affiliates.map(a => (
                  <tr key={a.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3 font-mono">{a.affiliate_code}</td>
                    <td className="p-3">{a.total_clicks}</td>
                    <td className="p-3">{a.total_referrals}</td>
                    <td className="p-3">{a.total_conversions}</td>
                    <td className="p-3">€{Number(a.total_earned).toFixed(2)}</td>
                    <td className="p-3 font-bold">€{Number(a.balance).toFixed(2)}</td>
                    <td className="p-3">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedAffiliate(a); setPayoutAmount(String(a.balance)); setShowPayout(true); }}>
                        <DollarSign size={14} className="mr-1" />Payout
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="payouts">
          <Card><CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left">
                <th className="p-3 text-muted-foreground font-medium">Affiliate</th>
                <th className="p-3 text-muted-foreground font-medium">Amount</th>
                <th className="p-3 text-muted-foreground font-medium">Method</th>
                <th className="p-3 text-muted-foreground font-medium">Status</th>
                <th className="p-3 text-muted-foreground font-medium">Date</th>
                <th className="p-3"></th>
              </tr></thead>
              <tbody>
                {payouts.map(p => (
                  <tr key={p.id} className="border-b border-border/50">
                    <td className="p-3">{(p.affiliate_profiles as any)?.affiliate_code || "—"}</td>
                    <td className="p-3 font-bold">€{Number(p.amount).toFixed(2)}</td>
                    <td className="p-3">{p.payment_method}</td>
                    <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{p.status}</span></td>
                    <td className="p-3 text-muted-foreground">{new Date(p.requested_at).toLocaleDateString()}</td>
                    <td className="p-3">{p.status === "pending" && <Button size="sm" onClick={() => markPaid(p)}>Mark Paid</Button>}</td>
                  </tr>
                ))}
                {payouts.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No payouts yet</td></tr>}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="stats">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { l: "Total Affiliates", v: totalStats.affiliates },
              { l: "Total Clicks", v: totalStats.clicks },
              { l: "Total Referrals", v: totalStats.referrals },
              { l: "Total Conversions", v: totalStats.conversions },
              { l: "Total Earned", v: `€${totalStats.earned.toFixed(2)}` },
              { l: "Total Paid", v: `€${totalStats.paid.toFixed(2)}` },
            ].map(s => (
              <Card key={s.l}><CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{s.l}</p>
                <p className="text-2xl font-bold mt-1">{s.v}</p>
              </CardContent></Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Application detail */}
      <Dialog open={!!selectedApp && !showReject} onOpenChange={() => setSelectedApp(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Application: {selectedApp?.full_name}</DialogTitle></DialogHeader>
          {selectedApp && (
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Email:</span> {selectedApp.email}</p>
              <p><span className="text-muted-foreground">Phone:</span> {selectedApp.phone || "—"}</p>
              <p><span className="text-muted-foreground">Country:</span> {selectedApp.country}</p>
              <p><span className="text-muted-foreground">Channels:</span> {selectedApp.promotion_channels?.join(", ") || "—"}</p>
              <p><span className="text-muted-foreground">Reach:</span> {selectedApp.estimated_reach}</p>
              <p><span className="text-muted-foreground">Social:</span> {selectedApp.social_media_link || "—"}</p>
              <p><span className="text-muted-foreground">Motivation:</span> {selectedApp.motivation || "—"}</p>
              <p><span className="text-muted-foreground">Payment:</span> {selectedApp.payment_method}</p>
            </div>
          )}
          {selectedApp?.status === "pending" && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReject(true)}>Reject</Button>
              <Button onClick={() => approveApp(selectedApp)}>Approve</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject modal */}
      <Dialog open={showReject} onOpenChange={setShowReject}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Application</DialogTitle></DialogHeader>
          <Textarea placeholder="Reason (optional)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReject(false)}>Cancel</Button>
            <Button variant="destructive" onClick={rejectApp}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payout modal */}
      <Dialog open={showPayout} onOpenChange={setShowPayout}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Payout</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Balance: €{Number(selectedAffiliate?.balance || 0).toFixed(2)}</p>
            <Input type="number" placeholder="Amount" value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} />
            <Input placeholder="Payment reference" value={payoutRef} onChange={(e) => setPayoutRef(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayout(false)}>Cancel</Button>
            <Button onClick={createPayout}>Mark as Paid</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminAffiliates;
