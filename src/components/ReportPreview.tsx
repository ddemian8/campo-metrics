import AnimateIn from "./AnimateIn";

const metrics = [
  { label: "Total Distance", value: "11.4 km" },
  { label: "Max Speed", value: "31.8 km/h" },
  { label: "Sprint Count", value: "22" },
  { label: "HMLD", value: "1,920 m" },
  { label: "vs Team Avg", value: "+14%", highlight: true },
  { label: "Position Rank", value: "Top 12%", highlight: true },
];

const ReportPreview = () => (
  <section id="sample-report" className="py-20 md:py-28 bg-secondary/30">
    <div className="container max-w-3xl">
      <AnimateIn>
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">What your report looks like</h2>
      </AnimateIn>
      <AnimateIn delay={0.15}>
        <div className="rounded-2xl border border-border bg-card p-8 glow-blue">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold">Alex Moraru</h3>
              <p className="text-sm text-muted-foreground">Midfielder · FC Example · Liga 1</p>
              <p className="text-xs text-muted-foreground mt-1">Match · MD0 · vs Opponent FC</p>
            </div>
            <div className="h-20 w-20 rounded-full bg-success/15 flex flex-col items-center justify-center shrink-0">
              <span className="text-3xl font-bold text-success">89</span>
              <span className="text-[10px] text-success/80">Score</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {metrics.map((m) => (
              <div key={m.label} className="rounded-lg bg-secondary p-3">
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className={`text-lg font-semibold ${m.highlight ? "text-success" : "text-foreground"}`}>{m.value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-secondary p-4">
            <p className="text-xs text-primary font-semibold mb-2">AI Narrative</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              "Strong high-intensity output in the second half. Your sprint count places you in the top 12% of midfielders this matchday. Recovery load suggests MD+1 should remain light."
            </p>
          </div>
        </div>
      </AnimateIn>
      <AnimateIn delay={0.3}>
        <p className="text-center text-sm text-muted-foreground mt-8">
          Save your report · Share with your agent · Build your career history
        </p>
      </AnimateIn>
    </div>
  </section>
);

export default ReportPreview;
