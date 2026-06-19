import { Facebook, Twitter, Instagram, Apple, Play } from "lucide-react";
import cravenLogo from "@/assets/craven-logo.png";
import { Link } from "react-router-dom";

type FooterLink = { label: string; to: string };

const columns: { title: string; links: FooterLink[] }[] = [
  {
    title: "Get to Know Us",
    links: [
      { label: "About Us", to: "/about" },
      { label: "Careers", to: "/careers" },
      { label: "Investors", to: "/investors" },
      { label: "Company Blog", to: "/blog" },
      { label: "Newsroom", to: "/newsroom" },
      { label: "Gift Cards", to: "/gift-cards" },
      { label: "Promotions", to: "/promotions" },
      { label: "Accessibility", to: "/accessibility" },
    ],
  },
  {
    title: "Let Us Help You",
    links: [
      { label: "Help Center", to: "/help" },
      { label: "Account Details", to: "/account" },
      { label: "Order History", to: "/orders" },
      { label: "Safety", to: "/safety" },
      { label: "Contact Us", to: "/contact" },
    ],
  },
  {
    title: "Doing Business",
    links: [
      { label: "Become a Feeder", to: "/feeder" },
      { label: "Crave'n for Merchants", to: "/merchant/signup" },
      { label: "Crave'N Express (Courier Co.)", to: "/merchant/signup?type=courier" },
      { label: "Find a Courier (CX)", to: "/cx" },
      { label: "Get Feeders for Deliveries", to: "/business/feeders" },
      { label: "Crave'n for Business", to: "/business" },
      { label: "Partner with Us", to: "/partner" },
    ],
  },
];

const Footer = () => {
  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-12">
        {/* Top: link columns + app store badges */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-9 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {columns.map((col) => (
              <div key={col.title} className="space-y-3">
                <h4 className="text-sm font-semibold text-background">{col.title}</h4>
                <ul className="space-y-2 text-sm text-background/70">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="hover:text-primary transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* App store badges */}
          <div className="md:col-span-3 flex md:flex-col items-start gap-3 md:items-end">
            <a
              href="#"
              className="inline-flex items-center gap-2 bg-background/10 hover:bg-background/15 transition-colors border border-background/15 rounded-lg px-4 py-2.5 min-w-[160px]"
              aria-label="Download on the App Store"
            >
              <Apple className="h-6 w-6 text-background" />
              <div className="leading-tight">
                <div className="text-[10px] uppercase tracking-wide text-background/70">
                  Download on the
                </div>
                <div className="text-sm font-semibold text-background">App Store</div>
              </div>
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-2 bg-background/10 hover:bg-background/15 transition-colors border border-background/15 rounded-lg px-4 py-2.5 min-w-[160px]"
              aria-label="Get it on Google Play"
            >
              <Play className="h-6 w-6 text-background" />
              <div className="leading-tight">
                <div className="text-[10px] uppercase tracking-wide text-background/70">
                  Get it on
                </div>
                <div className="text-sm font-semibold text-background">Google Play</div>
              </div>
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-background/15 mt-10 pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-background/70">
            <img src={cravenLogo} alt="Crave'n" className="h-6 w-auto" />
            <Link to="/terms-of-service" className="hover:text-primary transition-colors">
              Terms of Service
            </Link>
            <Link to="/privacy-policy" className="hover:text-primary transition-colors">
              Privacy
            </Link>
            <Link to="/cookie-policy" className="hover:text-primary transition-colors">
              Cookie Policy
            </Link>
            <Link to="/locations" className="hover:text-primary transition-colors">
              Delivery Locations
            </Link>
            <span>© {new Date().getFullYear()} Crave'n</span>
          </div>

          <div className="flex items-center gap-4 text-background/70">
            <a href="#" aria-label="Facebook" className="hover:text-primary transition-colors">
              <Facebook className="h-4 w-4" />
            </a>
            <a href="#" aria-label="Twitter" className="hover:text-primary transition-colors">
              <Twitter className="h-4 w-4" />
            </a>
            <a href="#" aria-label="Instagram" className="hover:text-primary transition-colors">
              <Instagram className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;