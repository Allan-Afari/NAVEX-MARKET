import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText, Plus, CheckCircle2, Clock, PenLine, Eye,
  ArrowLeft, Download, Shield
} from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface Agreement {
  id: string;
  title: string;
  status: string;
  content: Record<string, string>;
  created_at: string;
  created_by: string | null;
}

interface Signature {
  id: string;
  agreement_id: string;
  signer_id: string | null;
  signer_name: string;
  signer_role: string;
  signed_at: string | null;
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  draft: { label: "Draft", icon: PenLine, color: "text-warning" },
  pending: { label: "Pending Signatures", icon: Clock, color: "text-primary" },
  signed: { label: "Fully Signed", icon: CheckCircle2, color: "text-accent" },
};

const TEMPLATES = [
  {
    name: "Equity Investment",
    category: "equity",
    fields: ["investor_name", "business_name", "investment_amount", "equity_percentage", "vesting_period", "special_terms"],
  },
  {
    name: "Loan Agreement",
    category: "loan",
    fields: ["lender_name", "borrower_name", "loan_amount", "interest_rate", "repayment_period", "collateral", "special_terms"],
  },
  {
    name: "Revenue Share",
    category: "revenue_share",
    fields: ["investor_name", "business_name", "investment_amount", "revenue_percentage", "duration", "cap_amount", "special_terms"],
  },
];

