import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, FileText, MessageSquare, Lock, ShieldCheck, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface RoomMetrics {
  id: string;
  title: string;
  status: string;
  total_documents: number;
  total_messages: number;
  total_offers: number;
  last_activity: string;
}

const DealRoomAnalytics = () => {
  const [rooms, setRooms] = useState<RoomMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    activeRooms: 0,
    totalDocuments: 0,
    totalMessages: 0,
    totalOffers: 0,
    acceptedOffers: 0,
    averageOfferAmount: 0,
    totalAccessEvents: 0,
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      const [roomsRes, docsRes, accessRes, offersRes, messagesRes] = await Promise.all([
        supabase.from("deal_rooms").select("id,title,status,created_at"),
        supabase.from("deal_room_documents").select("id,deal_room_id,uploaded_at"),
        supabase.from("document_access_log").select("id,action,accessed_at,document_id"),
        supabase.from("deal_room_negotiations").select("id,deal_room_id,status,amount,created_at"),
        supabase.from("deal_room_messages").select("id,deal_room_id,created_at"),
      ]);

      if (roomsRes.error || docsRes.error || accessRes.error || offersRes.error || conversationsRes.error || messagesRes.error) {
        throw roomsRes.error || docsRes.error || accessRes.error || offersRes.error || conversationsRes.error || messagesRes.error;
      }

      const roomsData = roomsRes.data || [];
      const docsData = docsRes.data || [];
      const accessData = accessRes.data || [];
      const offersData = offersRes.data || [];
      const messagesData = messagesRes.data || [];

      const roomMap = new Map<string, RoomMetrics>();
      roomsData.forEach((room: any) => {
        roomMap.set(room.id, {
          id: room.id,
          title: room.title || "Untitled room",
          status: room.status || "active",
          total_documents: 0,
          total_messages: 0,
          total_offers: 0,
          last_activity: room.created_at || "",
        });
      });

      docsData.forEach((doc: any) => {
        const room = roomMap.get(doc.deal_room_id);
        if (room) {
          room.total_documents += 1;
          room.last_activity = doc.uploaded_at > room.last_activity ? doc.uploaded_at : room.last_activity;
        }
      });

      messagesData.forEach((message: any) => {
        const roomId = message.deal_room_id;
        if (roomId) {
          const room = roomMap.get(roomId);
          if (room) {
            room.total_messages += 1;
            room.last_activity = message.created_at > room.last_activity ? message.created_at : room.last_activity;
          }
        }
      });

      offersData.forEach((offer: any) => {
        const room = roomMap.get(offer.deal_room_id);
        if (room) {
          room.total_offers += 1;
          room.last_activity = offer.created_at > room.last_activity ? offer.created_at : room.last_activity;
        }
      });

      const acceptedOffers = offersData.filter((offer: any) => offer.status === "accepted").length;
      const averageOfferAmount = offersData.length
        ? Math.round(
            offersData.reduce((sum: number, offer: any) => sum + Number(offer.amount || 0), 0) /
              offersData.length
          )
        : 0;

      setSummary({
        activeRooms: roomMap.size,
        totalDocuments: docsData.length,
        totalMessages: messagesData.length,
        totalOffers: offersData.length,
        acceptedOffers,
        averageOfferAmount,
        totalAccessEvents: accessData.length,
      });

      setRooms(
        Array.from(roomMap.values())
          .sort((a, b) =>
            b.total_documents + b.total_messages + b.total_offers -
            (a.total_documents + a.total_messages + a.total_offers)
          )
          .slice(0, 5)
      );
    } catch (error) {
      console.error("Error loading deal room analytics:", error);
      toast.error("Unable to load deal room analytics.");
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (value: number) => value.toLocaleString();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Deal Room Workflow Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border p-4 bg-muted/40">
              <p className="text-3xl font-semibold">{loading ? "—" : formatNumber(summary.activeRooms)}</p>
              <p className="text-sm text-muted-foreground mt-2">Active Rooms</p>
            </div>
            <div className="rounded-xl border border-border p-4 bg-muted/40">
              <p className="text-3xl font-semibold">{loading ? "—" : formatNumber(summary.totalDocuments)}</p>
              <p className="text-sm text-muted-foreground mt-2">Documents Uploaded</p>
            </div>
            <div className="rounded-xl border border-border p-4 bg-muted/40">
              <p className="text-3xl font-semibold">{loading ? "—" : formatNumber(summary.totalMessages)}</p>
              <p className="text-sm text-muted-foreground mt-2">Chat Messages</p>
            </div>
            <div className="rounded-xl border border-border p-4 bg-muted/40">
              <p className="text-3xl font-semibold">{loading ? "—" : formatNumber(summary.totalOffers)}</p>
              <p className="text-sm text-muted-foreground mt-2">Negotiation Events</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="rounded-xl border border-border p-4 bg-muted/40">
              <p className="text-2xl font-semibold">{loading ? "—" : formatNumber(summary.acceptedOffers)}</p>
              <p className="text-sm text-muted-foreground mt-2">Offers Accepted</p>
            </div>
            <div className="rounded-xl border border-border p-4 bg-muted/40">
              <p className="text-2xl font-semibold">{loading ? "—" : formatNumber(summary.averageOfferAmount)}</p>
              <p className="text-sm text-muted-foreground mt-2">Avg Offer Amount</p>
            </div>
            <div className="rounded-xl border border-border p-4 bg-muted/40">
              <p className="text-2xl font-semibold">{loading ? "—" : formatNumber(summary.totalAccessEvents)}</p>
              <p className="text-sm text-muted-foreground mt-2">Document Access Events</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5" /> Top Active Rooms
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading room activity…</div>
          ) : rooms.length === 0 ? (
            <div className="text-sm text-muted-foreground">No active deal rooms found yet.</div>
          ) : (
            <div className="space-y-3">
              {rooms.map((room) => (
                <div key={room.id} className="rounded-xl border border-border p-4 bg-background">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{room.title}</p>
                      <p className="text-xs text-muted-foreground">Last active {new Date(room.last_activity).toLocaleDateString()}</p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-900">{room.status}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3 text-sm text-muted-foreground">
                    <div className="rounded-lg border border-border p-3 bg-muted/50">
                      <div className="font-semibold">{formatNumber(room.total_documents)}</div>
                      <div>Docs</div>
                    </div>
                    <div className="rounded-lg border border-border p-3 bg-muted/50">
                      <div className="font-semibold">{formatNumber(room.total_messages)}</div>
                      <div>Messages</div>
                    </div>
                    <div className="rounded-lg border border-border p-3 bg-muted/50">
                      <div className="font-semibold">{formatNumber(room.total_offers)}</div>
                      <div>Offers</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DealRoomAnalytics;
