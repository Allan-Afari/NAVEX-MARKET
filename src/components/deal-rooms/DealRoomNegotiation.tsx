import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Activity, ArrowUpRight, CheckCircle2, XCircle, Repeat, DollarSign } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface Negotiation {
  id: string;
  deal_room_id: string;
  proposed_by: string | null;
  parent_offer_id: string | null;
  status: string;
  amount: number;
  terms: string | null;
  created_at: string;
  updated_at: string;
}

interface DealRoomNegotiationProps {
  dealRoomId: string;
  user: User;
  ownerId: string | null;
}

const statusStyle: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-900",
  accepted: "bg-green-100 text-green-900",
  rejected: "bg-red-100 text-red-900",
  countered: "bg-blue-100 text-blue-900",
};

const DealRoomNegotiation = ({ dealRoomId, user, ownerId }: DealRoomNegotiationProps) => {
  const [offers, setOffers] = useState<Negotiation[]>([]);
  const [amount, setAmount] = useState("");
  const [terms, setTerms] = useState("");
  const [parentOfferId, setParentOfferId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOffers = useCallback(async () => {
    const { data, error } = await supabase
      .from<any>("deal_room_negotiations")
      .select("*")
      .eq("deal_room_id", dealRoomId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Could not load negotiation offers.");
      return;
    }

    setOffers(data || []);
    setLoading(false);
  }, [dealRoomId]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  const createOffer = async () => {
    if (!amount.trim()) {
      toast.error("Please enter a proposed amount.");
      return;
    }

    const notifyRoom = async (type: string, title: string, message: string) => {
      try {
        const { data: participants } = await supabase
          .from("deal_room_participants")
          .select("user_id")
          .eq("deal_room_id", dealRoomId);

        if (!participants?.length) return;
        await supabase.from("notifications").insert(
          participants.map((participant: { user_id: string }) => ({
            user_id: participant.user_id,
            type,
            title,
            message,
            deal_room_id: dealRoomId,
          }))
        );
      } catch (error) {
        console.error("Error sending negotiation notification:", error);
      }
    };

    const createActivity = async (action: string, description: string) => {
      try {
        await supabase.from("deal_room_activity").insert({
          deal_room_id: dealRoomId,
          user_id: user.id,
          action,
          description,
        });
      } catch (error) {
        console.error("Error logging negotiation activity:", error);
      }
    };

    const parsedAmount = Number(amount.replace(/[^0-9]/g, ""));
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }

    const { error } = await supabase
      .from<any>("deal_room_negotiations")
      .insert({
        deal_room_id: dealRoomId,
        proposed_by: user.id,
        parent_offer_id: parentOfferId,
        status: parentOfferId ? "countered" : "pending",
        amount: parsedAmount,
        terms: terms.trim() || null,
      });

    if (error) {
      toast.error("Failed to submit offer.");
      return;
    }

    await createActivity(
      parentOfferId ? "offer_made" : "offer_made",
      `Submitted ${parentOfferId ? "a counteroffer" : "an offer"} for GH₵${parsedAmount}`
    );
    await notifyRoom(
      "offer_status",
      "New negotiation update",
      `${user.email || user.id} submitted ${parentOfferId ? "a counteroffer" : "an offer"} for GH₵${parsedAmount}`
    );

    toast.success("Offer submitted.");
    setAmount("");
    setTerms("");
    setParentOfferId(null);
    loadOffers();
  };

  const updateOffer = async (offerId: string, status: string) => {
    const { error } = await supabase
      .from<any>("deal_room_negotiations")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", offerId);

    if (error) {
      toast.error("Unable to update offer status.");
      return;
    }

    await supabase.from("deal_room_activity").insert({
      deal_room_id: dealRoomId,
      user_id: user.id,
      action: status === "accepted" ? "offer_accepted" : "offer_rejected",
      description: `Offer ${status} by ${user.email || user.id}`,
    });

    await notifyRoom(
      "offer_status",
      `Offer ${status}`,
      `${user.email || user.id} ${status} an offer in this deal room.`
    );

    toast.success(`Offer ${status}.`);
    loadOffers();
  };

  const handleCounter = (offer: Negotiation) => {
    setParentOfferId(offer.id);
    setAmount(String(offer.amount));
    setTerms(offer.terms || "");
  };

  const isOwner = ownerId === user.id;

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <ArrowUpRight className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Negotiation & Offers</h2>
      </div>

      <div className="grid gap-4 mb-6">
        <div className="rounded-xl border border-border p-4 bg-muted/50">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <p className="text-sm font-medium">Propose a new offer</p>
              <p className="text-xs text-muted-foreground">Use this room for deal terms, amounts, and counteroffers.</p>
            </div>
            {parentOfferId && <Badge className="bg-blue-100 text-blue-900">Countering offer</Badge>}
          </div>
          <div className="grid gap-3">
            <Input
              placeholder="Proposed amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Textarea
              placeholder="Terms or message (optional)"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex flex-col md:flex-row gap-2 justify-end">
              {parentOfferId ? (
                <Button variant="outline" onClick={() => { setParentOfferId(null); setAmount(""); setTerms(""); }}>
                  Cancel Counter
                </Button>
              ) : null}
              <Button className="gradient-primary text-primary-foreground" onClick={createOffer}>
                {parentOfferId ? "Submit Counteroffer" : "Submit Offer"}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading offers…</div>
          ) : offers.length === 0 ? (
            <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">No offers yet. Start the negotiation.</div>
          ) : (
            offers.map((offer) => (
              <div key={offer.id} className="rounded-xl border border-border p-4 bg-background">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-semibold">GH₵{offer.amount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Created {new Date(offer.created_at).toLocaleString()}</p>
                  </div>
                  <Badge className={statusStyle[offer.status] || "bg-gray-100 text-gray-900"}>{offer.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-3">{offer.terms || "No terms provided."}</p>
                <div className="flex flex-wrap gap-2">
                  {isOwner && offer.status === "pending" ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => updateOffer(offer.id, "accepted")}>Accept</Button>
                      <Button size="sm" variant="outline" onClick={() => updateOffer(offer.id, "rejected")}>Reject</Button>
                    </>
                  ) : null}
                  {offer.proposed_by !== user.id && offer.status === "pending" ? (
                    <Button size="sm" variant="ghost" onClick={() => handleCounter(offer)}>
                      <Repeat className="w-4 h-4 mr-1" /> Counter
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DealRoomNegotiation;
