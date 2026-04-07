import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";
import AnimateIn from "./AnimateIn";

const plans = [
  {
    name: "Free",
    price: "€0",
    period: "/ month",
    features: ["3 sessions", "Instant PDF report", "No account needed"],
    cta: "Start free",
    href: "/signup",
    popular: false,
  },
  {
    name: "Player Pro",
    price: "€7",
    period: "/ month",
    features: ["Unlimited sessions", "Memory Machine (career history)", "Public profile for scouts", "Leaderboard ranking"],
    cta: "Get Player Pro",
    href: "/signup",
    popular: true,
  },
  {
    name: "Club / Team",
    price: "€49",
    period: "/ month",
    features: ["Up to 30 players", "Automatic team reports", "Period analytics", "CSV export"],
    cta: "Start Club plan",
    href: "/signup",
    popular: false,
  },
  {
    name: "Scout",
    price: "Contact us",
    period: "",
    features: ["Unlimited player search", "Player contact & messaging", "PDF downloads", "Personal shortlists"],
    cta: "Get Scout access",
    href: "/signup",
    popular: false,
  },
];

const Pricing = () => (
  <section id="pricing" className="py-20 md:py-28 bg-secondary/30">
    <div className="container">
      <AnimateIn>
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Simple, transparent pricing</h2>
      </AnimateIn>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((p, i) => (
          <AnimateIn key={p.name} delay={i * 0.1}>
            <div className={`rounded-2xl border p-6 h-full flex flex-col ${p.popular ? "border-primary bg-card glow-blue" : "border-border bg-card"}`}>
              {p.popular && (
                <span className="inline-flex items-center gap-1 self-start text-xs font-semibold text-primary mb-3">
                  <Star className="h-3 w-3 fill-primary" /> Most popular
                </span>
              )}
              <h3 className="text-lg font-bold">{p.name}</h3>
              <p className="mt-2 mb-6">
                <span className="text-3xl font-bold">{p.price}</span>
                <span className="text-sm text-muted-foreground">{p.period}</span>
              </p>
              <ul className="space-y-3 mb-8 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button variant={p.popular ? "default" : "outline"} className="w-full" asChild>
                <Link to={p.href}>{p.cta}</Link>
              </Button>
            </div>
          </AnimateIn>
        ))}
      </div>
      <AnimateIn delay={0.4}>
        <p className="text-center text-sm text-muted-foreground mt-10">
          All plans include SSL security, GDPR compliance, and data you own.
        </p>
      </AnimateIn>
    </div>
  </section>
);

export default Pricing;
