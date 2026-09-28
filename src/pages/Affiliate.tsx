import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AnimateIn from "@/components/AnimateIn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, CheckCircle2, Share2, DollarSign, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CHANNELS = [
  { id: "social_media", label: "Social Media (Instagram, TikTok, Facebook)" },
  { id: "club", label: "Club / Team network" },
  { id: "blog", label: "Blog / Website" },
  { id: "youtube", label: "YouTube" },
  { id: "whatsapp_telegram", label: "WhatsApp / Telegram groups" },
  { id: "agent", label: "Player agent network" },
  { id: "academy", label: "Football academy" },
  { id: "other", label: "Other" },
];

const COUNTRIES = [
  "Romania", "Germany", "United Kingdom", "Spain", "France", "Italy", "Netherlands",
  "Portugal", "Belgium", "Austria", "Switzerland", "Turkey", "Greece", "Poland",
  "Czech Republic", "Croatia", "Serbia", "Bulgaria", "Hungary", "Sweden", "Norway",
  "Denmark", "Finland", "Ireland", "USA", "Canada", "Brazil", "Argentina", "Mexico",
  "Nigeria", "Ghana", "South Africa", "Egypt", "Morocco", "Other"
];

const Affiliate = () => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", country: "",
    promotion_channels: [] as string[],
    social_media_link: "", estimated_reach: "", motivation: "",
    payment_method: "revolut",
    revolut_name: "", revolut_tag_or_iban: "",
    bank_account_name: "", bank_iban: "", bank_swift: "", bank_name: "", bank_address: "",
    terms: false,
  });

  const toggleChannel = (ch: string) => {
    setForm(f => ({
      ...f,
      promotion_channels: f.promotion_channels.includes(ch)
        ? f.promotion_channels.filter(c => c !== ch)
        : [...f.promotion_channels, ch]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.country) { toast.error("Please fill in all required fields"); return; }
    if (!form.terms) { toast.error("Please agree to the terms"); return; }
    if (form.payment_method === "revolut" && (!form.revolut_name || !form.revolut_tag_or_iban)) {
      toast.error("Please fill in your Revolut payment details"); return;
    }
    if (form.payment_method === "bank_transfer" && (!form.bank_account_name || !form.bank_iban || !form.bank_swift || !form.bank_name)) {
      toast.error("Please fill in your bank details"); return;
    }

    setLoading(true);
    const { error } = await supabase.from("affiliate_applications").insert({
      full_name: form.full_name,
      email: form.email,
      phone: form.phone || null,
      country: form.country,
      promotion_channels: form.promotion_channels,
      social_media_link: form.social_media_link || null,
      estimated_reach: form.estimated_reach || null,
      motivation: form.motivation || null,
      payment_method: form.payment_method,
      revolut_name: form.payment_method === "revolut" ? form.revolut_name : null,
      revolut_tag_or_iban: form.payment_method === "revolut" ? form.revolut_tag_or_iban : null,
      bank_account_name: form.payment_method === "bank_transfer" ? form.bank_account_name : null,
      bank_iban: form.payment_method === "bank_transfer" ? form.bank_iban : null,
      bank_swift: form.payment_method === "bank_transfer" ? form.bank_swift : null,
      bank_name: form.payment_method === "bank_transfer" ? form.bank_name : null,
      bank_address: form.payment_method === "bank_transfer" ? form.bank_address : null,
    });

    setLoading(false);
    if (error) { toast.error("Failed to submit. Please try again."); return; }
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="container max-w-3xl text-center">
          <AnimateIn>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Earn money by sharing Campometric</h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Coaches, trainers, agents, and creators earn 20% recurring commission on every subscription they refer.
            </p>
            <Button size="lg" onClick={() => document.getElementById("apply-form")?.scrollIntoView({ behavior: "smooth" })}>
              Apply to become an affiliate <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </AnimateIn>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-secondary/30">
        <div className="container max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: UserPlus, step: "1", title: "Apply", desc: "Fill out a short application. We review within 24-48 hours." },
              { icon: Share2, step: "2", title: "Share", desc: "Get your unique referral link and code. Share with players, clubs, teams." },
              { icon: DollarSign, step: "3", title: "Earn", desc: "Earn 20% of every subscription, every month, for as long as they stay subscribed." },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <s.icon className="text-primary" size={24} />
                </div>
                <h3 className="font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Earnings examples */}
      <section className="py-20">
        <div className="container max-w-3xl">
          <h2 className="text-2xl font-bold text-center mb-8">Earning examples</h2>
          <div className="space-y-4">
            {[
              "Refer 10 Player Pro subscribers → earn €18/month (€216/year)",
              "Refer 5 clubs → earn €59/month (€708/year)",
              "Refer 10 Pro + 3 clubs → earn €53.40/month (€640/year)",
            ].map((e, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border">
                <CheckCircle2 size={18} className="text-primary flex-shrink-0" />
                <span className="text-sm">{e}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who can be */}
      <section className="py-20 bg-secondary/30">
        <div className="container max-w-3xl text-center">
          <h2 className="text-2xl font-bold mb-8">Who can be an affiliate</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {["Coaches & trainers", "Player agents", "Football academies", "Sports influencers", "Current players", "Football enthusiasts"].map(w => (
              <div key={w} className="p-4 rounded-lg bg-card border border-border text-sm">{w}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Application form */}
      <section id="apply-form" className="py-20">
        <div className="container max-w-2xl">
          {submitted ? (
            <div className="text-center py-16">
              <CheckCircle2 size={48} className="text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Application submitted!</h2>
              <p className="text-muted-foreground">You'll hear from us within 24-48 hours at {form.email}.</p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-center mb-8">Apply now</h2>
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* About you */}
                <div>
                  <h3 className="font-bold mb-4">About You</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Full Name *</label>
                      <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Email *</label>
                      <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Phone</label>
                      <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Country *</label>
                      <Select value={form.country} onValueChange={(v) => setForm({ ...form, country: v })}>
                        <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Promotion plan */}
                <div>
                  <h3 className="font-bold mb-4">Your Promotion Plan</h3>
                  <label className="text-sm font-medium mb-2 block">How will you promote Campometric?</label>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {CHANNELS.map(ch => (
                      <label key={ch.id} className="flex items-center gap-2 p-2 rounded border border-border hover:bg-muted/30 cursor-pointer text-sm">
                        <Checkbox checked={form.promotion_channels.includes(ch.id)} onCheckedChange={() => toggleChannel(ch.id)} />
                        {ch.label}
                      </label>
                    ))}
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Main social media link</label>
                      <Input placeholder="https://..." value={form.social_media_link} onChange={(e) => setForm({ ...form, social_media_link: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Estimated reach</label>
                      <Select value={form.estimated_reach} onValueChange={(v) => setForm({ ...form, estimated_reach: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="under_50">Under 50</SelectItem>
                          <SelectItem value="50_200">50-200</SelectItem>
                          <SelectItem value="200_1000">200-1,000</SelectItem>
                          <SelectItem value="over_1000">Over 1,000</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="text-sm font-medium mb-1.5 block">Why do you want to promote Campometric?</label>
                    <Textarea value={form.motivation} onChange={(e) => setForm({ ...form, motivation: e.target.value })} />
                  </div>
                </div>

                {/* Payment */}
                <div>
                  <h3 className="font-bold mb-4">Payment Details</h3>
                  <div className="flex gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={form.payment_method === "revolut"} onChange={() => setForm({ ...form, payment_method: "revolut" })} className="accent-primary" />
                      <span className="text-sm">Revolut</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={form.payment_method === "bank_transfer"} onChange={() => setForm({ ...form, payment_method: "bank_transfer" })} className="accent-primary" />
                      <span className="text-sm">Bank Transfer</span>
                    </label>
                  </div>

                  {form.payment_method === "revolut" ? (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Account holder name *</label>
                        <Input value={form.revolut_name} onChange={(e) => setForm({ ...form, revolut_name: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Revolut tag or IBAN *</label>
                        <Input value={form.revolut_tag_or_iban} onChange={(e) => setForm({ ...form, revolut_tag_or_iban: e.target.value })} />
                      </div>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Account holder name *</label>
                        <Input value={form.bank_account_name} onChange={(e) => setForm({ ...form, bank_account_name: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">IBAN *</label>
                        <Input value={form.bank_iban} onChange={(e) => setForm({ ...form, bank_iban: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">SWIFT/BIC *</label>
                        <Input value={form.bank_swift} onChange={(e) => setForm({ ...form, bank_swift: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Bank name *</label>
                        <Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium mb-1.5 block">Bank address</label>
                        <Input value={form.bank_address} onChange={(e) => setForm({ ...form, bank_address: e.target.value })} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Terms */}
                <label className="flex items-start gap-2 cursor-pointer">
                  <Checkbox checked={form.terms} onCheckedChange={(v) => setForm({ ...form, terms: !!v })} className="mt-0.5" />
                  <span className="text-sm">I have read and agree to the Campometric Affiliate Program Terms</span>
                </label>

                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                  Submit Application <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Affiliate;
