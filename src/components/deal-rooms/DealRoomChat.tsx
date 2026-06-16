import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { realtimeChatService, ChatMessage } from "@/lib/realtimeChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";

interface DealRoomChatProps {
  dealRoomId: string;
  user: User;
}

const DEFAULT_TYPING_TIMEOUT = 2000;

const DealRoomChat = ({ dealRoomId, user }: DealRoomChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isParticipant, setIsParticipant] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkParticipation = useCallback(async () => {
    const { data, error } = await supabase
      .from("deal_room_participants")
      .select("id")
      .eq("deal_room_id", dealRoomId)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (error) {
      toast.error("Unable to verify room access.");
      return;
    }

    setIsParticipant(!!data);
  }, [dealRoomId, user.id]);

  const loadMessages = useCallback(async () => {
    try {
      const data = await realtimeChatService.loadMessageHistory(dealRoomId, 100);
      setMessages(data || []);
    } catch (error) {
      console.error("Error loading message history:", error);
      toast.error("Failed to load chat history.");
    }
  }, [dealRoomId]);

  const handleIncomingMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const handleTypingPresence = useCallback(
    ({ user_id, is_typing }: { user_id: string; is_typing: boolean }) => {
      if (user_id === user.id) return;
      if (!is_typing) {
        setIsOtherTyping(false);
        return;
      }

      setIsOtherTyping(true);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        setIsOtherTyping(false);
      }, DEFAULT_TYPING_TIMEOUT);
    },
    [user.id]
  );

  const initializeChat = useCallback(async () => {
    setLoading(true);
    await checkParticipation();
    await loadMessages();
    setLoading(false);
  }, [checkParticipation, loadMessages]);

  useEffect(() => {
    initializeChat();
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [initializeChat]);

  useEffect(() => {
    if (!dealRoomId || !isParticipant) return;

    realtimeChatService.subscribeToChat(
      dealRoomId,
      handleIncomingMessage,
      handleTypingPresence
    );

    return () => {
      realtimeChatService.unsubscribeFromChat(dealRoomId);
    };
  }, [dealRoomId, isParticipant, handleIncomingMessage, handleTypingPresence]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const setTypingStatus = async (typing: boolean) => {
    try {
      await realtimeChatService.updateTypingStatus(dealRoomId, user.id, typing);
    } catch (error) {
      console.error("Failed to update typing status:", error);
    }
  };

  const handleTyping = async () => {
    setTypingStatus(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(async () => {
      await setTypingStatus(false);
    }, DEFAULT_TYPING_TIMEOUT);
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    try {
      const message = await realtimeChatService.sendMessage(
        dealRoomId,
        user.id,
        newMessage.trim()
      );

      if (!message) {
        toast.error("Message failed to send.");
        return;
      }

      setNewMessage("");
      await setTypingStatus(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message.");
    }
  };

  if (loading) {
    return (
      <div className="glass rounded-xl p-6 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isParticipant) {
    return (
      <div className="glass rounded-xl p-6 text-center">
        <MessageSquare className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">You must be a participant in this deal room to chat.</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Deal Room Chat</h2>
      </div>

      <div className="max-h-[320px] overflow-y-auto space-y-3 mb-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`rounded-2xl px-4 py-3 max-w-[85%] ${message.sender_id === user.id ? "ml-auto bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            <div className="flex items-center justify-between gap-2 mt-2 text-[10px] text-muted-foreground">
              <span>{message.sender?.full_name || message.sender?.email || "Anonymous"}</span>
              <span>{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {isOtherTyping && (
        <div className="text-xs text-muted-foreground mb-3">Someone is typing...</div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Write a message..."
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            handleTyping();
          }}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          className="bg-muted/50"
        />
        <Button onClick={handleSend} size="icon" className="gradient-primary text-primary-foreground">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default DealRoomChat;