const Agreements = () => {
  const [user, setUser] = useState<User | null>(null);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [activeView, setActiveView] = useState<"list" | "create" | "detail">("list");
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [agreementTitle, setAgreementTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
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
    const fetchAgreements = async () => {
      setError(null);

      const { data: signatureData, error: signatureError } = await supabase
        .from("agreement_signatures")
        .select("agreement_id")
        .eq("signer_id", user.id);

      if (signatureError) {
        console.error("Agreement signature fetch failed:", signatureError);
        toast.error("Could not load agreements.");
        setError("Unable to load your agreements.");
        return;
      }

      const agreementIds = (signatureData || [])
        .map((item) => item.agreement_id)
        .filter(Boolean) as string[];

      let query = supabase
        .from("agreements")
        .select("*")
        .order("created_at", { ascending: false });

      if (agreementIds.length > 0) {
        query = query.or(`created_by.eq.${user.id},id.in.(${agreementIds.join(",")})`);
      } else {
        query = query.eq("created_by", user.id);
      }

      const { data, error: agreementError } = await query;
      if (agreementError) {
        console.error("Agreement load failed:", agreementError);
        toast.error("Could not load agreements.");
        setError("Unable to load your agreements.");
        return;
      }

      setAgreements(data as Agreement[] || []);
    };
    fetchAgreements();
  }, [user]);

  const openDetail = async (agreement: Agreement) => {
    setSelectedAgreement(agreement);
    setActiveView("detail");
    const { data } = await supabase
      .from("agreement_signatures")
      .select("*")
      .eq("agreement_id", agreement.id);
    if (data) setSignatures(data as Signature[]);
  };

  const handleCreate = async () => {
    if (!user) return;
    if (!agreementTitle.trim()) {
      toast.error("Please enter an agreement title.");
      return;
    }
    if (selectedTemplate === null) {
      toast.error("Please select a template.");
      return;
    }

    const template = TEMPLATES[selectedTemplate];
    const missingFields = template.fields.filter((field) => !formData[field]?.trim());

    if (missingFields.length > 0) {
      toast.error("Please fill in all required agreement fields.");
      return;
    }

    const { data, error } = await supabase
      .from("agreements")
      .insert({
        title: agreementTitle.trim(),
        content: formData,
        status: "draft",
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create agreement");
      return;
    }
    if (data) {
      // Add creator as first signer
      await supabase.from("agreement_signatures").insert({
        agreement_id: data.id,
        signer_id: user.id,
        signer_name: user.user_metadata?.full_name || user.email || "Creator",
        signer_role: "creator",
      });
      // Save version
      await supabase.from("agreement_versions").insert({
        agreement_id: data.id,
        version_number: 1,
        content: formData,
        changed_by: user.id,
      });

      toast.success("Agreement created");
      setAgreements((prev) => [data as Agreement, ...prev]);
      setActiveView("list");
      setFormData({});
      setAgreementTitle("");
      setSelectedTemplate(null);
    }
  };

  const handleSign = async () => {
    if (!selectedAgreement || !user) return;

    try {
      const existingSig = signatures.find((s) => s.signer_id === user.id);
      if (existingSig) {
        const { error: updateError } = await supabase
          .from("agreement_signatures")
          .update({ signed_at: new Date().toISOString() })
          .eq("id", existingSig.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("agreement_signatures").insert({
          agreement_id: selectedAgreement.id,
          signer_id: user.id,
          signer_name: user.user_metadata?.full_name || user.email || "Signer",
          signer_role: "party",
          signed_at: new Date().toISOString(),
        });
        if (insertError) throw insertError;
      }

      const { data: allSigs, error: allSigsError } = await supabase
        .from("agreement_signatures")
        .select("*")
        .eq("agreement_id", selectedAgreement.id);

      if (allSigsError) throw allSigsError;

      const allSigned = allSigs?.every((s) => s.signed_at);
      const newStatus = allSigned ? "signed" : "pending";
      const { error: statusError } = await supabase
        .from("agreements")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", selectedAgreement.id);

      if (statusError) throw statusError;

      const { data: refreshedAgreement, error: agreementError } = await supabase
        .from("agreements")
        .select("*")
        .eq("id", selectedAgreement.id)
        .single();

      if (agreementError) throw agreementError;

      toast.success("Agreement signed");
      if (refreshedAgreement) {
        openDetail(refreshedAgreement as Agreement);
      } else {
        openDetail(selectedAgreement);
      }
    } catch (signError) {
      console.error("Sign agreement failed:", signError);
      toast.error("Could not sign the agreement. Please try again.");
    }
  };

  const formatFieldName = (f: string) => f.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container px-4 pt-24 pb-12">
        {activeView === "list" && (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold">Agreements</h1>
                <p className="text-sm text-muted-foreground">Create, manage, and sign funding agreements</p>
              </div>
              <Button className="gradient-primary text-primary-foreground" onClick={() => setActiveView("create")}>
                <Plus className="w-4 h-4 mr-2" /> New Agreement
              </Button>
            </div>

            {agreements.length === 0 ? (
              <div className="glass rounded-xl p-12 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="font-semibold text-lg mb-1">No agreements yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Create your first agreement to get started</p>
                <Button variant="outline" onClick={() => setActiveView("create")}>Create Agreement</Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {agreements.map((a) => {
                  const sc = statusConfig[a.status] || statusConfig.draft;
                  const Icon = sc.icon;
                  return (
                    <button
                      key={a.id}
                      onClick={() => openDetail(a)}
                      className="glass rounded-xl p-5 text-left hover:bg-muted/20 transition-colors w-full"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">{a.title}</h3>
                            <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs font-medium ${sc.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                          {sc.label}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeView === "create" && (
          <>
            <Button variant="ghost" className="mb-6" onClick={() => setActiveView("list")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>

            <h1 className="text-2xl font-bold mb-6">Create Agreement</h1>

            {/* Template selection */}
            <div className="mb-6">
              <label className="text-sm font-medium text-muted-foreground mb-3 block">Choose Template</label>
              <div className="grid md:grid-cols-3 gap-4">
                {TEMPLATES.map((t, i) => (
                  <button
                    key={t.name}
                    onClick={() => { setSelectedTemplate(i); setFormData({}); }}
                    className={`glass rounded-xl p-5 text-left transition-all ${selectedTemplate === i ? "ring-2 ring-primary glow-primary" : "hover:bg-muted/20"}`}
                  >
                    <FileText className={`w-6 h-6 mb-2 ${selectedTemplate === i ? "text-primary" : "text-muted-foreground"}`} />
                    <h3 className="font-semibold text-sm">{t.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{t.fields.length} fields</p>
                  </button>
                ))}
              </div>
            </div>

            {selectedTemplate !== null && (
              <div className="glass rounded-xl p-6">
                <div className="mb-5">
                  <label className="text-sm font-medium mb-1.5 block">Agreement Title</label>
                  <Input
                    value={agreementTitle}
                    onChange={(e) => setAgreementTitle(e.target.value)}
                    placeholder="e.g., Series A Investment — Acme Corp"
                    className="bg-muted/50"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  {TEMPLATES[selectedTemplate].fields.map((field) => (
                    <div key={field}>
                      <label className="text-sm font-medium mb-1.5 block">{formatFieldName(field)}</label>
                      {field === "special_terms" ? (
                        <Textarea
                          value={formData[field] || ""}
                          onChange={(e) => setFormData((p) => ({ ...p, [field]: e.target.value }))}
                          placeholder={`Enter ${formatFieldName(field).toLowerCase()}`}
                          className="bg-muted/50"
                        />
                      ) : (
                        <Input
                          value={formData[field] || ""}
                          onChange={(e) => setFormData((p) => ({ ...p, [field]: e.target.value }))}
                          placeholder={`Enter ${formatFieldName(field).toLowerCase()}`}
                          className="bg-muted/50"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <Button className="gradient-primary text-primary-foreground" onClick={handleCreate}>
                  <Shield className="w-4 h-4 mr-2" /> Create Agreement
                </Button>
              </div>
            )}
          </>
        )}

        {activeView === "detail" && selectedAgreement && (
          <>
            <Button variant="ghost" className="mb-6" onClick={() => setActiveView("list")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>

            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold">{selectedAgreement.title}</h1>
                <div className={`flex items-center gap-1.5 text-sm mt-1 ${(statusConfig[selectedAgreement.status] || statusConfig.draft).color}`}>
                  {(() => { const Icon = (statusConfig[selectedAgreement.status] || statusConfig.draft).icon; return <Icon className="w-4 h-4" />; })()}
                  {(statusConfig[selectedAgreement.status] || statusConfig.draft).label}
                </div>
              </div>
              <div className="flex gap-2">
                {selectedAgreement.status !== "signed" && (
                  <Button className="gradient-primary text-primary-foreground" onClick={handleSign}>
                    <PenLine className="w-4 h-4 mr-2" /> Sign Agreement
                  </Button>
                )}
              </div>
            </div>

            {/* Agreement content */}
            <div className="glass rounded-xl p-6 mb-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" /> Agreement Details
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(selectedAgreement.content || {}).map(([key, value]) => (
                  <div key={key} className="bg-muted/30 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">{formatFieldName(key)}</div>
                    <div className="text-sm font-medium">{value as string || "—"}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Signatures */}
            <div className="glass rounded-xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-accent" /> Signatures
              </h3>
              {signatures.length === 0 ? (
                <p className="text-sm text-muted-foreground">No signatures yet</p>
              ) : (
                <div className="space-y-3">
                  {signatures.map((sig) => (
                    <div key={sig.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                      <div>
                        <div className="text-sm font-medium">{sig.signer_name}</div>
                        <div className="text-xs text-muted-foreground capitalize">{sig.signer_role}</div>
                      </div>
                      {sig.signed_at ? (
                        <div className="flex items-center gap-1.5 text-xs text-accent font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Signed {new Date(sig.signed_at).toLocaleDateString()}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-warning font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          Pending
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Agreements;
