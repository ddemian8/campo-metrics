import { ArrowRight } from "lucide-react";
import AnimateIn from "./AnimateIn";

const steps = [
  "Players add data",
  "AI generates reports",
  "Database grows",
  "Scouts find players",
  "Players get noticed",
];

const Flywheel = () => (
  <section className="py-20 md:py-28">
    <div className="container">
      <AnimateIn>
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          Every session makes the platform{" "}
          <span className="text-primary">more valuable</span>
        </h2>
        <p className="text-center text-muted-foreground mb-14 max-w-2xl mx-auto">
          The more players log sessions, the better the benchmarks — and the more valuable Campometric becomes for everyone.
        </p>
      </AnimateIn>
      <AnimateIn delay={0.15}>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="px-5 py-3 rounded-xl bg-card border border-border text-sm font-medium">{s}</span>
              {i < steps.length - 1 && <ArrowRight className="h-4 w-4 text-primary shrink-0 hidden sm:block" />}
            </div>
          ))}
        </div>
      </AnimateIn>
    </div>
  </section>
);

export default Flywheel;
