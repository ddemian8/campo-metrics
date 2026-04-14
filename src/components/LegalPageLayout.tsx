import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

const LegalPageLayout = ({ title, lastUpdated, children }: LegalPageLayoutProps) => (
  <div className="min-h-screen">
    <Navbar />
    <main className="pt-28 pb-20">
      <div className="container max-w-[800px] mx-auto px-4">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: {lastUpdated}</p>
        <div className="prose-legal space-y-8 text-[15px] leading-relaxed text-muted-foreground [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1.5 [&_p]:mb-3 [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline [&_a:hover]:text-primary/80">
          {children}
        </div>
        <div className="mt-16 pt-8 border-t border-border">
          <Link to="/" className="text-sm text-primary hover:underline">← Back to homepage</Link>
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

export default LegalPageLayout;
