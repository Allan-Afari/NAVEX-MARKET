import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface ChatMessage {
  id: string;
  deal_room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    full_name: string;
    email: string;
  };
}

type MessageCallback = (message: ChatMessage) => void;
type TypingCallback = (data: { user_id: string; is_typing: boolean }) => void;

class RealtimeChatService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private messageCallbacks: Map<string, Set<MessageCallback>> = new Map();
  private typingCallbacks: Map<string, Set<TypingCallback>> = new Map();

  /**
   * Subscribe to deal room chat in real-time
   */
  subscribeToChat(
    dealRoomId: string,
    onMessage: MessageCallback,
    onTyping?: TypingCallback
  ) {
    // Clean up existing subscription
    this.unsubscribeFromChat(dealRoomId);

    // Register callbacks
    if (!this.messageCallbacks.has(dealRoomId)) {
      this.messageCallbacks.set(dealRoomId, new Set());
    }
    this.messageCallbacks.get(dealRoomId)!.add(onMessage);

    if (onTyping) {
      if (!this.typingCallbacks.has(dealRoomId)) {
        this.typingCallbacks.set(dealRoomId, new Set());
      }
      this.typingCallbacks.get(dealRoomId)!.add(onTyping);
    }

    // Subscribe to messages
    const messagesChannel = supabase
      .channel(`deal_room_messages:${dealRoomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "deal_room_messages",
          filter: `deal_room_id=eq.${dealRoomId}`,
        },
        (payload) => {
          const message = payload.new as ChatMessage;
          this.messageCallbacks
            .get(dealRoomId)
            ?.forEach((callback) => callback(message));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "deal_room_messages",
          filter: `deal_room_id=eq.${dealRoomId}`,
        },
        (payload) => {
          const message = payload.new as ChatMessage;
          this.messageCallbacks
            .get(dealRoomId)
            ?.forEach((callback) => callback(message));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "deal_room_messages",
          filter: `deal_room_id=eq.${dealRoomId}`,
        },
        (payload) => {
          const deleted = payload.old as ChatMessage;
          this.messageCallbacks
            .get(dealRoomId)
            ?.forEach((callback) => callback({
              ...deleted,
              content: "[deleted]",
            } as ChatMessage));
        }
      )
      .subscribe();

    // Subscribe to typing status
    if (onTyping) {
      const typingChannel = supabase
        .channel(`deal_room_typing:${dealRoomId}`)
        .on(
          "presence",
          { event: "sync" },
          () => {
            const state = typingChannel.presenceState();
            Object.values(state).forEach((users) => {
              users.forEach((user: any) => {
                if (user.is_typing) {
                  this.typingCallbacks
                    .get(dealRoomId)
                    ?.forEach((callback) =>
                      callback({ user_id: user.user_id, is_typing: true })
                    );
                }
              });
            });
          }
        )
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            const user = (await supabase.auth.getUser()).data.user;
            if (user) {
              await typingChannel.track({
                user_id: user.id,
                is_typing: false,
              });
            }
          }
        });

      this.channels.set(`typing:${dealRoomId}`, typingChannel);
    }

    this.channels.set(`messages:${dealRoomId}`, messagesChannel);
  }

  /**
   * Unsubscribe from deal room chat
   */
  unsubscribeFromChat(dealRoomId: string) {
    const messagesChannel = this.channels.get(`messages:${dealRoomId}`);
    const typingChannel = this.channels.get(`typing:${dealRoomId}`);

    if (messagesChannel) {
      messagesChannel.unsubscribe();
      this.channels.delete(`messages:${dealRoomId}`);
    }

    if (typingChannel) {
      typingChannel.unsubscribe();
      this.channels.delete(`typing:${dealRoomId}`);
    }

    this.messageCallbacks.delete(dealRoomId);
    this.typingCallbacks.delete(dealRoomId);
  }

  /**
   * Send a chat message
   */
  async sendMessage(dealRoomId: string, userId: string, content: string) {
    try {
      const { data, error } = await supabase
        .from("deal_room_messages")
        .insert({
          deal_room_id: dealRoomId,
          sender_id: userId,
          content,
        })
        .select("*, sender:sender_id(full_name, email)")
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error sending message:", error);
      return null;
    }
  }

  /**
   * Update typing status
   */
  async updateTypingStatus(dealRoomId: string, userId: string, isTyping: boolean) {
    try {
      const typingChannel = this.channels.get(`typing:${dealRoomId}`);
      if (typingChannel) {
        await typingChannel.track({
          user_id: userId,
          is_typing: isTyping,
        });
      }
    } catch (error) {
      console.error("Error updating typing status:", error);
    }
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string) {
    try {
      const { error } = await supabase
        .from("deal_room_messages")
        .update({ content: "[deleted]", deleted_at: new Date().toISOString() })
        .eq("id", messageId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error deleting message:", error);
      return false;
    }
  }

  /**
   * Load message history
   */
  async loadMessageHistory(dealRoomId: string, limit: number = 50) {
    try {
      const { data, error } = await supabase
        .from("deal_room_messages")
        .select("*, sender:sender_id(full_name, email)")
        .eq("deal_room_id", dealRoomId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error loading message history:", error);
      return [];
    }
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup() {
    this.channels.forEach((channel) => channel.unsubscribe());
    this.channels.clear();
    this.messageCallbacks.clear();
    this.typingCallbacks.clear();
  }
}

export const realtimeChatService = new RealtimeChatService();
