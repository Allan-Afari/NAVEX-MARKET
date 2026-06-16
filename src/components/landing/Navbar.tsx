import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import NotificationBell from "@/components/NotificationBell";
import OpportunityAlert from "@/components/OpportunityAlert";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      {userId && <OpportunityAlert userId={userId} />}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-gradient">
          Navex Market
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          <Link to="/marketplace" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Opportunities
          </Link>
          <Link to="/deal-rooms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Deal Rooms
          </Link>
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <Link to="/reputation" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Reputation
          </Link>
          <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </Link>
          {userId ? (
            <>
              <NotificationBell userId={userId} />
              <Link to="/profile" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Profile
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Log In
              </Link>
              <Button asChild size="sm" className="gradient-primary text-primary-foreground hover:opacity-90">
                <Link to="/signup">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <div className="md:hidden flex items-center gap-3">
          {userId && <NotificationBell userId={userId} />}
          <button className="text-foreground" onClick={() => setOpen(!open)}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden glass border-t border-border px-4 py-4 space-y-3">
          <Link to="/marketplace" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>Opportunities</Link>
          <Link to="/deal-rooms" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>Deal Rooms</Link>
          <Link to="/dashboard" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>Dashboard</Link>
          <Link to="/reputation" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>Reputation</Link>
          <Link to="/pricing" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>Pricing</Link>
          {userId ? (
            <Link to="/profile" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>Profile</Link>
          ) : (
            <>
              <Link to="/login" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>Log In</Link>
              <Button asChild size="sm" className="w-full gradient-primary text-primary-foreground">
                <Link to="/signup" onClick={() => setOpen(false)}>Get Started</Link>
              </Button>
            </>
          )}
        </div>
      )}
    </nav>
    </>
  );
};

export default Navbar;
