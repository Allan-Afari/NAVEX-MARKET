import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  MessageCircle,
  Trash2,
  Flag,
} from "lucide-react";
import { toast } from "sonner";
import { logDealRoomActivity } from "@/lib/activityTracking";
import { sendDisputeInitiatedEmail } from "@/lib/emailEventTriggers";
import type { User } from "@supabase/supabase-js";

interface Dispute {
  id: string;
  deal_room_id: string;
  initiated_by: string;
  against_user: string;
  reason: string;
  description: string | null;
  status: "open" | "under-review" | "escalated" | "resolved" | "dismissed";
  resolution: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  initiator?: { full_name: string; email: string };
  defendant?: { full_name: string; email: string };
}

interface DisputeResolutionProps {
  dealRoomId: string;
  participantIds: string[];
  user: User;
  isEditor: boolean;
}

export const DisputeResolution = ({
  dealRoomId,
  participantIds,
  user,
  isEditor,
}: DisputeResolutionProps) => {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newDispute, setNewDispute] = useState({
    defendant_id: "",
    reason: "",
    description: "",
  });

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const fetchDisputes = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("disputes")
        .select(
          "*, initiator:initiated_by(full_name, email), defendant:against_user(full_name, email)"
        )
        .eq("deal_room_id", dealRoomId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDisputes(data || []);
    } catch (error) {
      console.error("Error fetching disputes:", error);
      toast.error("Failed to load disputes");
    } finally {
      setLoading(false);
    }
  }, [dealRoomId]);

  const handleInitiateDispute = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newDispute.defendant_id.trim() || !newDispute.reason.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.from("disputes").insert({
        deal_room_id: dealRoomId,
        initiated_by: user.id,
        against_user: newDispute.defendant_id,
        reason: newDispute.reason,
        description: newDispute.description || null,
        status: "open",
      });

      if (error) throw error;

      await logDealRoomActivity(user.id, {
        deal_room_id: dealRoomId,
        action: "dispute_initiated",
        description: `Dispute initiated: ${newDispute.reason}`,
        metadata: {
          reason: newDispute.reason,
          defendant_id: newDispute.defendant_id,
        },
      });

      // Get defendant email for email notification
      const { data: defendantData } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", newDispute.defendant_id)
        .single();

      // Get deal room title
      const { data: roomData } = await supabase
        .from("deal_rooms")
        .select("title")
        .eq("id", dealRoomId)
        .single();

      // Send email notification
      if (defendantData?.email) {
        await sendDisputeInitiatedEmail(
          defendantData.email,
          roomData?.title || "Deal Room",
          newDispute.reason,
          user.email || user.id,
          dealRoomId
        ).catch(() => null); // Don't fail if email fails
      }

      // Send notification to defendant
      await supabase.from("notifications").insert({
        user_id: newDispute.defendant_id,
        type: "dispute",
        title: "New Dispute",
        body: `${user.email} has initiated a dispute: ${newDispute.reason}`,
        deal_room_id: dealRoomId,
      });

      toast.success("Dispute initiated. The other party will be notified.");
      setNewDispute({ defendant_id: "", reason: "", description: "" });
      setShowForm(false);
      await fetchDisputes();
    } catch (error) {
      console.error("Error initiating dispute:", error);
      toast.error("Failed to initiate dispute");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDisputeStatus = async (
    disputeId: string,
    newStatus: "under-review" | "escalated" | "resolved" | "dismissed",
    resolution?: string
  ) => {
    try {
      const updateData: Record<string, any> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === "resolved" && resolution) {
        updateData.resolution = resolution;
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("disputes")
        .update(updateData)
        .eq("id", disputeId);

      if (error) throw error;

      await logDealRoomActivity(user.id, {
        deal_room_id: dealRoomId,
        action: "dispute_updated",
        description: `Dispute status changed to ${newStatus}`,
        metadata: { dispute_id: disputeId, new_status: newStatus },
      });

      toast.success(`Dispute marked as ${newStatus}`);
      await fetchDisputes();
    } catch (error) {
      console.error("Error updating dispute status:", error);
      toast.error("Failed to update dispute");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "resolved":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "dismissed":
        return <CheckCircle2 className="w-4 h-4 text-gray-600" />;
      case "escalated":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case "under-review":
        return <MessageCircle className="w-4 h-4 text-blue-600" />;
      default:
        return <Flag className="w-4 h-4 text-orange-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved":
        return "bg-green-100 text-green-800";
      case "dismissed":
        return "bg-gray-100 text-gray-800";
      case "escalated":
        return "bg-red-100 text-red-800";
      case "under-review":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-orange-100 text-orange-800";
    }
  };

  const otherParticipants = participantIds.filter((id) => id !== user.id);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Dispute Resolution
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Report Dispute
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <form onSubmit={handleInitiateDispute} className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <div>
              <label className="block text-sm font-medium mb-2">Dispute With (Select User)</label>
              <select
                value={newDispute.defendant_id}
                onChange={(e) => setNewDispute({ ...newDispute, defendant_id: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">-- Select a participant --</option>
                {otherParticipants.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </div>

            <Input
              placeholder="Dispute reason (e.g., 'Breach of agreement')"
              value={newDispute.reason}
              onChange={(e) => setNewDispute({ ...newDispute, reason: e.target.value })}
              required
            />

            <Textarea
              placeholder="Detailed description of the dispute"
              value={newDispute.description}
              onChange={(e) => setNewDispute({ ...newDispute, description: e.target.value })}
              rows={4}
            />

            <p className="text-xs text-muted-foreground">
              ⚠️ This will notify the other party and may escalate to our dispute resolution team.
            </p>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Submitting..." : "Submit Dispute"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setNewDispute({ defendant_id: "", reason: "", description: "" });
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {disputes.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No disputes reported</p>
          </div>
        ) : (
          <div className="space-y-3">
            {disputes.map((dispute) => (
              <div
                key={dispute.id}
                className="p-4 border rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(dispute.status)}
                      <h4 className="font-semibold">{dispute.reason}</h4>
                      <Badge className={getStatusColor(dispute.status)}>
                        {dispute.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {dispute.initiator?.full_name || "Unknown"} vs{" "}
                      {dispute.defendant?.full_name || "Unknown"} •{" "}
                      {new Date(dispute.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {isEditor && (dispute.status === "open" || dispute.status === "under-review") && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleUpdateDisputeStatus(dispute.id, "under-review")
                        }
                      >
                        Review
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() =>
                          handleUpdateDisputeStatus(dispute.id, "escalated")
                        }
                      >
                        Escalate
                      </Button>
                    </div>
                  )}
                </div>

                {dispute.description && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {dispute.description}
                  </p>
                )}

                {dispute.resolution && (
                  <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm">
                    <p className="font-medium text-green-900">Resolution:</p>
                    <p className="text-green-800">{dispute.resolution}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DisputeResolution;
