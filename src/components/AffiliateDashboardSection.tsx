import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, MousePointerClick, UserPlus, Crown, DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AffiliateData {
  id: string;
  affiliate_code: string;
  affiliate_link: string;
  total_clicks: number;
  total_referrals: number;
  total_conversions: number;
  total_earned: number;
  total_paid: number;
  balance: number;
  commission_rate: number;
}

const AffiliateDashboardSection = ({ profileId }: { profileId: string }) => {
  const [data, setData] = useState<AffiliateData | null>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: aff } = await supabase
        .from("affiliate_profiles")
        .select("*")
        .eq("user_id", profileId)
        .maybeSingle();

      if (aff) {
        setData(aff as any);
        const { data: pays } = await supabase
          .from("affiliate_payouts")
          .select("*")
          .eq("affiliate_id", aff.id)
          .order("requested_at", { ascending: false });
        setPayouts(pays || []);
      }
      setLoading(false);
    };
    load();
  }, [profileId]);

  const requestPayout = async () => {
    if (!data) return;
    setRequesting(true);
    await supabase.from("affiliate_payouts").insert({
      affiliate_id: data.id,
      amount: data.balance,
      payment_method: "revolut",
      status: "pending",
    });
    toast.success("Payout requested!");
    setRequesting(false);
    // Refresh
    const { data: pays } = await supabase.from("affiliate_payouts").select("*").eq("affiliate_id", data.id).order("requested_at", { ascending: false });
    setPayouts(pays || []);
  };

  if (loading) return <Loader2 className="animate-spin text-primary mx-auto" size={24} />;
  if (!data) return null;

  const canRequestPayout = data.total_conversions >= 10 || data.balance >= 20;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Affiliate Program</h2>

      {/* Link & Code */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Your Referral Link</label>
            <div className="flex gap-2 mt-1">
              <Input value={data.affiliate_link} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(data.affiliate_link); toast.success("Copied!"); }}>
                <Copy size={14} />
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Your Referral Code</label>
            <div className="flex gap-2 mt-1">
              <Input value={data.affiliate_code} readOnly className="font-mono" />
              <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(data.affiliate_code); toast.success("Copied!"); }}>
                <Copy size={14} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Clicks", value: data.total_clicks, icon: MousePointerClick },
          { label: "Signups", value: data.total_referrals, icon: UserPlus },
          { label: "Paying", value: data.total_conversions, icon: Crown },
          { label: "Earnings", value: `€${Number(data.total_earned).toFixed(2)}`, icon: DollarSign },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon size={14} className="text-primary" />
            </div>
            <p className="text-lg font-bold">{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Conversion funnel */}
      <Card>
        <CardHeader><CardTitle className="text-base">Conversion Funnel</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center flex-1">
              <p className="text-2xl font-bold">{data.total_clicks}</p>
              <p className="text-xs text-muted-foreground">Clicks</p>
            </div>
            <TrendingUp size={16} className="text-muted-foreground" />
            <div className="text-center flex-1">
              <p className="text-2xl font-bold">{data.total_referrals}</p>
              <p className="text-xs text-muted-foreground">Signups</p>
              <p className="text-xs text-primary">{data.total_clicks > 0 ? ((data.total_referrals / data.total_clicks) * 100).toFixed(1) : 0}%</p>
            </div>
            <TrendingUp size={16} className="text-muted-foreground" />
            <div className="text-center flex-1">
              <p className="text-2xl font-bold">{data.total_conversions}</p>
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="text-xs text-primary">{data.total_referrals > 0 ? ((data.total_conversions / data.total_referrals) * 100).toFixed(1) : 0}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance & Payout */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Available Balance</p>
            <p className="text-2xl font-bold">€{Number(data.balance).toFixed(2)}</p>
          </div>
          <Button
            disabled={!canRequestPayout || requesting}
            onClick={requestPayout}
          >
            {requesting ? <Loader2 className="animate-spin mr-1" size={16} /> : null}
            Request Payout
          </Button>
        </CardContent>
      </Card>

      {/* Payout History */}
      {payouts.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Payout History</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left">
                <th className="p-3 text-muted-foreground font-medium">Amount</th>
                <th className="p-3 text-muted-foreground font-medium">Status</th>
                <th className="p-3 text-muted-foreground font-medium">Date</th>
              </tr></thead>
              <tbody>
                {payouts.map(p => (
                  <tr key={p.id} className="border-b border-border/50">
                    <td className="p-3 font-bold">€{Number(p.amount).toFixed(2)}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{p.status}</span>
                    </td>
                    <td className="p-3 text-muted-foreground">{new Date(p.requested_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AffiliateDashboardSection;
