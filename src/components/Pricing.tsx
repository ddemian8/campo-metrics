import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";
import AnimateIn from "./AnimateIn";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const plans = [
  {
    name: "Free",
    price: "€0",
    period: "/ month",
    badge: null,
    cta: "Start free — no account needed",
    href: "/analyze",
    popular: false,
    features: [
      "3 reports per month",
      "Instant PDF report download",
      "No account required to start",
      "Works with PDF upload, screenshot or manual entry",
      "Report expires after 7 days if not saved",
    ],
    extraNote: null,
  },
  {
    name: "Player Pro",
    price: "€9",
    period: "/ month",
    badge: "First month 50% off — €4.50",
    cta: "Get Player Pro",
    href: "/signup?plan=pro",
    popular: true,
    features: [
      "Up to 30 reports per month",
      "Maximum 2 reports per day",
      "Need more? Buy extra report credits anytime",
      "Leaderboard ranking — compare with players globally",
      "Memory Machine — all your data saved to your profile",
      "Export your profile as a PDF performance CV",
      "Your stats visible to scouts browsing Campometric",
      "Full session history and career timeline",
    ],
    extraNote: "Extra reports: €0.50 per report credit, minimum purchase 10 credits (€5)",
  },
  {
    name: "Pro Unlimited + Team",
    price: "€59",
    period: "/ month",
    badge: "Full access · Teams & analysts",
    cta: "Get Unlimited access",
    href: "/signup?plan=unlimited",
    popular: false,
    features: [
      "Unlimited reports — no daily or monthly cap",
      "Perfect for individual players who analyse every session",
      "Full team access — ideal for coaches and clubs",
      "Automatic report delivery to each player by email after upload",
      "Team dashboard with all player reports in one place",
      "Data analyst access — export raw CSV data for all players",
      "Automate report sending to players, coaching staff or analysts",
      "All Player Pro features included",
      "Priority support",
    ],
    extraNote: null,
  },
];

const faqs = [
  {
    q: "What counts as one report?",
    a: "Each GPS session you analyse counts as one report — whether you upload a PDF, send a screenshot or enter data manually.",
  },
  {
    q: "What are extra report credits?",
    a: "On the Player Pro plan, if you use all 30 monthly reports, you can buy extra credits at €0.50 each (minimum 10 = €5). Credits never expire.",
  },
  {
    q: "Can I switch plans anytime?",
    a: "Yes — upgrade or downgrade at any moment from your account settings. Changes take effect at the start of the next billing cycle.",
  },
];

const Pricing = () => (
  <section id="pricing" className="py-20 md:py-28 bg-secondary/30">
    <div className="container">
      <AnimateIn>
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          Simple, transparent pricing
        </h2>
      </AnimateIn>
      <div className="grid sm:grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((p, i) => (
          <AnimateIn key={p.name} delay={i * 0.1}>
            <div className="relative">
              {p.popular && (
                <div className="flex justify-center mb-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-500/20 text-amber-400 px-3.5 py-1 rounded-full">
                    <Star className="h-3 w-3 fill-amber-400" /> Most popular
                  </span>
                </div>
              )}
              {p.badge && !p.popular && (
                <div className="flex justify-center mb-2">
                  <span className="text-[11px] font-semibold text-muted-foreground bg-muted/40 px-3.5 py-1 rounded-full">
                    {p.badge}
                  </span>
                </div>
              )}
              <div
                className={`rounded-2xl p-6 h-full flex flex-col bg-card ${
                  p.popular
                    ? "border-2 border-primary glow-blue"
                    : "border border-border/50"
                }`}
              >
                {p.popular && p.badge && (
                  <span className="inline-flex self-start text-[10px] font-semibold bg-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full mb-3">
                    {p.badge}
                  </span>
                )}
                <h3 className="text-lg font-bold">{p.name}</h3>
                <p className="mt-2 mb-6">
                  <span className="text-3xl font-bold">{p.price}</span>
                  <span className="text-sm text-muted-foreground">{p.period}</span>
                </p>
                <ul className="space-y-3 mb-8 flex-1">
                  {p.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <Check className="h-4 w-4 text-[hsl(var(--success))] mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {p.extraNote && (
                  <p className="text-[11px] text-muted-foreground mb-4 border-t border-border/30 pt-3">
                    {p.extraNote}
                  </p>
                )}
                <Button
                  variant={p.popular ? "default" : "outline"}
                  className="w-full"
                  asChild
                >
                  <Link to={p.href}>{p.cta}</Link>
                </Button>
              </div>
            </div>
          </AnimateIn>
        ))}
      </div>

      <AnimateIn delay={0.3}>
        <p className="text-center text-[12px] text-muted-foreground mt-10">
          All plans include HTTPS encryption, GDPR compliance, and data that
          belongs to you. Cancel anytime.
        </p>
      </AnimateIn>

      <AnimateIn delay={0.4}>
        <div className="max-w-2xl mx-auto mt-12">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-border/40">
                <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </AnimateIn>
    </div>
  </section>
);

export default Pricing;
