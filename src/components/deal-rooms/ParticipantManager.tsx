import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Trash2, Shield } from "lucide-react";
import { toast } from "sonner";
import { sendDealRoomInvitationEmail } from "@/lib/emailEventTriggers";
import type { User } from "@supabase/supabase-js";

interface Participant {
  id: string;
  user_id: string;
  role: "owner" | "editor" | "viewer";
  invited_by: string | null;
  invited_at: string;
  last_accessed_at: string | null;
  profile?: any;
}

interface ParticipantManagerProps {
  dealRoomId: string;
  currentUser: User;
  isOwner: boolean;
}

const ParticipantManager = ({ dealRoomId, currentUser, isOwner }: ParticipantManagerProps) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("viewer");
  const [inviting, setInviting] = useState(false);

  const fetchParticipants = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("deal_room_participants")
        .select(`
          id,
          user_id,
          role,
          invited_by,
          invited_at,
          last_accessed_at,
          profile:profiles(full_name, email)
        `)
        .eq("deal_room_id", dealRoomId)
        .order("invited_at", { ascending: false });

      if (error) throw error;
      setParticipants((data as Participant[]) || []);
    } catch (error) {
      console.error("Error fetching participants:", error);
      toast.error("Failed to load participants");
    } finally {
      setLoading(false);
    }
  }, [dealRoomId]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  const createActivity = async (action: string, description: string, metadata: Record<string, any> = {}) => {
    try {
      await supabase.from("deal_room_activity" as any).insert({
        deal_room_id: dealRoomId,
        user_id: currentUser.id,
        action,
        description,
        metadata,
      } as any);
    } catch (error) {
      console.error("Error creating participant activity log:", error);
    }
  };

  const notifyUsers = async (userIds: string[], type: string, title: string, message: string) => {
    try {
      if (!userIds.length) return;
      await supabase.from("notifications" as any).insert(
        userIds.map((id) => ({
          user_id: id,
          type,
          title,
          message,
          deal_room_id: dealRoomId,
        })) as any[]
      );
    } catch (error) {
      console.error("Error sending participant notifications:", error);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    try {
      setInviting(true);

      // Find user by email
      const { data: userList } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", inviteEmail)
        .single();

      if (!userList) {
        toast.error("User not found");
        return;
      }

      // Check if already a participant
      const { data: existingParticipant } = await supabase
        .from("deal_room_participants")
        .select("id")
        .eq("deal_room_id", dealRoomId)
        .eq("user_id", userList.id)
        .single();

      if (existingParticipant) {
        toast.error("User is already a participant");
        return;
      }

      // Add participant
      const { error } = await supabase.from("deal_room_participants").insert({
        deal_room_id: dealRoomId,
        user_id: userList.id,
        role: inviteRole,
        invited_by: currentUser.id,
      });

      if (error) throw error;

      await createActivity(
        "participant_joined",
        `${inviteEmail} invited as ${inviteRole}`,
        { invited_user_id: userList.id }
      );
      await notifyUsers(
        [userList.id],
        "participant_join",
        "You were invited to a deal room",
        `You were invited as ${inviteRole} by ${currentUser.email || currentUser.id}`
      );
      await sendDealRoomInvitationEmail(
        inviteEmail,
        `Deal Room Invitation: ${dealRoomId}`,
        dealRoomId,
        currentUser.email || "A team member"
      ).catch((err) => {
        console.error("Failed to send invitation email:", err);
      });

      toast.success(`${inviteEmail} invited as ${inviteRole}`);
      setInviteEmail("");
      fetchParticipants();
    } catch (error) {
      console.error("Error inviting participant:", error);
      toast.error("Failed to invite participant");
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (participantId: string, participantName: string) => {
    if (!confirm(`Are you sure you want to remove ${participantName}?`)) return;

    try {
      const { error } = await supabase
        .from("deal_room_participants")
        .delete()
        .eq("id", participantId);

      if (error) throw error;

      toast.success("Participant removed");
      fetchParticipants();
    } catch (error) {
      console.error("Error removing participant:", error);
      toast.error("Failed to remove participant");
    }
  };

  const handleRoleChange = async (participantId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from("deal_room_participants")
        .update({ role: newRole })
        .eq("id", participantId);

      if (error) throw error;

      toast.success("Role updated");
      fetchParticipants();
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-100 text-purple-800";
      case "editor":
        return "bg-blue-100 text-blue-800";
      case "viewer":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Participants
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Participants ({participants.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isOwner && (
          <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Invite by email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
                onKeyPress={(e) => e.key === "Enter" && handleInvite()}
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "editor" | "viewer")}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
              <Button
                size="sm"
                onClick={handleInvite}
                disabled={inviting}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {participants.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              No participants yet
            </p>
          ) : (
            participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">
                    {participant.profile?.full_name || participant.profile?.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {participant.profile?.email}
                    {participant.last_accessed_at && (
                      <> • Last active {new Date(participant.last_accessed_at).toLocaleDateString()}</>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                  {isOwner ? (
                    <>
                      <select
                        value={participant.role}
                        onChange={(e) => handleRoleChange(participant.id, e.target.value)}
                        disabled={participant.role === "owner"}
                        className="text-xs px-2 py-1 rounded border"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                        {participant.role === "owner" && (
                          <option value="owner">Owner</option>
                        )}
                      </select>
                      {participant.role !== "owner" && (
                        <button
                          onClick={() =>
                            handleRemove(
                              participant.id,
                              participant.profile?.full_name || participant.profile?.email || "User"
                            )
                          }
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      )}
                    </>
                  ) : (
                    <Badge className={getRoleColor(participant.role)}>
                      <Shield className="w-3 h-3 mr-1" />
                      {participant.role}
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ParticipantManager;
