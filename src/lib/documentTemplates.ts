import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: "legal" | "financial" | "technical" | "operational" | "other";
  content: string;
  file_type: string;
  tags: string[];
  created_by: string;
  created_at: string;
  is_public: boolean;
}

export interface TemplateUsage {
  id: string;
  template_id: string;
  deal_room_id: string;
  document_id: string;
  used_by: string;
  created_at: string;
}

/**
 * Get all available document templates
 */
export const getDocumentTemplates = async (
  category?: string,
  includePrivate: boolean = false
) => {
  try {
    let query = supabase
      .from("document_templates")
      .select("*")
      .eq("is_public", true);

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching document templates:", error);
    return [];
  }
};

/**
 * Create a new document template
 */
export const createDocumentTemplate = async (
  template: Omit<DocumentTemplate, "id" | "created_at">
) => {
  try {
    const { data, error } = await supabase
      .from("document_templates")
      .insert([template])
      .select()
      .single();

    if (error) throw error;
    toast.success("Template created successfully");
    return data;
  } catch (error) {
    console.error("Error creating template:", error);
    toast.error("Failed to create template");
    return null;
  }
};

/**
 * Use a template to generate a document
 */
export const useTemplate = async (
  templateId: string,
  dealRoomId: string,
  fileName: string,
  userId: string
) => {
  try {
    const { data: template, error: templateError } = await supabase
      .from("document_templates")
      .select("content, file_type")
      .eq("id", templateId)
      .single();

    if (templateError) throw templateError;

    // Convert template content to blob
    const blob = new Blob([template.content], { type: template.file_type });
    const file = new File([blob], fileName, { type: template.file_type });

    // Upload file
    const fileExt = fileName.split(".").pop();
    const storagePath = `${dealRoomId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("deal-room-documents")
      .upload(storagePath, file);

    if (uploadError) throw uploadError;

    // Record document metadata using the private storage path
    const { data: insertedDoc, error: recordError } = await supabase
      .from("deal_room_documents")
      .insert({
        deal_room_id: dealRoomId,
        uploaded_by: userId,
        file_name: fileName,
        file_url: storagePath,
        file_size: blob.size,
        file_type: template.file_type,
        category: "legal",
      })
      .select("id")
      .single();

    if (recordError) throw recordError;

    // Track template usage
    await supabase.from("template_usage").insert({
      template_id: templateId,
      deal_room_id: dealRoomId,
      document_id: insertedDoc.id,
      used_by: userId,
    });

    toast.success("Document created from template");
    return insertedDoc;
  } catch (error) {
    console.error("Error using template:", error);
    toast.error("Failed to create document from template");
    return null;
  }
};

/**
 * Get template statistics
 */
export const getTemplateStats = async () => {
  try {
    const [
      { count: templateCount },
      { count: usageCount },
      { data: topUsed },
    ] = await Promise.all([
      supabase
        .from("document_templates")
        .select("*", { count: "exact", head: true }),
      supabase.from("template_usage").select("*", { count: "exact", head: true }),
      supabase
        .from("template_usage")
        .select("template_id, count()")
        .group_by("template_id")
        .order("count", { ascending: false })
        .limit(5),
    ]);

    return {
      totalTemplates: templateCount || 0,
      totalUsages: usageCount || 0,
      topUsed: topUsed || [],
    };
  } catch (error) {
    console.error("Error fetching template stats:", error);
    return { totalTemplates: 0, totalUsages: 0, topUsed: [] };
  }
};

/**
 * Built-in default templates
 */
export const DEFAULT_TEMPLATES: Omit<DocumentTemplate, "id" | "created_at">[] = [
  {
    name: "NDA (Non-Disclosure Agreement)",
    description: "Standard mutual non-disclosure agreement",
    category: "legal",
    content: `MUTUAL NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("NDA") is entered into between the parties.

1. CONFIDENTIAL INFORMATION
The disclosing party may disclose confidential information to the receiving party.

2. OBLIGATIONS
The receiving party agrees to:
- Keep all information confidential
- Limit access to authorized personnel
- Return or destroy information upon request

3. EXCLUSIONS
This NDA does not apply to information that is:
- Publicly available
- Known prior to disclosure
- Independently developed
- Rightfully received from third parties

4. TERM
This agreement shall remain in effect for [X] years from the date of execution.`,
    file_type: "text/plain",
    tags: ["legal", "nda", "standard"],
    created_by: "system",
    is_public: true,
  },
  {
    name: "Term Sheet Template",
    description: "Venture capital term sheet template",
    category: "financial",
    content: `TERM SHEET

1. COMPANY: [Company Name]
2. INVESTMENT AMOUNT: $[Amount]
3. TYPE OF SECURITY: [Preferred Stock/SAFE]
4. VALUATION: $[Pre-Money Valuation]
5. DILUTION: [%]
6. BOARD COMPOSITION: [Details]
7. LIQUIDATION PREFERENCE: [Details]
8. ANTI-DILUTION: [Details]
9. DRAG-ALONG RIGHTS: [Yes/No]
10. INFORMATION RIGHTS: [Annual/Quarterly]
11. MANAGEMENT RIGHTS: [Details]`,
    file_type: "text/plain",
    tags: ["financial", "term-sheet", "investment"],
    created_by: "system",
    is_public: true,
  },
  {
    name: "Statement of Work (SOW)",
    description: "Service delivery statement of work",
    category: "operational",
    content: `STATEMENT OF WORK

PROJECT INFORMATION
Project Name: [Name]
Client: [Client Name]
Vendor: [Vendor Name]
Period: [Start Date] to [End Date]

SCOPE OF WORK
[Detailed description of services]

DELIVERABLES
1. [Deliverable 1]
2. [Deliverable 2]
3. [Deliverable 3]

TIMELINE
[Project schedule]

PRICING
Total Cost: $[Amount]
Payment Terms: [Terms]

TERMS AND CONDITIONS
[Standard terms and conditions]`,
    file_type: "text/plain",
    tags: ["operational", "sow", "services"],
    created_by: "system",
    is_public: true,
  },
  {
    name: "Due Diligence Checklist",
    description: "Comprehensive due diligence checklist",
    category: "technical",
    content: `DUE DILIGENCE CHECKLIST

FINANCIAL
- [ ] Last 3 years audited financials
- [ ] 5-year financial projections
- [ ] Monthly P&L for last 24 months
- [ ] Balance sheet
- [ ] Cash flow statements
- [ ] Banking relationships and facilities

LEGAL
- [ ] Certificate of incorporation
- [ ] Articles of incorporation/bylaws
- [ ] Shareholder agreements
- [ ] Contracts and agreements list
- [ ] Litigation history
- [ ] Intellectual property documentation

OPERATIONAL
- [ ] Organization chart
- [ ] Key employee agreements
- [ ] Customer concentration analysis
- [ ] Supplier relationships
- [ ] Insurance policies

TECHNOLOGY
- [ ] Technology stack documentation
- [ ] Source code review
- [ ] Security audit results
- [ ] Data protection compliance`,
    file_type: "text/plain",
    tags: ["technical", "checklist", "due-diligence"],
    created_by: "system",
    is_public: true,
  },
];
