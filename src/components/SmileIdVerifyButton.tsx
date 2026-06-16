import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  userId: string;
  status?: string | null;
  onStarted?: () => void;
}

const SmileIdVerifyButton = ({ status, onStarted }: Props) => {
  const [loading, setLoading] = useState(false);

  const start = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("smile-id-create-session");
      if (error) throw error;
      const response = data as { error?: string; message?: string; link?: string };
      if (response?.error) {
        toast.error(response.message || response.error);
        return;
      }
      const link = response?.link;
      if (!link) {
        toast.error("No verification link returned");
        return;
      }
      onStarted?.();
      window.open(link, "_blank", "noopener,noreferrer");
      toast.success("Verification opened in new tab. Come back when done.");
    } catch (e: unknown) {
      const error = e as Error;
      toast.error(error?.message || "Could not start Smile ID verification");
    } finally {
      setLoading(false);
    }
  };

  if (status === "verified") return null;

  return (
    <Button onClick={start} disabled={loading} variant="outline" className="w-full">
      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
      {status === "pending" ? "Resume Smile ID Verification" : "Verify Identity with Smile ID"}
    </Button>
  );
};

export default SmileIdVerifyButton;
