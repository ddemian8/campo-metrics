import AnimateIn from "./AnimateIn";

const testimonials = [
  {
    initials: "DM",
    name: "David M.",
    role: "Professional Player",
    text: "Finally a tool that turns my GPS data into something I can actually share with my agent. The AI report is genuinely impressive.",
  },
  {
    initials: "RC",
    name: "Radu C.",
    role: "Head Coach, FC Example",
    text: "We upload our STATSports file after every session and the team dashboard is ready in seconds. It's changed how we do recovery planning.",
  },
  {
    initials: "JS",
    name: "James S.",
    role: "Football Scout, UK",
    text: "The search filters are exactly what I needed. I can find players by physical profile across leagues I'd never watch live.",
  },
];

const Testimonials = () => (
  <section className="py-20 md:py-28">
    <div className="container">
      <AnimateIn>
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">What players and coaches are saying</h2>
      </AnimateIn>
      <div className="grid md:grid-cols-3 gap-6">
        {testimonials.map((t, i) => (
          <AnimateIn key={t.initials} delay={i * 0.12}>
            <div className="rounded-2xl border border-border bg-card p-6 h-full flex flex-col">
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">"{t.text}"</p>
              <div className="flex items-center gap-3 mt-6">
                <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary">
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          </AnimateIn>
        ))}
      </div>
    </div>
  </section>
);

export default Testimonials;
