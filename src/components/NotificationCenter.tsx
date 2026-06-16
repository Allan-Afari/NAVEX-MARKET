import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, X, CheckCircle2, MessageSquare, Users, FileText, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  deal_room_id: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationCenterProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

const notificationIcons: Record<string, React.ReactNode> = {
  participant_join: <Users className="w-4 h-4 text-blue-500" />,
  document_upload: <FileText className="w-4 h-4 text-green-500" />,
  offer_status: <ArrowUpRight className="w-4 h-4 text-yellow-500" />,
  mention: <Bell className="w-4 h-4 text-red-500" />,
  message: <MessageSquare className="w-4 h-4 text-purple-500" />,
};

const NotificationCenter = ({ user, isOpen, onClose }: NotificationCenterProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  }, [user.id]);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetchNotifications().finally(() => setLoading(false));

    // Subscribe to new notifications
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, user.id, fetchNotifications]);

  const handleMarkAsRead = async (notifId: string) => {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", notifId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleClearAll = async () => {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("is_read", false);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-end">
      <div className="w-full max-w-md h-screen bg-background border-l border-border flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge className="bg-primary text-primary-foreground">{unreadCount}</Badge>
            )}
          </h2>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Bell className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                    !notif.is_read ? "bg-muted/30" : ""
                  }`}
                  onClick={() => handleMarkAsRead(notif.id)}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {notificationIcons[notif.type] || <Bell className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{notif.title}</p>
                      {notif.message && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notif.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(notif.created_at).toLocaleString()}
                      </p>
                    </div>
                    {!notif.is_read && (
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {notifications.some((n) => !n.is_read) && (
          <div className="border-t border-border p-4">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleClearAll}
            >
              Mark all as read
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
