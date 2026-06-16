import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ParticipantManager from "@/components/deal-rooms/ParticipantManager";
import DocumentUpload from "@/components/deal-rooms/DocumentUpload";
import DealRoomChat from "@/components/deal-rooms/DealRoomChat";
import DealRoomNegotiation from "@/components/deal-rooms/DealRoomNegotiation";
import ActivityFeed from "@/components/deal-rooms/ActivityFeed";
import DealNegotiationTerms from "@/components/deal-rooms/DealNegotiationTerms";
import DisputeResolution from "@/components/deal-rooms/DisputeResolution";
import ActivityAuditDashboard from "@/components/ActivityAuditDashboard";
import DocumentTemplateSelector from "@/components/deal-rooms/DocumentTemplateSelector";
import VideoConferenceButton from "@/components/deal-rooms/VideoConferenceButton";
import { ArrowLeft, ShieldCheck, Users, Lock, Clipboard } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface DealRoom {
  id: string;
  title: string;
  description: string | null;
  status: string;
  access_code: string | null;
  created_at: string;
  expires_at: string | null;
  deal_id: string;
  created_by: string | null;
  deal?: {
    title: string | null;
  };
}

const statusClass = (status: string) => {
  switch (status) {
    case "active": return "bg-green-100 text-green-800";
    case "completed": return "bg-slate-100 text-slate-800";
    case "cancelled": return "bg-red-100 text-red-800";
    default: return "bg-blue-100 text-blue-800";
  }
};

const DealRoomDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useSession();
  const [room, setRoom] = useState<DealRoom | null>(null);
  const [participants, setParticipants] = useState<number>(0);
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [fetching, setFetching] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [isParticipant, setIsParticipant] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [documentRefreshKey, setDocumentRefreshKey] = useState(0);
  const navigate = useNavigate();

  const hasRoomAccess = isOwner || isParticipant || isAdmin;

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!id || !user) return;

    const loadRoom = async () => {
      setFetching(true);
      try {
        const { data, error } = await supabase
          .from("deal_rooms")
          .select("*, deal:deals(title), deal_room_participants(id, role, user_id)")
          .eq("id", id)
          .single();

        if (error) {
          throw error;
        }

        setRoom(data);
        const participantCount = data.deal_room_participants?.length ?? 0;
        setParticipants(participantCount);
        
        // Extract participant IDs
        const ids = data.deal_room_participants?.map((p: any) => p.user_id) ?? [];
        setParticipantIds(ids);
        setIsParticipant(ids.includes(user.id));

        setIsOwner(data.created_by === user.id);
        setIsEditor(data.deal_room_participants?.some((participant: any) => participant.user_id === user.id && participant.role === "editor") ?? false);
        
        // Check if user is admin (you may need to adjust this based on your auth setup)
        const { data: profileData } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        
        setIsAdmin(profileData?.role === "admin");
      } catch (error) {
        console.error("Failed to load deal room:", error);
        toast.error("Unable to open this deal room.");
      } finally {
        setFetching(false);
      }
    };

    loadRoom();
  }, [id, user]);

  const handleCopyCode = async () => {
    if (!room?.access_code) return;
    try {
      await navigator.clipboard.writeText(room.access_code);
      toast.success("Access code copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const handleDocumentCreated = () => {
    setDocumentRefreshKey(prev => prev + 1);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-10 h-10 rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!id || (!room && !fetching)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Deal room not found or access is restricted.</p>
      </div>
    );
  }

  if (room && !fetching && !hasRoomAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <p className="text-lg font-semibold mb-2">Access denied</p>
          <p className="text-sm text-muted-foreground">
            You do not have permission to access this deal room. Please contact the room owner or an administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={room?.title ? `${room.title} · Deal Room` : "Deal Room"} description="Virtual deal room for secure collaboration and due diligence." />
      <Navbar />
      <div className="container px-4 pt-24 pb-12">
        <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-8">
          <div>
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <h1 className="text-3xl font-bold mt-4">{room?.title}</h1>
            <p className="text-sm text-muted-foreground mt-2">Secure workspace for structured interactions, documents, and stakeholder participation.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/deal-rooms")}>Deal Rooms</Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/deals/${room?.deal_id}`)}>View Deal</Button>
            {hasRoomAccess && (
              <VideoConferenceButton dealRoomId={id} user={user} dealRoomTitle={room?.title} />
            )}
          </div>
        </div>

        <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={statusClass(room?.status || "active")}>{room?.status}</Badge>
                  {room?.deal?.title && (
                    <span className="text-sm text-muted-foreground">Linked deal: <Link to={`/deals/${room.deal_id}`} className="text-primary hover:underline">{room.deal.title}</Link></span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{room?.description || "No description provided."}</p>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <div className="font-medium">Created</div>
                    <div>{room ? new Date(room.created_at).toLocaleDateString() : "—"}</div>
                  </div>
                  <div>
                    <div className="font-medium">Expires</div>
                    <div>{room?.expires_at ? new Date(room.expires_at).toLocaleDateString() : "No expiry"}</div>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div className="rounded-xl border border-border p-4 bg-muted/40">
                    <div className="font-medium mb-1">Participants</div>
                    <div>{participants}</div>
                  </div>
                  <div className="rounded-xl border border-border p-4 bg-muted/40">
                    <div className="font-medium mb-1">Access Code</div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{room?.access_code || "—"}</span>
                      {room?.access_code && (
                        <Button size="icon" variant="ghost" onClick={handleCopyCode}>
                          <Clipboard className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6">
              <DocumentUpload dealRoomId={id} user={user} isEditor={isOwner || isEditor} isAdmin={isAdmin} hasAccess={hasRoomAccess} key={documentRefreshKey} />
              {(isOwner || isEditor) && (
                <DocumentTemplateSelector dealRoomId={id} user={user} onDocumentCreated={handleDocumentCreated} />
              )}
            </div>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Collaboration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span>Secure due diligence workspace with invite-based access and role controls.</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4 text-accent" />
                  <span>{isOwner ? "You are the owner of this deal room." : isEditor ? "You can upload documents and collaborate in this room." : "You have view access only."}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="w-4 h-4 text-warning" />
                  <span>Confidential documents can be marked and tracked for audit readiness.</span>
                </div>
              </CardContent>
            </Card>

            <ParticipantManager dealRoomId={id} currentUser={user} isOwner={isOwner} />
          </div>
        </div>

        <div className="grid xl:grid-cols-[1.3fr_0.7fr] gap-6 mt-6">
          <DealRoomChat dealRoomId={id} user={user} />
          <DealRoomNegotiation dealRoomId={id} user={user} ownerId={room?.created_by ?? null} />
        </div>

        <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-6 mt-6">
          <DealNegotiationTerms dealRoomId={id} user={user} isEditor={isOwner || isEditor} />
          <DisputeResolution dealRoomId={id} participantIds={participantIds} user={user} isEditor={isOwner || isEditor} />
        </div>

        {isAdmin && (
          <div className="mt-6">
            <ActivityAuditDashboard dealRoomId={id} isAdmin={true} />
          </div>
        )}

        <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-6 mt-6">
          <ActivityFeed dealRoomId={id} />
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Room summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Track collaboration activity, negotiations, and document uploads in a single feed.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealRoomDetail;
