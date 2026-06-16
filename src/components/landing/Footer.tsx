import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border py-12 bg-background">
      <div className="container px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="text-lg font-bold text-gradient mb-3">Navex Market</div>
            <p className="text-sm text-muted-foreground">The infrastructure that makes funding work safely and successfully.</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Platform</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <Link to="/marketplace" className="block hover:text-foreground transition-colors">Marketplace</Link>
              <Link to="/pricing" className="block hover:text-foreground transition-colors">Pricing</Link>
              <Link to="/dashboard" className="block hover:text-foreground transition-colors">Dashboard</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Resources</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <span className="block">Help Center</span>
              <span className="block">Documentation</span>
              <Link to="/contact" className="block hover:text-foreground transition-colors">Contact</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Legal</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <Link to="/privacy" className="block hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="block hover:text-foreground transition-colors">Terms of Service</Link>
              <span className="block">Cookie Policy</span>
            </div>
          </div>
        </div>
        <div className="border-t border-border mt-8 pt-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Navex Market. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
