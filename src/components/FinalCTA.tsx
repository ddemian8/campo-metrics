import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimateIn from "./AnimateIn";

const FinalCTA = () => (
  <section className="py-24 md:py-32">
    <div className="container max-w-2xl text-center">
      <AnimateIn>
        <h2 className="text-3xl md:text-5xl font-bold mb-6">
          Start building your{" "}
          <span className="text-gradient">performance passport</span> today.
        </h2>
        <p className="text-muted-foreground mb-10 text-lg">
          Free to start. No credit card required. Your GPS data — finally working for you.
        </p>
        <Button size="lg" asChild>
          <Link to="/analyze">
            Start your free analysis <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <p className="mt-6 text-sm text-muted-foreground">
          Join players from Moldova, Romania, and beyond already on Campometric.
        </p>
      </AnimateIn>
    </div>
  </section>
);

export default FinalCTA;
