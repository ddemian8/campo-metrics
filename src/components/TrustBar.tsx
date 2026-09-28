import AnimateIn from "./AnimateIn";

const platforms = ["STATSports", "Catapult", "gpexe", "Polar Team Pro", "Statscore"];

const TrustBar = () => (
  <section className="py-12 border-y border-border/50">
    <div className="container">
      <AnimateIn>
        <p className="text-center text-sm text-muted-foreground mb-6">Compatible with all major GPS platforms</p>
        <div className="flex flex-wrap justify-center gap-4">
          {platforms.map((p) => (
            <span key={p} className="px-4 py-2 rounded-full bg-secondary text-sm text-muted-foreground font-medium">
              {p}
            </span>
          ))}
        </div>
      </AnimateIn>
    </div>
  </section>
);

export default TrustBar;
