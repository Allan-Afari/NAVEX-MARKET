import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Eye,
  MoreVertical,
  Copy,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { logDealRoomActivity } from "@/lib/activityTracking";
import { sendNegotiationTermEmail } from "@/lib/emailEventTriggers";
import type { User } from "@supabase/supabase-js";

interface NegotiationTerm {
  id: string;
  deal_room_id: string;
  version: number;
  title: string;
  terms: Record<string, any>;
  proposed_by: string;
  status: "proposed" | "accepted" | "rejected" | "counter-offered";
  created_at: string;
  updated_at: string;
  proposer?: {
    full_name: string;
    email: string;
  };
}

interface DealNegotiationProps {
  dealRoomId: string;
  user: User;
  isEditor: boolean;
}

export const DealNegotiation = ({ dealRoomId, user, isEditor }: DealNegotiationProps) => {
  const [terms, setTerms] = useState<NegotiationTerm[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newTerm, setNewTerm] = useState({
    title: "",
    terms: "" as string | Record<string, any>,
  });

  useEffect(() => {
    fetchTerms();
  }, [fetchTerms]);

  const fetchTerms = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("deal_negotiation_terms")
        .select("*, proposer:proposed_by(full_name, email)")
        .eq("deal_room_id", dealRoomId)
        .order("version", { ascending: false });

      if (error) throw error;
      setTerms(data || []);
    } catch (error) {
      console.error("Error fetching negotiation terms:", error);
      toast.error("Failed to load negotiation terms");
    } finally {
      setLoading(false);
    }
  }, [dealRoomId]);

  const handleProposeTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerm.title.trim()) {
      toast.error("Please enter a term title");
      return;
    }

    try {
      setLoading(true);

      // Get the next version number
      const maxVersion = terms.length > 0 ? Math.max(...terms.map((t) => t.version)) : 0;

      const termsObject =
        typeof newTerm.terms === "string"
          ? JSON.parse(newTerm.terms || "{}")
          : newTerm.terms;

      const { error } = await supabase.from("deal_negotiation_terms").insert({
        deal_room_id: dealRoomId,
        version: maxVersion + 1,
        title: newTerm.title,
        terms: termsObject,
        proposed_by: user.id,
        status: "proposed",
      });

      if (error) throw error;

      // Log activity
      await logDealRoomActivity(user.id, {
        deal_room_id: dealRoomId,
        action: "term_proposed",
        description: `Proposed term: ${newTerm.title}`,
        metadata: { term_title: newTerm.title, version: maxVersion + 1 },
      });

      // Get deal room title
      const { data: roomData } = await supabase
        .from("deal_rooms")
        .select("title")
        .eq("id", dealRoomId)
        .single();

      // Get other participants and send email notifications
      const { data: participants } = await supabase
        .from("deal_room_participants")
        .select("user_id")
        .eq("deal_room_id", dealRoomId);

      if (participants && participants.length > 0) {
        const otherParticipantIds = participants
          .map((p: any) => p.user_id)
          .filter((id: string) => id !== user.id);

        if (otherParticipantIds.length > 0) {
          const { data: participantProfiles } = await supabase
            .from("profiles")
            .select("email")
            .in("id", otherParticipantIds);

          if (participantProfiles && participantProfiles.length > 0) {
            const emails = participantProfiles.map((p: any) => p.email).filter(Boolean);
            
            for (const email of emails) {
              await sendNegotiationTermEmail(
                email,
                roomData?.title || "Deal Room",
                newTerm.title,
                user.email || user.id,
                dealRoomId
              ).catch(() => null); // Don't fail if email fails
            }
          }
        }
      }

      toast.success("Term proposed successfully");
      setNewTerm({ title: "", terms: {} });
      setShowForm(false);
      await fetchTerms();
    } catch (error) {
      console.error("Error proposing term:", error);
      toast.error("Failed to propose term");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (
    termId: string,
    newStatus: "accepted" | "rejected" | "counter-offered"
  ) => {
    try {
      const { error } = await supabase
        .from("deal_negotiation_terms")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", termId);

      if (error) throw error;

      await logDealRoomActivity(user.id, {
        deal_room_id: dealRoomId,
        action: "term_status_updated",
        description: `Term status changed to ${newStatus}`,
        metadata: { term_id: termId, new_status: newStatus },
      });

      toast.success(`Term marked as ${newStatus}`);
      await fetchTerms();
    } catch (error) {
      console.error("Error updating term status:", error);
      toast.error("Failed to update term");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "rejected":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case "counter-offered":
        return <Clock className="w-4 h-4 text-orange-600" />;
      default:
        return <Clock className="w-4 h-4 text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "counter-offered":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          Negotiation Terms
        </CardTitle>
        {isEditor && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(!showForm)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Propose Term
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && isEditor && (
          <form onSubmit={handleProposeTerm} className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <Input
              placeholder="Term title (e.g., 'Equity Distribution')"
              value={newTerm.title}
              onChange={(e) => setNewTerm({ ...newTerm, title: e.target.value })}
            />
            <Textarea
              placeholder='Term details as JSON (e.g., {"equity": "25%", "vesting": "4 years"})'
              value={typeof newTerm.terms === "string" ? newTerm.terms : JSON.stringify(newTerm.terms)}
              onChange={(e) => setNewTerm({ ...newTerm, terms: e.target.value })}
              rows={4}
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? "Proposing..." : "Propose"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setNewTerm({ title: "", terms: {} });
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {terms.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No negotiation terms yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {terms.map((term) => (
              <div
                key={term.id}
                className="p-4 border rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(term.status)}
                      <h4 className="font-semibold">{term.title}</h4>
                      <Badge className={getStatusColor(term.status)}>
                        v{term.version} - {term.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Proposed by {term.proposer?.full_name || "Unknown"} on{" "}
                      {new Date(term.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {isEditor && term.status === "proposed" && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUpdateStatus(term.id, "accepted")}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUpdateStatus(term.id, "counter-offered")}
                      >
                        Counter
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() => handleUpdateStatus(term.id, "rejected")}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>

                {Object.keys(term.terms).length > 0 && (
                  <div className="mt-3 p-2 bg-muted rounded text-sm">
                    <pre className="whitespace-pre-wrap break-words">
                      {JSON.stringify(term.terms, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DealNegotiation;
