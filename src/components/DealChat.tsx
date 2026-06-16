import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageSquare, Lock } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { useAccessUnlock } from "@/hooks/useAccessUnlock";
import { realtimeChatService, ChatMessage } from "@/lib/realtimeChat";

type Message = ChatMessage;

interface DealChatProps {
  dealId: string;
  dealTitle: string;
  user: User;
  /** True if current user owns the opportunity (business). Owners bypass the unlock gate. */
  isOwner?: boolean;
}

const DealChat = ({ dealId, dealTitle, user, isOwner = false }: DealChatProps) => {
  const { unlocked, loading: unlockLoading, unlocking, unlock } = useAccessUnlock(dealId, user.id, isOwner);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages and subscribe to real-time deal_room_messages
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setLoading(true);
      const data = await realtimeChatService.loadMessageHistory(dealId, 200);
      if (!mounted) return;
      setMessages(data as Message[]);
      setLoading(false);
    };
    init();

    const handleIncoming = (m: Message) => setMessages((prev) => [...prev, m]);
    realtimeChatService.subscribeToChat(dealId, handleIncoming);

    return () => {
      mounted = false;
      realtimeChatService.unsubscribeFromChat(dealId);
    };
  }, [dealId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // No-op: deal-room messages use `deal_room_id` so no conversation creation required.

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    await realtimeChatService.sendMessage(dealId, user.id, newMessage.trim());
    setNewMessage("");
  };

  if (loading || unlockLoading) {
    return (
      <div className="glass rounded-xl p-6 flex items-center justify-center h-64">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Gate: investors must unlock contact before chatting
  if (!unlocked) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Lock className="w-5 h-5 text-primary" />
        </div>
        <h3 className="font-semibold text-sm mb-1">Unlock contact to start conversation</h3>
        <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
          Unlock direct access to message this business about their investment opportunity.
        </p>
        <Button className="gradient-primary text-primary-foreground" onClick={unlock} disabled={unlocking}>
          <Lock className="w-3.5 h-3.5 mr-1.5" />
          {unlocking ? "Unlocking..." : "Unlock Contact (Free)"}
        </Button>
        <p className="text-[10px] text-muted-foreground mt-3">MVP: free unlock. Paid tiers coming soon.</p>
      </div>
    );
  }

  // Messages will be displayed even if none exist yet.

  return (
    <div className="glass rounded-xl overflow-hidden flex flex-col" style={{ height: "400px" }}>
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-semibold">Deal Conversation</h3>
        <p className="text-xs text-muted-foreground">{messages.length} messages</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">No messages yet. Say hello!</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender_id === user.id ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
              msg.sender_id === user.id
                ? "gradient-primary text-primary-foreground"
                : "bg-muted text-foreground"
            }`}>
              {msg.sender_id !== user.id && profiles[msg.sender_id!] && (
                <p className="text-[10px] font-semibold mb-0.5 opacity-70">
                  {profiles[msg.sender_id!].full_name || "User"}
                </p>
              )}
              <p>{msg.content}</p>
              <p className={`text-[10px] mt-1 ${msg.sender_id === user.id ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            className="bg-muted/50"
          />
          <Button size="icon" className="gradient-primary text-primary-foreground" onClick={handleSend}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DealChat;
