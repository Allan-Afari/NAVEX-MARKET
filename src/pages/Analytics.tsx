import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import SEOHead from "@/components/SEOHead";
import MarketIntelligence from "@/components/MarketIntelligence";
import DealRoomAnalytics from "@/components/DealRoomAnalytics";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const Analytics = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/login");
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/login");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Market Intelligence"
        description="Market analytics, industry insights, and investment intelligence for Navex Market"
      />
      <Navbar />
      <div className="container px-4 pt-24 pb-12">
        <div className="flex items-center gap-3 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Market Intelligence</h1>
            <p className="text-muted-foreground text-sm">
              Real-time analytics and strategic market insights
            </p>
          </div>
        </div>

        <MarketIntelligence />
        <div className="mt-8">
          <DealRoomAnalytics />
        </div>
      </div>
    </div>
  );
};

export default Analytics;
