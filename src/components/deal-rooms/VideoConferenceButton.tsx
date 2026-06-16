import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { Video, ExternalLink } from "lucide-react";
import {
  launchVideoConference,
  generateConferenceRoomName,
} from "@/lib/videoConferencing";
import { logDealRoomActivity } from "@/lib/activityTracking";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";

interface VideoConferenceButtonProps {
  dealRoomId: string;
  user: User;
  dealRoomTitle?: string;
}

const VideoConferenceButton = ({
  dealRoomId,
  user,
  dealRoomTitle = "Deal Room",
}: VideoConferenceButtonProps) => {
  const [open, setOpen] = useState(false);
  const [starting, setStarting] = useState(false);

  const handleStartCall = async () => {
    try {
      setStarting(true);

      const roomName = generateConferenceRoomName(dealRoomId);

      // Log activity
      await logDealRoomActivity(user.id, {
        deal_room_id: dealRoomId,
        action: "video_conference_started",
        description: `Started video conference: ${dealRoomTitle}`,
        metadata: { room_name: roomName },
      });

      // Launch conference
      launchVideoConference({
        roomName,
        displayName: user.email || user.id,
        email: user.email,
      });

      toast.success("Video conference launched");
      setOpen(false);
    } catch (error) {
      console.error("Error starting video conference:", error);
      toast.error("Failed to start video conference");
    } finally {
      setStarting(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="default"
        className="gap-2"
        title="Start a video call with participants"
      >
        <Video className="w-4 h-4" />
        Start Call
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Start Video Conference?</AlertDialogTitle>
          <AlertDialogDescription>
            This will launch a Jitsi Meet video conference. All deal room
            participants can join using the link. The conference will be logged
            in the activity feed.
          </AlertDialogDescription>
          <div className="space-y-3 my-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  Video Conference Details
                </p>
                <p className="text-xs text-blue-800 mt-1">
                  Conference ID: {generateConferenceRoomName(dealRoomId)}
                </p>
              </div>
              <ExternalLink className="w-4 h-4 text-blue-600 flex-shrink-0 mt-1" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStartCall}
              disabled={starting}
              className="gap-2"
            >
              <Video className="w-4 h-4" />
              {starting ? "Starting..." : "Start Conference"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default VideoConferenceButton;
