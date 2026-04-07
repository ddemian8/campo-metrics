import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimateIn from "./AnimateIn";

const AffiliateBanner = () => (
  <section id="affiliate" className="py-20 md:py-28 bg-secondary/30">
    <div className="container max-w-3xl text-center">
      <AnimateIn>
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Earn money by sharing Campometric</h2>
        <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
          Coaches, trainers and creators earn 20% recurring commission on every subscription they refer. Get your unique code and start earning today.
        </p>
        <Button size="lg">
          Join the affiliate programme <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </AnimateIn>
    </div>
  </section>
);

export default AffiliateBanner;
