import { Link } from "react-router-dom";
import logo from "@/assets/logo.svg";

const columns = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Pricing", href: "#pricing" },
      { label: "Sample Report", href: "#sample-report" },
      { label: "Leaderboard", href: "#" },
    ],
  },
  {
    title: "For",
    links: [
      { label: "Players", href: "#" },
      { label: "Clubs & Coaches", href: "#" },
      { label: "Scouts", href: "#" },
      { label: "Affiliates", href: "#affiliate" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Refund Policy", href: "/refund" },
    ],
  },
];

const Footer = () => (
  <footer className="border-t border-border py-16">
    <div className="container">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2 md:col-span-1">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="Campometric" className="h-[54px]" />
          </Link>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="text-sm font-semibold mb-4">{col.title}</p>
            <ul className="space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-xs text-muted-foreground">© 2025 Campometric. All rights reserved.</p>
        <div className="flex gap-4">
          {["Twitter/X", "Instagram", "LinkedIn"].map((s) => (
            <a key={s} href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{s}</a>
          ))}
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
