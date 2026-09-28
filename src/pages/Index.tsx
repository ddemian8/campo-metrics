import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import TrustBar from "@/components/TrustBar";
import HowItWorks from "@/components/HowItWorks";
import ReportPreview from "@/components/ReportPreview";
import Flywheel from "@/components/Flywheel";
import Pricing from "@/components/Pricing";
import Testimonials from "@/components/Testimonials";
import AffiliateBanner from "@/components/AffiliateBanner";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";
import AdminViewAsUserBanner from "@/components/admin/AdminViewAsUserBanner";

const Index = () => {
  const [searchParams] = useSearchParams();
  const isAdminPreview = searchParams.get("admin_preview") === "1";

  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <TrustBar />
      <HowItWorks />
      <ReportPreview />
      <Flywheel />
      <Pricing />
      <Testimonials />
      <AffiliateBanner />
      <FinalCTA />
      <Footer />
      {isAdminPreview && <AdminViewAsUserBanner />}
    </div>
  );
};

export default Index;
