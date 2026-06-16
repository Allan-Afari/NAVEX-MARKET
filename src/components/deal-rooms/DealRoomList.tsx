import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FolderOpen, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface DealRoom {
  id: string;
  deal_id: string;
  title: string;
  description: string | null;
  status: string;
  created_by: string;
  created_at: string;
  expires_at: string | null;
  participant_count?: number;
  deal?: {
    title: string;
  };
}

interface DealRoomListProps {
  user: User;
}

const DealRoomList = ({ user }: DealRoomListProps) => {
  const [rooms, setRooms] = useState<DealRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchDealRooms = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch deal rooms where user is owner or participant
      const { data, error } = await supabase
        .from("deal_rooms")
        .select(`
          id,
          deal_id,
          title,
          description,
          status,
          created_by,
          created_at,
          expires_at,
          deal:deals(title),
          deal_room_participants(count)
        `)
        .or(`created_by.eq.${user.id},deal_room_participants.user_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedRooms = (data || []).map((room: {
        id: string;
        deal_id: string | null;
        title: string;
        description: string | null;
        status: string;
        created_by: string | null;
        created_at: string;
        expires_at: string | null;
        deal?: { title: string } | null;
        deal_room_participants?: { count: number }[] | null;
      }) => ({
        ...room,
        participant_count: room.deal_room_participants?.[0]?.count || 0,
      }));

      setRooms(formattedRooms);
    } catch (error) {
      console.error("Error fetching deal rooms:", error);
      toast.error("Failed to load deal rooms");
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchDealRooms();
  }, [fetchDealRooms]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Deal Rooms
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Deal Rooms
          </CardTitle>
          <Button
            size="sm"
            className="gradient-primary text-primary-foreground"
            onClick={() => navigate("/deal-room/create")}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Room
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Secure virtual spaces for due diligence and collaboration
        </p>
      </CardHeader>
      <CardContent>
        {rooms.length === 0 ? (
          <div className="text-center py-8">
            <FolderOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              No deal rooms yet. Create one to start collaborating!
            </p>
            <Button
              className="gradient-primary text-primary-foreground"
              onClick={() => navigate("/deal-room/create")}
            >
              Create Your First Deal Room
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => navigate(`/deal-room/${room.id}`)}
                className="w-full border rounded-lg p-4 hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg">{room.title}</h3>
                    {room.deal?.title && (
                      <p className="text-sm text-muted-foreground">
                        Deal: {room.deal.title}
                      </p>
                    )}
                  </div>
                  <Badge className={getStatusColor(room.status)}>
                    {room.status}
                  </Badge>
                </div>

                {room.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {room.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm text-muted-foreground gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {room.participant_count} participants
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {room.expires_at
                      ? `Expires ${formatDate(room.expires_at)}`
                      : `Created ${formatDate(room.created_at)}`}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DealRoomList;
