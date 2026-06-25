import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface RealtimeNotification {
  id: string;
  type: "deal_room_invite" | "document_upload" | "message" | "agreement" | "dispute";
  title: string;
  message: string;
  related_id?: string;
  created_at: string;
  read: boolean;
}

class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private listeners: Map<string, Set<(payload: any) => void>> = new Map();

  /**
   * Subscribe to deal room updates
   */
  subscribeToDealRoom(dealRoomId: string, callback: (payload: any) => void) {
    const channelName = `deal_room:${dealRoomId}`;
    
    if (this.channels.has(channelName)) {
      this.unsubscribeFromDealRoom(dealRoomId);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deal_room_messages",
          filter: `deal_room_id=eq.${dealRoomId}`,
        },
        (payload) => callback(payload)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deal_room_documents",
          filter: `deal_room_id=eq.${dealRoomId}`,
        },
        (payload) => callback(payload)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deal_room_participants",
          filter: `deal_room_id=eq.${dealRoomId}`,
        },
        (payload) => callback(payload)
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`Subscribed to deal room ${dealRoomId}`);
        }
      });

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Subscribe to user notifications
   */
  subscribeToNotifications(userId: string, callback: (payload: any) => void) {
    const channelName = `notifications:${userId}`;
    
    if (this.channels.has(channelName)) {
      this.unsubscribeFromNotifications(userId);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => callback(payload)
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`Subscribed to notifications for user ${userId}`);
        }
      });

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Subscribe to deal updates
   */
  subscribeToDeal(dealId: string, callback: (payload: any) => void) {
    const channelName = `deal:${dealId}`;
    
    if (this.channels.has(channelName)) {
      this.unsubscribeFromDeal(dealId);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deals",
          filter: `id=eq.${dealId}`,
        },
        (payload) => callback(payload)
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`Subscribed to deal ${dealId}`);
        }
      });

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Unsubscribe from deal room
   */
  unsubscribeFromDealRoom(dealRoomId: string) {
    const channelName = `deal_room:${dealRoomId}`;
    const channel = this.channels.get(channelName);
    
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  /**
   * Unsubscribe from notifications
   */
  unsubscribeFromNotifications(userId: string) {
    const channelName = `notifications:${userId}`;
    const channel = this.channels.get(channelName);
    
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  /**
   * Unsubscribe from deal
   */
  unsubscribeFromDeal(dealId: string) {
    const channelName = `deal:${dealId}`;
    const channel = this.channels.get(channelName);
    
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll() {
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
  }
}

export const realtimeService = new RealtimeService();
