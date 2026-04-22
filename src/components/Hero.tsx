import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import AnimateIn from "./AnimateIn";
import { supabase } from "@/integrations/supabase/client";

const metrics = [
  { label: "Distance", value: "11.2 km" },
  { label: "Max Speed", value: "32.4 km/h" },
  { label: "Sprints", value: "24" },
  { label: "HMLD", value: "1,840 m" },
];

const Hero = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsLoggedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleCta = async () => {
    if (!isLoggedIn) {
      navigate("/club/signup");
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/club/signup"); return; }
    const { data: prof } = await supabase
      .from("profiles").select("id").eq("user_id", session.user.id).maybeSingle();
    if (!prof) { navigate("/club/signup"); return; }
    const { data: club } = await supabase
      .from("clubs").select("id").eq("admin_id", prof.id).maybeSingle();
    navigate(club ? "/club/dashboard" : "/club/signup");
  };

  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <AnimateIn>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
              GPS Performance Analytics{" "}
              <span className="text-gradient">for Your Team</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
              Upload your team's GPS session file and get an instant AI-powered personal performance report — in under 90 seconds.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button size="lg" onClick={handleCta}>
                Start Free Trial — 30 Days Free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#sample-report">See a sample report</a>
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              No credit card required · 30-day free trial · Works with STATSports, Catapult & more
            </p>
          </AnimateIn>

          <AnimateIn delay={0.2} className="flex justify-center">
            <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 glow-blue">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs text-muted-foreground">Match Report</p>
                  <p className="font-semibold text-foreground">João Silva</p>
                  <p className="text-xs text-muted-foreground">CM · FC Demo</p>
                </div>
                <div className="h-16 w-16 rounded-full bg-success/15 flex items-center justify-center">
                  <span className="text-2xl font-bold text-success">87</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {metrics.map((m) => (
                  <div key={m.label} className="rounded-lg bg-secondary p-3">
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                    <p className="text-lg font-semibold text-foreground">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </AnimateIn>
        </div>
      </div>
    </section>
  );
};

export default Hero;
