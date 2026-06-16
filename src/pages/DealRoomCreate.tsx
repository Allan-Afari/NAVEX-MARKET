import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, FilePlus, ShieldCheck } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { checkComplianceOnDealRoomCreate } from "@/lib/complianceWorkflow";
import { logDealRoomActivity } from "@/lib/activityTracking";

interface DealOption {
  id: string;
  title: string;
}

const generateAccessCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const DealRoomCreate = () => {
  const { user, loading } = useSession();
  const [deals, setDeals] = useState<DealOption[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dealId, setDealId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchDeals = async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, title")
        .eq("created_by", user.id)
        .eq("is_removed", false)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Unable to load your deals.");
        return;
      }

      setDeals(data || []);
      if (data && data.length > 0) {
        setDealId(data[0].id);
      }
    };

    fetchDeals();
  }, [user]);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Room title is required.");
      return;
    }

    if (!dealId) {
      toast.error("Please attach the room to one of your deals.");
      return;
    }

    if (!user) {
      navigate("/login");
      return;
    }

    setCreating(true);

    try {
      // Perform compliance checks before creating deal room
      const complianceResult = await checkComplianceOnDealRoomCreate(user.id, "", dealId);
      
      if (complianceResult && !complianceResult.passed && complianceResult.riskScore >= 75) {
        // High-risk deal - show warning but allow creation
        const confirmed = window.confirm(
          `This deal has been flagged for compliance review (Risk Score: ${complianceResult.riskScore}/100).\n\nReasons:\n${complianceResult.recommendations.join('\n')}\n\nDo you want to continue?`
        );
        
        if (!confirmed) {
          setCreating(false);
          return;
        }
      } else if (complianceResult?.recommendations.length > 0) {
        // Show informational warnings
        complianceResult.recommendations.forEach(rec => {
          toast.warning(rec);
        });
      }

      const code = accessCode.trim() || generateAccessCode();
      const payload = {
        deal_id: dealId,
        created_by: user.id,
        title: title.trim(),
        description: description.trim() || null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        access_code: code,
      };

      const { data, error } = await supabase
        .from("deal_rooms")
        .insert(payload)
        .select()
        .single();

      if (error || !data) {
        throw error || new Error("Failed to create deal room.");
      }

      // Re-run compliance check with actual deal room ID
      await checkComplianceOnDealRoomCreate(user.id, data.id, dealId).catch(() => null);

      // Log deal room creation activity
      await logDealRoomActivity(user.id, {
        deal_room_id: data.id,
        action: "deal_room_created",
        description: `Created deal room: ${title}`,
        metadata: {
          deal_id: dealId,
          access_code: code,
          compliance_risk_score: complianceResult.riskScore,
        },
      });

      const { error: participantError } = await supabase.from("deal_room_participants").insert({
        deal_room_id: data.id,
        user_id: user.id,
        role: "owner",
        invited_by: user.id,
      });

      if (participantError) {
        throw participantError;
      }

      toast.success("Deal room created successfully.");
      navigate(`/deal-room/${data.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Could not create the deal room. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-10 h-10 rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Create Deal Room" description="Create a secure deal room for virtual due diligence." />
      <Navbar />
      <div className="container px-4 pt-24 pb-12">
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Create Deal Room</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Spin up a secure collaboration workspace for one of your opportunities and invite stakeholders with granular permissions.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/deal-rooms")}>Back to Deal Rooms</Button>
        </div>

        {!deals.length ? (
          <div className="glass rounded-xl p-8 text-center">
            <ShieldCheck className="w-10 h-10 mx-auto text-primary mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              You need at least one active deal to attach a deal room. Post an opportunity first, then return to set up the workspace.
            </p>
            <Button className="gradient-primary text-primary-foreground" onClick={() => navigate("/marketplace")}>Browse Marketplace</Button>
          </div>
        ) : (
          <div className="grid gap-6 max-w-3xl">
            <div className="glass rounded-xl p-6 space-y-4">
              <div>
                <label className="text-sm font-medium">Deal Room Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Example: Q2 Funding Data Room" />
              </div>

              <div>
                <label className="text-sm font-medium">Linked Deal</label>
                <select
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={dealId}
                  onChange={(e) => setDealId(e.target.value)}
                >
                  {deals.map((deal) => (
                    <option key={deal.id} value={deal.id}>{deal.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of the collaboration area" className="min-h-[120px]" />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Expires At</label>
                  <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Access Code</label>
                  <Input value={accessCode} onChange={(e) => setAccessCode(e.target.value)} placeholder="Optional custom code" />
                  <p className="text-xs text-muted-foreground mt-1">Leave blank to generate a secure share code automatically.</p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button className="gradient-primary text-primary-foreground" onClick={handleCreate} disabled={creating}>
                  {creating ? "Creating..." : "Create Deal Room"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DealRoomCreate;
