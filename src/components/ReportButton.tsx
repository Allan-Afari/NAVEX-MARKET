import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Flag } from "lucide-react";
import { toast } from "sonner";

interface ReportButtonProps {
  opportunityId: string;
  reporterId: string;
}

const REASONS = [
  "Spam or misleading",
  "Scam or fraud",
  "Inappropriate content",
  "Duplicate listing",
  "Other",
];

const ReportButton = ({ opportunityId, reporterId }: ReportButtonProps) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    const { error } = await supabase.from("reports").insert({
      opportunity_id: opportunityId,
      reporter_id: reporterId,
      reason,
      details: details.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") {
        toast.error("You've already reported this opportunity");
      } else {
        toast.error("Failed to submit report");
      }
      return;
    }
    toast.success("Report submitted — thank you for keeping Navex safe");
    setOpen(false);
    setDetails("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-destructive">
          <Flag className="w-3.5 h-3.5 mr-1.5" /> Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this opportunity</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Reason</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-md bg-muted/50 border border-border px-3 py-2 text-sm">
              {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Details (optional)</label>
            <Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Anything an admin should know..." className="bg-muted/50" rows={3} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" className="gradient-primary text-primary-foreground" onClick={submit} disabled={submitting}>
              <Flag className="w-3.5 h-3.5 mr-1.5" /> {submitting ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportButton;
