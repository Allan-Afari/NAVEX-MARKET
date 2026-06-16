import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pen, CheckCircle, Clock, AlertCircle } from "lucide-react";
import ESignatureDialog from "@/components/ESignatureDialog";
import { getSignatureRequestWithSigners } from "@/lib/eSignature";

interface DocumentSignatureButtonProps {
  documentId: string;
  documentName: string;
  dealRoomId: string;
  userId: string;
  signatureStatus?: string;
  signatureId?: string;
  onSignatureComplete?: () => void;
}

export default function DocumentSignatureButton({
  documentId,
  documentName,
  dealRoomId,
  userId,
  signatureStatus = "none",
  signatureId,
  onSignatureComplete,
}: DocumentSignatureButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [mode, setMode] = useState<"request" | "sign">("request");

  const handleRequestSignature = () => {
    setMode("request");
    setShowDialog(true);
  };

  const handleSignDocument = () => {
    setMode("sign");
    setShowDialog(true);
  };

  const getStatusIcon = () => {
    switch (signatureStatus) {
      case "fully_signed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "partially_signed":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "pending":
        return <Clock className="w-4 h-4 text-blue-500" />;
      case "declined":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Pen className="w-4 h-4" />;
    }
  };

  const getStatusText = () => {
    switch (signatureStatus) {
      case "fully_signed":
        return "Signed";
      case "partially_signed":
        return "Partially Signed";
      case "pending":
        return "Pending Signature";
      case "declined":
        return "Declined";
      default:
        return "Request Signature";
    }
  };

  const getBadgeVariant = () => {
    switch (signatureStatus) {
      case "fully_signed":
        return "default" as const;
      case "partially_signed":
        return "secondary" as const;
      case "pending":
        return "outline" as const;
      case "declined":
        return "destructive" as const;
      default:
        return "outline" as const;
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {signatureStatus === "none" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRequestSignature}
            className="gap-2"
          >
            <Pen className="w-4 h-4" />
            Request Signature
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Badge variant={getBadgeVariant()} className="gap-1">
              {getStatusIcon()}
              {getStatusText()}
            </Badge>
            {signatureStatus === "pending" && signatureId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignDocument}
                className="gap-2"
              >
                <Pen className="w-4 h-4" />
                Sign
              </Button>
            )}
          </div>
        )}
      </div>

      <ESignatureDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        documentId={documentId}
        documentName={documentName}
        dealRoomId={dealRoomId}
        userId={userId}
        mode={mode}
        existingSignatureId={signatureId}
        onSignatureComplete={onSignatureComplete}
      />
    </>
  );
}
