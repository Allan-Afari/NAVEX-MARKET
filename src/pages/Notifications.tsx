import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle2, Clock, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import SEOHead from "@/components/SEOHead";
import { toast } from "sonner";

interface NotificationRecord {
  id: string;
  title: string;
  body: string | null;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const typeLabel = (type: string) => {
  switch (type) {
    case "deal_interest":
      return "Deal interest";
    case "message":
      return "Message";
    case "opportunity_alert":
      return "Opportunity alert";
    case "verification":
      return "Verification";
    case "agreement":
      return "Agreement";
    default:
      return "General";
  }
};

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useSession();

  const userId = user?.id;
  const { data: notifications = [], isLoading, refetch } = useQuery<NotificationRecord[]>({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, body, type, link, is_read, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as NotificationRecord[]) || [];
    },
    enabled: Boolean(userId),
  });

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  );

  const markAllRead = async () => {
    if (!userId) return;
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    if (error) {
      toast.error("Unable to mark all notifications as read.");
      return;
    }
    refetch();
    toast.success("All notifications marked read.");
  };

  const handleOpen = async (notif: NotificationRecord) => {
    if (!notif.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", notif.id);
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Notifications | Navex Market" description="Your notification inbox for account, deal, and message alerts." />
      <Navbar />
      <main className="container mx-auto px-4 py-24">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Bell className="w-7 h-7 text-primary" /> Notifications
            </h1>
            <p className="text-muted-foreground mt-1">A central inbox for all alerts, messages, and deal updates.</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" onClick={() => navigate("/profile")}>Back to profile</Button>
            <Button onClick={markAllRead} disabled={isLoading || unreadCount === 0}>
              Mark all read
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {isLoading ? (
            [...Array(4)].map((item) => (
              <Card key={item} className="animate-pulse p-6">
                <div className="h-6 w-32 bg-muted rounded mb-4" />
                <div className="h-4 w-full bg-muted rounded mb-2" />
                <div className="h-4 w-5/6 bg-muted rounded" />
              </Card>
            ))
          ) : notifications.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle2 className="mx-auto mb-4 w-12 h-12 text-muted-foreground" />
              <p className="text-lg font-semibold">No notifications yet</p>
              <p className="text-sm text-muted-foreground mt-2">Your inbox will show alerts and updates once you start using Navex Market.</p>
            </Card>
          ) : (
            notifications.map((notif) => (
              <Card key={notif.id} className={`${notif.is_read ? "border-border" : "border-primary/30 bg-primary/5"} border`}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">{notif.title}</p>
                      <p className="text-xs text-muted-foreground">{typeLabel(notif.type)}</p>
                    </div>
                    <Badge variant={notif.is_read ? "secondary" : "destructive"}>
                      {notif.is_read ? "Read" : "Unread"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {notif.body && <p className="text-sm text-muted-foreground">{notif.body}</p>}
                    <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
                      <span>{formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}</span>
                      <Button variant="ghost" size="sm" onClick={() => handleOpen(notif)}>
                        Open
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default Notifications;
