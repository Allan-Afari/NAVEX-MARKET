import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Users, FileText, ArrowUpRight, MessageSquare, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

interface ActivityEvent {
  id: string;
  user_id: string | null;
  action: string;
  description: string | null;
  metadata: Record<string, any>;
  created_at: string;
  user?: {
    full_name: string | null;
  };
}

interface ActivityFeedProps {
  dealRoomId: string;
}

const actionIcons: Record<string, React.ReactNode> = {
  created: <Plus className="w-4 h-4 text-blue-500" />,
  participant_joined: <Users className="w-4 h-4 text-green-500" />,
  document_uploaded: <FileText className="w-4 h-4 text-purple-500" />,
  offer_made: <ArrowUpRight className="w-4 h-4 text-yellow-500" />,
  offer_accepted: <Badge className="bg-green-100 text-green-900 text-xs">Accepted</Badge>,
  offer_rejected: <Badge className="bg-red-100 text-red-900 text-xs">Rejected</Badge>,
  message_sent: <MessageSquare className="w-4 h-4 text-blue-500" />,
  participant_removed: <Trash2 className="w-4 h-4 text-red-500" />,
};

const actionLabels: Record<string, string> = {
  created: "Deal room created",
  participant_joined: "Participant joined",
  document_uploaded: "Document uploaded",
  offer_made: "Offer made",
  offer_accepted: "Offer accepted",
  offer_rejected: "Offer rejected",
  message_sent: "Message sent",
  participant_removed: "Participant removed",
};

const ActivityFeed = ({ dealRoomId }: ActivityFeedProps) => {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const { data, error } = await supabase
          .from("deal_room_activity")
          .select("*, user:user_id(full_name)")
          .eq("deal_room_id", dealRoomId)
          .order("created_at", { ascending: false })
          .limit(15);

        if (error) throw error;
        setActivities(data || []);
      } catch (error) {
        console.error("Error loading activity feed:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();

    // Subscribe to new activities
    const channel = supabase
      .channel(`activity:${dealRoomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "deal_room_activity",
          filter: `deal_room_id=eq.${dealRoomId}`,
        },
        (payload) => {
          setActivities((prev) => [payload.new as ActivityEvent, ...prev.slice(0, 14)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dealRoomId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin w-6 h-6 rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No activity yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex gap-3 pb-4 border-b border-border last:border-0">
                <div className="flex-shrink-0 mt-1">
                  {actionIcons[activity.action] || <Activity className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {activity.user?.full_name || "Unknown user"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {actionLabels[activity.action] || activity.action}
                      </p>
                      {activity.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {activity.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(activity.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityFeed;
