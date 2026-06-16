import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

const SuspensionGuard = () => {
  const [info, setInfo] = useState<{ reason: string | null } | null>(null);

  const check = async (uid: string | undefined) => {
    if (!uid) { setInfo(null); return; }
    const { data } = await supabase
      .from("profiles")
      .select("is_suspended, suspension_reason")
      .eq("id", uid)
      .maybeSingle();
    if (data?.is_suspended) setInfo({ reason: data.suspension_reason });
    else setInfo(null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => check(session?.user?.id));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => check(s?.user?.id));
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setInfo(null);
    window.location.href = "/";
  };

  if (!info) return null;
  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="w-5 h-5" /> Account Suspended
          </DialogTitle>
          <DialogDescription>
            Your account has been suspended and you cannot use Navex Market.
            {info.reason && (<><br /><span className="block mt-2 p-2 rounded bg-muted text-foreground text-sm">Reason: {info.reason}</span></>)}
            <br />Contact support if you believe this is a mistake.
          </DialogDescription>
        </DialogHeader>
        <Button onClick={signOut} variant="destructive" className="w-full">Sign Out</Button>
      </DialogContent>
    </Dialog>
  );
};

export default SuspensionGuard;
