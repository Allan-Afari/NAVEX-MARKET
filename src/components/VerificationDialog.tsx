import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface Props {
  userId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmitted?: () => void;
}

const DOC_TYPES = [
  { value: "national_id", label: "National ID" },
  { value: "passport", label: "Passport" },
  { value: "drivers_license", label: "Driver's License" },
  { value: "business_registration", label: "Business Registration / CAC" },
  { value: "tax_certificate", label: "Tax Certificate" },
];

const VerificationDialog = ({ userId, open, onOpenChange, onSubmitted }: Props) => {
  const [docType, setDocType] = useState("");
  const [bizReg, setBizReg] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setDocType("");
    setBizReg("");
    setNotes("");
    setFile(null);
  };

  const handleSubmit = async () => {
    if (!docType) {
      toast.error("Select a document type");
      return;
    }
    if (!file) {
      toast.error("Upload a document");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10MB)");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)) {
      toast.error("Use JPG, PNG, WEBP, or PDF");
      return;
    }

    setSubmitting(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${userId}/${Date.now()}_${docType}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("verification-docs")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("verification_requests").insert({
        user_id: userId,
        document_type: docType,
        document_url: path,
        business_registration_number: bizReg.trim() || null,
        notes: notes.trim() || null,
      });
      if (insErr) throw insErr;

      toast.success("Verification submitted! We'll review within 48 hours.");
      reset();
      onOpenChange(false);
      onSubmitted?.();
    } catch (e: unknown) {
      const error = e as Error;
      toast.error(error.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" /> Submit Verification
          </DialogTitle>
          <DialogDescription>
            Verified accounts get higher trust scores and priority placement.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Document Type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="mt-1 bg-secondary border-border">
                <SelectValue placeholder="Select document" />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Document File (JPG, PNG, PDF, max 10MB)</Label>
            <div className="mt-1 relative">
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="bg-secondary border-border file:text-primary file:bg-transparent file:border-0"
              />
            </div>
            {file && (
              <p className="text-xs text-muted-foreground mt-1">
                {file.name} · {(file.size / 1024).toFixed(0)} KB
              </p>
            )}
          </div>
          <div>
            <Label>Business Registration # (optional)</Label>
            <Input
              value={bizReg}
              maxLength={50}
              onChange={(e) => setBizReg(e.target.value)}
              className="mt-1 bg-secondary border-border"
              placeholder="e.g., RC1234567"
            />
          </div>
          <div>
            <Label>Additional Notes (optional)</Label>
            <Textarea
              value={notes}
              maxLength={500}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 bg-secondary border-border"
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full gradient-primary text-primary-foreground"
          >
            <Upload className="w-4 h-4 mr-2" />
            {submitting ? "Submitting..." : "Submit for Review"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VerificationDialog;
