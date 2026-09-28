import { Upload, Search, BarChart3, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AnimateIn from "./AnimateIn";

const steps = [
  {
    icon: Upload,
    title: "Upload your session",
    desc: "Upload your team's GPS PDF, take a screenshot, or enter your stats manually. We support all major GPS platforms.",
  },
  {
    icon: Search,
    title: "AI finds your data",
    desc: "Our AI automatically identifies your row in the team file, extracts your metrics, and normalises everything to 90 minutes.",
  },
  {
    icon: BarChart3,
    title: "Get your personal report",
    desc: "Receive your instant AI report — personal stats, position ranking, team comparison, MD context and a performance narrative.",
  },
];

const HowItWorks = () => (
  <section id="how-it-works" className="py-20 md:py-28">
    <div className="container">
      <AnimateIn>
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          From GPS file to personal report in{" "}
          <span className="text-primary">90 seconds</span>
        </h2>
      </AnimateIn>
      <div className="grid md:grid-cols-3 gap-8">
        {steps.map((s, i) => (
          <AnimateIn key={i} delay={i * 0.15}>
            <div className="rounded-2xl border border-border bg-card p-8 h-full flex flex-col items-start">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                <s.icon className="h-6 w-6 text-primary" />
              </div>
              <p className="text-xs font-semibold text-primary mb-2">Step {i + 1}</p>
              <h3 className="text-xl font-semibold mb-3">{s.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
            </div>
          </AnimateIn>
        ))}
      </div>
      <AnimateIn className="text-center mt-12">
        <Button size="lg" asChild>
          <Link to="/analyze">Try it now — it's free <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </AnimateIn>
    </div>
  </section>
);

export default HowItWorks;
