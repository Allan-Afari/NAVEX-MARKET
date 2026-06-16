import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Plus, Search, ArrowLeft, ExternalLink } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface Conversation {
  id: string;
  title: string | null;
  deal_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string;
  file_url: string | null;
  file_name: string | null;
  is_read: boolean;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string | null;
}

const Messages = () => {
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvo, setActiveConvo] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewConvo, setShowNewConvo] = useState(false);
  const [newConvoTitle, setNewConvoTitle] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return navigate("/login");
      setUser(session.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/login");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchConvos = async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false });
      if (data) setConversations(data);
    };
    fetchConvos();
  }, [user]);

  useEffect(() => {
    if (!activeConvo) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConvo)
        .order("created_at", { ascending: true });
      if (data) {
        setMessages(data);
        const senderIds = [...new Set(data.map((m) => m.sender_id).filter(Boolean))] as string[];
        if (senderIds.length > 0) {
          const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", senderIds);
          if (profs) {
            const map: Record<string, Profile> = {};
            profs.forEach((p) => (map[p.id] = p));
            setProfiles((prev) => ({ ...prev, ...map }));
          }
        }
      }
    };
    fetchMessages();

    const channel = supabase
      .channel(`messages-${activeConvo}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${activeConvo}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConvo]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !activeConvo || !user) return;
    await supabase.from("messages").insert({
      conversation_id: activeConvo,
      sender_id: user.id,
      content: newMessage.trim(),
    });
    setNewMessage("");
  };

  const handleCreateConvo = async () => {
    if (!newConvoTitle.trim() || !user) return;
    const { data } = await supabase
      .from("conversations")
      .insert({ title: newConvoTitle.trim(), created_by: user.id })
      .select()
      .single();
    if (data) {
      await supabase.from("conversation_participants").insert({
        conversation_id: data.id,
        user_id: user.id,
      });
      setConversations((prev) => [data, ...prev]);
      setActiveConvo(data.id);
      setShowNewConvo(false);
      setNewConvoTitle("");
    }
  };

  const filteredConvos = conversations.filter(
    (c) => !searchQuery || c.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeConversation = conversations.find((c) => c.id === activeConvo);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container px-4 pt-24 pb-12">
        <div className="glass rounded-xl overflow-hidden" style={{ height: "calc(100vh - 120px)" }}>
          <div className="flex h-full">
            {/* Sidebar */}
            <div className={`w-full md:w-80 border-r border-border flex-shrink-0 flex flex-col ${activeConvo ? "hidden md:flex" : "flex"}`}>
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold">Messages</h2>
                  <Button size="icon" variant="ghost" onClick={() => setShowNewConvo(true)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    className="pl-9 bg-muted/50 border-border"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {showNewConvo && (
                <div className="p-3 border-b border-border bg-muted/30">
                  <Input
                    placeholder="Conversation title..."
                    value={newConvoTitle}
                    onChange={(e) => setNewConvoTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateConvo()}
                    className="mb-2 bg-muted/50"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="gradient-primary text-primary-foreground" onClick={handleCreateConvo}>Create</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowNewConvo(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto">
                {filteredConvos.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No conversations yet
                  </div>
                ) : (
                  filteredConvos.map((convo) => (
                    <button
                      key={convo.id}
                      onClick={() => setActiveConvo(convo.id)}
                      className={`w-full text-left p-4 border-b border-border/50 hover:bg-muted/30 transition-colors ${activeConvo === convo.id ? "bg-primary/10 border-l-2 border-l-primary" : ""}`}
                    >
                      <div className="font-medium text-sm truncate">{convo.title || "Untitled"}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {convo.deal_id && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Deal</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(convo.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className={`flex-1 flex flex-col ${!activeConvo ? "hidden md:flex" : "flex"}`}>
              {activeConvo ? (
                <>
                  <div className="p-4 border-b border-border flex items-center gap-3">
                    <Button size="icon" variant="ghost" className="md:hidden" onClick={() => setActiveConvo(null)}>
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{activeConversation?.title || "Untitled"}</h3>
                      {activeConversation?.deal_id ? (
                        <Link
                          to={`/deals/${activeConversation.deal_id}`}
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          View linked deal <ExternalLink className="w-3 h-3" />
                        </Link>
                      ) : (
                        <p className="text-xs text-muted-foreground">Direct conversation</p>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                          msg.sender_id === user?.id
                            ? "gradient-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}>
                          {msg.sender_id !== user?.id && msg.sender_id && profiles[msg.sender_id] && (
                            <p className="text-[10px] font-semibold mb-0.5 opacity-70">
                              {profiles[msg.sender_id].full_name || "User"}
                            </p>
                          )}
                          <p>{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${msg.sender_id === user?.id ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-4 border-t border-border">
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
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center p-8">
                  <div>
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                    <h3 className="font-semibold text-lg mb-1">Your Messages</h3>
                    <p className="text-sm text-muted-foreground">Select a conversation or start a new one</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
