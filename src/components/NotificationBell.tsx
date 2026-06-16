import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Bell, MessageSquare, TrendingUp, Info, Users, FileText } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  deal_room_id: string | null;
  is_read: boolean;
  created_at: string;
}

const typeIcon = (type: string) => {
  switch (type) {
    case "document_upload":
      return <TrendingUp className="w-4 h-4 text-primary shrink-0" />;
    case "message":
      return <MessageSquare className="w-4 h-4 text-accent shrink-0" />;
    case "offer_status":
      return <TrendingUp className="w-4 h-4 text-warning shrink-0" />;
    case "participant_join":
      return <Users className="w-4 h-4 text-blue-500 shrink-0" />;
    case "mention":
      return <Info className="w-4 h-4 text-red-500 shrink-0" />;
    default:
      return <Info className="w-4 h-4 text-muted-foreground shrink-0" />;
  }
};

const NotificationBell = ({ userId }: { userId: string }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const queryBuilder = supabase.from("notifications").select("*");
        if (!queryBuilder || typeof queryBuilder.eq !== "function" || typeof queryBuilder.order !== "function" || typeof queryBuilder.limit !== "function") {
          console.warn("Supabase query chaining unavailable for notifications.");
          return;
        }

        const { data } = await queryBuilder
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20);
        if (data) setNotifications(data);
      } catch (error) {
        console.error("Unable to load notifications:", error);
      }
    };

    fetchNotifications();

    const channelName = `notifications-${userId}-${Math.random().toString(36).slice(2)}`;
    let channel: any = null;

    if (typeof supabase.channel === "function") {
      channel = supabase.channel(channelName);
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 30));
        }
      );
      channel.subscribe();
    } else {
      console.warn("Realtime notifications are unavailable in this environment.");
    }

    return () => {
      if (channel && typeof supabase.removeChannel === "function") {
        supabase.removeChannel(channel);
      }
    };
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleClick = async (notif: Notification) => {
    if (!notif.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
    }
    if (notif.deal_room_id) {
      setOpen(false);
      navigate(`/deal-rooms/${notif.deal_room_id}`);
    }
  };

  const markAllRead = async () => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h4 className="text-sm font-semibold">Notifications</h4>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                Mark all read
              </button>
            )}
            <button
              onClick={() => { setOpen(false); navigate("/settings/notifications"); }}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Settings
            </button>
          </div>
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((notif) => (
              <button
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors border-b border-border/50 ${
                  !notif.is_read ? "bg-primary/5" : ""
                }`}
              >
                <div className="mt-0.5">{typeIcon(notif.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-tight ${!notif.is_read ? "font-semibold" : ""}`}>
                    {notif.title}
                  </p>
                  {notif.message && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {notif.message}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!notif.is_read && (
                  <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                )}
              </button>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
