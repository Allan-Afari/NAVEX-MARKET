import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the code from URL params
        const code = searchParams.get("code");
        const error = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        if (error) {
          toast.error(errorDescription || "Authentication failed");
          navigate("/login");
          return;
        }

        if (!code) {
          toast.error("No authentication code provided");
          navigate("/login");
          return;
        }

        // Exchange code for session
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error("Email confirmation error:", exchangeError);
          toast.error(exchangeError.message || "Failed to confirm email. The link may have expired.");
          navigate("/login");
          return;
        }

        if (data.session) {
          toast.success("Email confirmed successfully!");
          navigate("/dashboard");
        } else {
          toast.error("No session created. Please try logging in.");
          navigate("/login");
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        toast.error("Something went wrong during authentication");
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <SEOHead 
        title="Confirming Email" 
        description="Please wait while we confirm your email address..." 
      />
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Confirming Your Email</h1>
        <p className="text-muted-foreground">
          {loading ? "Please wait while we confirm your email address..." : "Redirecting..."}
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
