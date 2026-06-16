import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Pen, Check, X, Clock, User, FileText, AlertCircle } from "lucide-react";
import {
  createSignatureRequest,
  getSignatureRequestWithSigners,
  signDocument,
  declineSignature,
  canUserSign,
  getSignatureImageSignedUrl,
  type CreateSignatureRequest,
  type SignatureSigner,
} from "@/lib/eSignature";

interface ESignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentName: string;
  dealRoomId: string;
  userId: string;
  mode?: "request" | "sign";
  existingSignatureId?: string;
  onSignatureComplete?: () => void;
}

export default function ESignatureDialog({
  open,
  onOpenChange,
  documentId,
  documentName,
  dealRoomId,
  userId,
  mode = "request",
  existingSignatureId,
  onSignatureComplete,
}: ESignatureDialogProps) {
  const [loading, setLoading] = useState(false);
  const [signers, setSigners] = useState<Array<{ email: string; name?: string; role?: string }>>([
    { email: "", name: "", role: "signer" },
  ]);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signatureRequest, setSignatureRequest] = useState<any>(null);
  const [signerImages, setSignerImages] = useState<Record<string, string | null>>({});
  const [canSign, setCanSign] = useState(false);
  const [userSigner, setUserSigner] = useState<SignatureSigner | null>(null);
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [declineReason, setDeclineReason] = useState("");
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (!open || mode !== "sign" || !existingSignatureId) return;

    const loadSignatureRequest = async () => {
      setLoading(true);
      try {
        const data = await getSignatureRequestWithSigners(existingSignatureId);
        if (data) {
          setSignatureRequest(data);

          // Check if user can sign
          const checkResult = await canUserSign(existingSignatureId, userId);
          setCanSign(checkResult.canSign);
          setUserSigner(checkResult.signer || null);
          // fetch signer images (signed URLs) if present
          const images: Record<string, string | null> = {};
          await Promise.all(
            data.signers.map(async (s: any) => {
              const storagePath = s.signature_image_url || (s.signature_data && s.signature_data.url) || null;
              if (storagePath) {
                const url = await getSignatureImageSignedUrl(storagePath, 300);
                images[s.id] = url;
              } else {
                images[s.id] = null;
              }
            })
          );
          setSignerImages(images);
        }
      } catch (error) {
        console.error("Error loading signature request:", error);
        toast.error("Failed to load signature request");
      } finally {
        setLoading(false);
      }
    };

    loadSignatureRequest();
  }, [open, mode, existingSignatureId, userId]);

  const addSigner = () => {
    setSigners([...signers, { email: "", name: "", role: "signer" }]);
  };

  const removeSigner = (index: number) => {
    if (signers.length > 1) {
      setSigners(signers.filter((_, i) => i !== index));
    }
  };

  const updateSigner = (index: number, field: string, value: string) => {
    const updated = [...signers];
    updated[index] = { ...updated[index], [field]: value };
    setSigners(updated);
  };

  const handleRequestSignature = async () => {
    // Validate signers
    const validSigners = signers.filter(s => s.email.trim() !== "");
    if (validSigners.length === 0) {
      toast.error("Please add at least one signer");
      return;
    }

    setLoading(true);
    try {
      const request: CreateSignatureRequest = {
        document_id: documentId,
        deal_room_id: dealRoomId,
        signers: validSigners.map((s, i) => ({
          email: s.email,
          name: s.name,
          role: s.role,
          order_index: i,
        })),
        expires_in_days: expiresInDays,
      };

      const result = await createSignatureRequest(request, userId);
      if (result) {
        toast.success("Signature request created successfully");
        onOpenChange(false);
        onSignatureComplete?.();
      } else {
        toast.error("Failed to create signature request");
      }
    } catch (error) {
      console.error("Error requesting signature:", error);
      toast.error("Failed to request signature");
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!signatureData || !userSigner) {
      toast.error("Please provide your signature");
      return;
    }

    setLoading(true);
    try {
      const success = await signDocument(userSigner.id, signatureData, userId);
      if (success) {
        toast.success("Document signed successfully");
        onOpenChange(false);
        onSignatureComplete?.();
      } else {
        toast.error("Failed to sign document");
      }
    } catch (error) {
      console.error("Error signing document:", error);
      toast.error("Failed to sign document");
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!userSigner) return;

    setLoading(true);
    try {
      const success = await declineSignature(userSigner.id, declineReason, userId);
      if (success) {
        toast.success("Signature declined");
        setShowDeclineDialog(false);
        onOpenChange(false);
        onSignatureComplete?.();
      } else {
        toast.error("Failed to decline signature");
      }
    } catch (error) {
      console.error("Error declining signature:", error);
      toast.error("Failed to decline signature");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;

    const context = canvas.getContext("2d");
    if (context) {
      context.scale(scale, scale);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = "#111827";
      context.lineWidth = 2;
      contextRef.current = context;
    }
  }, [open, mode]);

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!contextRef.current) return;
    setIsDrawing(true);
    const { x, y } = getCanvasPoint(e);
    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current) return;
    const { x, y } = getCanvasPoint(e);
    contextRef.current.lineTo(x, y);
    contextRef.current.stroke();
  };

  const stopDrawing = () => {
    if (!contextRef.current || !canvasRef.current) return;
    setIsDrawing(false);
    contextRef.current.closePath();

    const dataUrl = canvasRef.current.toDataURL("image/png");
    setSignatureData(dataUrl);
  };

  const clearSignature = () => {
    if (!contextRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "signed":
        return <Badge className="bg-green-500">Signed</Badge>;
      case "declined":
        return <Badge className="bg-red-500">Declined</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pen className="w-5 h-5" />
            {mode === "request" ? "Request Signature" : "Sign Document"}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {mode === "request" ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Document</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-blue-500" />
                    <div>
                      <p className="font-medium">{documentName}</p>
                      <p className="text-sm text-muted-foreground">Ready for signature</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Signers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {signers.map((signer, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder="Email address"
                          value={signer.email}
                          onChange={(e) => updateSigner(index, "email", e.target.value)}
                          type="email"
                        />
                        <Input
                          placeholder="Name (optional)"
                          value={signer.name}
                          onChange={(e) => updateSigner(index, "name", e.target.value)}
                        />
                        <Input
                          placeholder="Role (optional)"
                          value={signer.role}
                          onChange={(e) => updateSigner(index, "role", e.target.value)}
                        />
                      </div>
                      {signers.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSigner(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={addSigner}
                    className="w-full"
                  >
                    + Add Signer
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label>Expires in (days)</Label>
                    <Input
                      type="number"
                      value={expiresInDays}
                      onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 30)}
                      min={1}
                      max={365}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-6">
              {loading && !signatureRequest ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Loading signature request...</div>
                </div>
              ) : signatureRequest ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Document</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-blue-500" />
                        <div>
                          <p className="font-medium">{documentName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(signatureRequest.signature.status)}
                            {signatureRequest.signature.expires_at && (
                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Expires {new Date(signatureRequest.signature.expires_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Signers</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {signatureRequest.signers.map((signer: SignatureSigner, index: number) => (
                        <div key={signer.id} className="flex items-center gap-3 p-3 rounded-lg border">
                          <Avatar>
                            <AvatarFallback>
                              {signer.name?.charAt(0) || signer.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{signer.name || signer.email}</p>
                            <p className="text-sm text-muted-foreground">{signer.email}</p>
                            {signer.role && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                {signer.role}
                              </Badge>
                            )}
                          </div>
                          {signerImages[signer.id] ? (
                            <img src={signerImages[signer.id] as string} alt="signature" className="w-24 h-12 object-contain rounded border" />
                          ) : null}
                          <div className="flex items-center gap-2">
                            {signer.order_index > 0 && (
                              <span className="text-xs text-muted-foreground">
                                #{signer.order_index + 1}
                              </span>
                            )}
                            {getStatusBadge(signer.status)}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {canSign && userSigner && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Your Signature</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="border-2 border-dashed rounded-lg p-8 text-center">
                          <p className="text-muted-foreground mb-4">
                            Draw your signature below
                          </p>
                          <canvas
                            ref={canvasRef}
                            className="w-full h-32 border rounded cursor-crosshair"
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                          />
                          <div className="mt-4 flex flex-col gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={clearSignature}
                              className="w-full"
                            >
                              Clear
                            </Button>
                            {signatureData && (
                              <div className="text-sm text-muted-foreground">
                                Signature captured. Ready to sign.
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {!canSign && signatureRequest.signature.status === "pending" && (
                    <Card className="border-yellow-200 bg-yellow-50">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-yellow-900">Waiting for other signers</p>
                            <p className="text-sm text-yellow-700 mt-1">
                              You'll be able to sign once all previous signers have completed their signatures.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No signature request found
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex gap-2">
          {mode === "request" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleRequestSignature} disabled={loading}>
                {loading ? "Creating..." : "Request Signature"}
              </Button>
            </>
          ) : (
            <>
              {canSign && userSigner && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeclineDialog(true)}
                    disabled={loading}
                  >
                    Decline
                  </Button>
                  <Button onClick={handleSign} disabled={loading || !signatureData}>
                    {loading ? "Signing..." : "Sign Document"}
                  </Button>
                </>
              )}
              {!canSign && (
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Decline Confirmation Dialog */}
      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Signature</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label>Reason (optional)</Label>
            <Textarea
              placeholder="Why are you declining to sign?"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeclineDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDecline} disabled={loading}>
              {loading ? "Declining..." : "Decline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
