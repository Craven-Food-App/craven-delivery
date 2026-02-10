import { Facebook, Twitter, Instagram, Smartphone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import cravenLogo from "@/assets/craven-logo.png";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <img src={cravenLogo} alt="Crave'n" className="h-8 mb-2" />
            <p className="text-muted-foreground">
              Your favorite food, delivered fast. We bring the best restaurants right to your doorstep.
            </p>
            
            <div className="flex space-x-3">
              <Button variant="ghost" size="icon" className="hover:bg-background/10">
                <Facebook className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="hover:bg-background/10">
                <Twitter className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="hover:bg-background/10">
                <Instagram className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Company</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link to="/careers" className="hover:text-primary transition-colors">Careers</Link></li>
              <li><Link to="/investors" className="hover:text-primary transition-colors">Investors</Link></li>
              <li><Link to="/restaurants" className="hover:text-primary transition-colors">Restaurants</Link></li>
              <li><Link to="/feeder" className="hover:text-primary transition-colors">Become a Feeder</Link></li>
              <li><Link to="/merchant/signup" className="hover:text-primary transition-colors">Register Restaurant</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Support</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link to="/help" className="hover:text-primary transition-colors">Help Center</Link></li>
              <li><Link to="/safety" className="hover:text-primary transition-colors">Safety</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link to="/partner" className="hover:text-primary transition-colors">Partner with us</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Get in Touch</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-muted-foreground">
                <Smartphone className="h-4 w-4" />
                <span>216-435-0821</span>
              </div>
              <div className="flex items-center space-x-3 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>support@cravenusa.com</span>
              </div>
              <div className="flex items-center space-x-3 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Available in 100+ cities</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-background/20 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-muted text-sm">
            © 2025 Crave'n. All rights reserved.
          </p>
          <div className="flex space-x-6 text-sm text-muted mt-4 md:mt-0">
            <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/terms-of-service" className="hover:text-primary transition-colors">Terms of Service</Link>
            <Link to="/cookie-policy" className="hover:text-primary transition-colors">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;