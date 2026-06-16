import { useEffect, useState, useRef, useCallback, type ChangeEvent, type DragEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Trash2, Download, Lock, Eye, Copy } from "lucide-react";
import { toast } from "sonner";
import { logDealRoomActivity } from "@/lib/activityTracking";
import { sendDocumentUploadEmail } from "@/lib/emailEventTriggers";
import type { User } from "@supabase/supabase-js";

interface DocumentUploadProps {
  dealRoomId: string;
  user: User;
  isEditor: boolean;
  isAdmin: boolean;
  hasAccess: boolean;
  onDocumentAdded?: () => void;
}

interface Document {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url: string;
  category: string;
  is_confidential: boolean;
  uploaded_by: string;
  uploaded_at: string;
  uploader?: {
    full_name: string;
  };
}

interface AccessLog {
  id: string;
  document_id: string;
  action: "view" | "download" | "share";
  user_id: string | null;
  user?: {
    full_name: string | null;
  };
  accessed_at: string;
  user_agent: string | null;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif'
];

const ALLOWED_FILE_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
];

const DocumentUpload = ({ dealRoomId, user, isEditor, isAdmin, hasAccess, onDocumentAdded }: DocumentUploadProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [uploading, setUploading] = useState(false);

  const canManageDocuments = isEditor || isAdmin;
  const [dragActive, setDragActive] = useState(false);
  const [category, setCategory] = useState("general");
  const [isConfidential, setIsConfidential] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ["general", "financial", "legal", "technical", "operational"];

  const handleFileInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  const createActivity = async (action: string, description: string, metadata: Record<string, any> = {}) => {
    const success = await logDealRoomActivity(user.id, {
      deal_room_id: dealRoomId,
      action,
      description,
      metadata,
    });
    if (!success) {
      console.warn("Failed to log activity:", action);
    }
  };

  const notifyRoomParticipants = async (type: string, title: string, message: string) => {
    try {
      const { data: participants, error } = await supabase
        .from("deal_room_participants")
        .select("user_id")
        .eq("deal_room_id", dealRoomId)
        .neq("user_id", user.id);

      if (error) throw error;
      if (!participants?.length) return;

      const notifications = participants
        .filter((participant: { user_id: string }) => participant.user_id)
        .map((participant: { user_id: string }) => ({
          user_id: participant.user_id,
          type,
          title,
          body: message,
          deal_room_id: dealRoomId,
          link: `/deal-room/${dealRoomId}`,
        }));

      if (notifications.length > 0) {
        await supabase.from("notifications").insert(notifications as any[]);
      }
    } catch (error) {
      console.error("Error sending document notifications:", error);
    }
  };

  const getStoragePath = (urlOrPath: string) => {
    if (!urlOrPath) return "";

    try {
      const parsed = new URL(urlOrPath);
      const path = parsed.pathname;
      const marker = "/deal-room-documents/";
      const index = path.indexOf(marker);
      if (index >= 0) {
        return path.slice(index + marker.length);
      }
      const parts = path.split("/").filter(Boolean);
      return parts.length > 1 ? parts.slice(-2).join("/") : parts.join("/");
    } catch {
      return urlOrPath.replace(/^\/+/, "");
    }
  };

  const logDocumentAccess = async (documentId: string, action: "view" | "download" | "share") => {
    try {
      await supabase.from("document_access_log").insert({
        document_id: documentId,
        user_id: user.id,
        action,
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      console.error("Error logging document access:", error);
    }
  };

  const fetchAccessLogs = useCallback(async (documentIds: string[]) => {
    if (documentIds.length === 0) {
      setAccessLogs([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("document_access_log")
        .select("*, user:user_id(full_name)")
        .in("document_id", documentIds)
        .order("accessed_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      const typedData = (data || []).map((log: any) => ({
        ...log,
        action: (log.action as "view" | "download" | "share") || "view",
        user: log.user || { full_name: null },
      })) as AccessLog[];
      setAccessLogs(typedData);
    } catch (error) {
      console.error("Error loading document access logs:", error);
    }
  }, []);

  const fetchDocuments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("deal_room_documents")
        .select("*, uploader:uploaded_by(full_name)")
        .eq("deal_room_id", dealRoomId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      const docs = (data || []) as unknown as Document[];
      setDocuments(docs);
      await fetchAccessLogs(docs.map((doc) => doc.id));
    } catch (error) {
      console.error("Error loading deal room documents:", error);
    }
  }, [dealRoomId, fetchAccessLogs]);

  useEffect(() => {
    if (hasAccess) {
      fetchDocuments();
    } else {
      setDocuments([]);
      setAccessLogs([]);
    }
  }, [fetchDocuments, hasAccess]);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
    }

    const normalizedName = file.name.toLowerCase();
    const extensionAllowed = ALLOWED_FILE_EXTENSIONS.some((ext) => normalizedName.endsWith(ext));
    if (!ALLOWED_FILE_TYPES.includes(file.type) && !extensionAllowed) {
      return 'File type not allowed. Please upload PDF, Word, Excel, PowerPoint, text, or image files.';
    }
    return null;
  };

  const handleFileUpload = async (file: File) => {
    if (!canManageDocuments) {
      toast.error("You are not authorized to upload documents in this room.");
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setUploading(true);

      // Upload file to Supabase Storage
      const fileExt = file.name.includes(".") ? file.name.split(".").pop() : "";
      const storagePath = `${dealRoomId}/${Date.now()}${fileExt ? `.${fileExt}` : ""}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("deal-room-documents")
        .upload(storagePath, file, { upsert: false });

      if (uploadError) throw uploadError;
      if (!uploadData) throw new Error("File upload returned no metadata");

      // Record document metadata using the private storage path
      const { data: insertedDocs, error: recordError } = await supabase
        .from("deal_room_documents")
        .insert({
          deal_room_id: dealRoomId,
          uploaded_by: user.id,
          file_name: file.name,
          file_url: storagePath,
          file_size: file.size,
          file_type: file.type,
          category,
          is_confidential: isConfidential,
        })
        .select("id");

      if (recordError) throw recordError;

      toast.success(`Document "${file.name}" uploaded successfully`);
      await createActivity("document_uploaded", `Uploaded ${file.name}`, { document_id: insertedDocs?.[0]?.id });
      
      // Get room title for email notification
      const { data: roomData, error: roomError } = await supabase
        .from("deal_rooms")
        .select("title")
        .eq("id", dealRoomId)
        .single();

      const roomTitle = roomError ? "Deal Room" : roomData?.title || "Deal Room";

      // Get participant emails and send notifications
      const { data: participants, error: participantsError } = await supabase
        .from("deal_room_participants")
        .select("user_id")
        .eq("deal_room_id", dealRoomId);

      if (!participantsError && participants && participants.length > 0) {
        const participantIds = participants.map((p: any) => p.user_id).filter((id: string) => id !== user.id);
        
        if (participantIds.length > 0) {
          const { data: participantProfiles, error: participantProfilesError } = await supabase
            .from("profiles")
            .select("email")
            .in("id", participantIds);

          if (!participantProfilesError && participantProfiles && participantProfiles.length > 0) {
            const emails = participantProfiles.map((p: any) => p.email).filter(Boolean);
            await sendDocumentUploadEmail(
              emails,
              roomTitle,
              file.name,
              user.email || user.id,
              dealRoomId
            ).catch(() => null);
          }
        }
      }
      
      await notifyRoomParticipants(
        "document_upload",
        "New document uploaded",
        `${user.email || user.id} uploaded ${file.name}`
      );

      if (onDocumentAdded) {
        onDocumentAdded();
      }
      await fetchDocuments();
      setCategory("general");
      setIsConfidential(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const getSignedDocumentUrl = async (fileUrl: string) => {
    const filePath = getStoragePath(fileUrl);
    if (!filePath) {
      return fileUrl;
    }

    try {
      const { data, error } = await supabase.storage
        .from("deal-room-documents")
        .createSignedUrl(filePath, 300);

      if (error || !data?.signedUrl) {
        console.warn("Failed to generate signed URL, falling back to public URL:", error);
        return fileUrl.startsWith("http") ? fileUrl : "";
      }

      return data.signedUrl;
    } catch (error) {
      console.error("Error generating signed document URL:", error);
      return fileUrl.startsWith("http") ? fileUrl : "";
    }
  };

  const handleDelete = async (docId: string, fileUrl: string) => {
    if (!canManageDocuments) {
      toast.error("You are not authorized to delete documents in this room.");
      return;
    }

    const confirmed = window.confirm("Are you sure you want to delete this document? This action cannot be undone.");
    if (!confirmed) {
      return;
    }

    try {
      const filePath = getStoragePath(fileUrl);
      if (filePath) {
        await supabase.storage.from("deal-room-documents").remove([filePath]);
      }

      const { error } = await supabase
        .from("deal_room_documents")
        .delete()
        .eq("id", docId);

      if (error) throw error;

      toast.success("Document deleted");
      if (onDocumentAdded) {
        onDocumentAdded();
      }
      await fetchDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const canAccessDocument = (doc: Document) => {
    return !doc.is_confidential || canManageDocuments;
  };

  const handleRestrictedAccess = () => {
    toast.error("Confidential documents are only available to room editors and administrators.");
  };

  const handleViewDocument = async (doc: Document) => {
    if (!canAccessDocument(doc)) {
      handleRestrictedAccess();
      return;
    }

    const url = await getSignedDocumentUrl(doc.file_url);
    if (!url) {
      toast.error("Unable to open the document. Please try again later.");
      return;
    }

    await logDocumentAccess(doc.id, "view");
    window.open(url, "_blank");
  };

  const handleDownloadDocument = async (doc: Document) => {
    if (!canAccessDocument(doc)) {
      handleRestrictedAccess();
      return;
    }

    const url = await getSignedDocumentUrl(doc.file_url);
    if (!url) {
      toast.error("Unable to download the document. Please try again later.");
      return;
    }

    await logDocumentAccess(doc.id, "download");
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = doc.file_name;
    anchor.target = "_blank";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const handleShareDocument = async (doc: Document) => {
    if (!canManageDocuments) {
      toast.error("Only room editors and administrators can generate share links for documents.");
      return;
    }

    try {
      if (!navigator?.clipboard?.writeText) {
        throw new Error("Clipboard API not supported");
      }
      const url = await getSignedDocumentUrl(doc.file_url);
      if (!url) {
        throw new Error("Unable to generate a share link for this document.");
      }
      await navigator.clipboard.writeText(url);
      await logDocumentAccess(doc.id, "share");
      toast.success("Document link copied to clipboard");
    } catch (error) {
      console.error("Error sharing document:", error);
      toast.error("Unable to copy share link");
    }
  };

  if (!hasAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Access denied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You do not have permission to see documents for this deal room. Contact the room owner if you believe this is an error.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Documents
        </CardTitle>
      </CardHeader>
      <CardContent>
        {canManageDocuments && (
          <div
            className={`mb-6 p-4 border-2 border-dashed rounded-lg transition-colors ${dragActive ? "border-primary bg-primary/10" : "bg-muted/30"}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium mb-2">Upload Documents</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Drag and drop files or click to select
                </p>
              </div>

              <div className="flex flex-col gap-3 w-full">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <div className="flex gap-2 w-full">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>

                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={isConfidential}
                      onChange={(e) => setIsConfidential(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-xs">Confidential</span>
                  </label>
                </div>

                <Button
                  type="button"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? "Uploading..." : "Choose File"}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No documents yet</p>
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <p className="font-medium text-sm truncate">{doc.file_name}</p>
                    {doc.is_confidential && (
                      <Lock className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    )}
                    {doc.is_confidential && !canManageDocuments && (
                      <Badge variant="outline" className="text-xs">Restricted</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{doc.category}</Badge>
                    <span>{formatFileSize(doc.file_size)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleViewDocument(doc)}
                    className={`p-2 rounded-lg transition-colors ${canAccessDocument(doc) ? "hover:bg-muted" : "opacity-40 cursor-not-allowed"}`}
                    title={canAccessDocument(doc) ? "View document" : "Restricted document"}
                  >
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadDocument(doc)}
                    className={`p-2 rounded-lg transition-colors ${canAccessDocument(doc) ? "hover:bg-muted" : "opacity-40 cursor-not-allowed"}`}
                    title={canAccessDocument(doc) ? "Download" : "Restricted document"}
                  >
                    <Download className="w-4 h-4 text-muted-foreground" />
                  </button>
                  {canManageDocuments && (
                    <button
                      type="button"
                      onClick={() => handleShareDocument(doc)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      title="Share document"
                    >
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                  {canManageDocuments && (
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id, doc.file_url)}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {canManageDocuments && accessLogs.length > 0 && (
          <div className="mt-6 rounded-xl border border-border p-4 bg-muted/50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold">Recent Document Access</p>
                <p className="text-xs text-muted-foreground">Tracked by action type for this deal room.</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Views: {accessLogs.filter((log) => log.action === "view").length}</span>
                <span>Downloads: {accessLogs.filter((log) => log.action === "download").length}</span>
                <span>Shares: {accessLogs.filter((log) => log.action === "share").length}</span>
              </div>
            </div>

            <div className="space-y-2">
              {accessLogs.slice(0, 6).map((log) => (
                <div key={log.id} className="rounded-xl border border-border p-3 bg-background">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{log.user?.full_name || log.user_id || "Unknown user"}</span>
                    <span className="font-semibold text-foreground">{log.action}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(log.accessed_at).toLocaleString()} · {log.user_agent || "No user agent"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentUpload;
