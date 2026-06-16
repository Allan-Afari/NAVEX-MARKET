import { describe, expect, it } from "vitest";
import { mockSupabase } from "./mock-client";

describe("MockSupabaseClient", () => {
  it("supports functions.invoke for offline function calls", async () => {
    const response = await mockSupabase.functions.invoke("send-email-notification", {
      to_email: "test@example.com",
      type: "welcome",
    });

    expect(response).toEqual({ data: null, error: null });
  });

  it("supports basic query chaining and selected columns", async () => {
    const insertResult = await mockSupabase.from("profiles").insert({ id: "profile-1", email: "user@example.com", full_name: "Test User" }).then();
    expect(insertResult.data).toEqual({ id: "profile-1", email: "user@example.com", full_name: "Test User", created_at: expect.any(String) });

    const { data } = await mockSupabase.from("profiles").select("id, email").eq("id", "profile-1").single();
    expect(data).toEqual({ id: "profile-1", email: "user@example.com" });
  });

  it("provides a noop realtime channel and removeChannel callback", () => {
    const channel = mockSupabase.channel("notifications-1");
    const subscribed = channel.on("postgres_changes", {}, () => {}).subscribe();

    expect(subscribed).toHaveProperty("unsubscribe");
    expect(() => mockSupabase.removeChannel(subscribed)).not.toThrow();
  });
});
