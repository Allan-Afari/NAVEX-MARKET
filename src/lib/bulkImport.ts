import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Papa from "papaparse";

export interface BulkImportResult {
  success: number;
  failed: number;
  errors: { row: number; error: string }[];
}

/**
 * Parse and validate CSV file
 */
export const parseCSVFile = (
  file: File
): Promise<{ data: any[]; error?: string }> => {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          resolve({
            data: [],
            error: `CSV parsing error: ${results.errors[0].message}`,
          });
        } else {
          resolve({ data: results.data || [] });
        }
      },
      error: (error) => {
        resolve({ data: [], error: error.message });
      },
    });
  });
};

/**
 * Validate deal data from CSV
 */
const validateDealRow = (row: any): { valid: boolean; error?: string } => {
  if (!row.title || !row.title.trim()) {
    return { valid: false, error: "Title is required" };
  }
  if (!row.stage || !row.stage.trim()) {
    return { valid: false, error: "Stage is required" };
  }
  if (!row.industry || !row.industry.trim()) {
    return { valid: false, error: "Industry is required" };
  }

  return { valid: true };
};

/**
 * Import deals from CSV
 */
export const importDealsFromCSV = async (
  file: File,
  userId: string
): Promise<BulkImportResult> => {
  try {
    const { data, error } = await parseCSVFile(file);

    if (error) {
      toast.error(error);
      return { success: 0, failed: 0, errors: [{ row: 0, error }] };
    }

    const errors: { row: number; error: string }[] = [];
    const validDeals: any[] = [];

    // Validate all rows
    data.forEach((row, index) => {
      const validation = validateDealRow(row);
      if (!validation.valid) {
        errors.push({ row: index + 2, error: validation.error || "Invalid row" });
      } else {
        validDeals.push({
          title: row.title.trim(),
          description: row.description || "",
          stage: row.stage.trim(),
          industry: row.industry.trim(),
          location: row.location || "",
          deal_type: row.deal_type || "equity",
          target_raise: row.target_raise ? parseInt(row.target_raise) : null,
          ask_amount: row.ask_amount ? parseInt(row.ask_amount) : null,
          status: "draft",
          created_by: userId,
        });
      }
    });

    if (validDeals.length === 0) {
      toast.error("No valid deals to import");
      return { success: 0, failed: errors.length, errors };
    }

    // Batch insert
    const { error: insertError } = await supabase
      .from("deals")
      .insert(validDeals);

    if (insertError) {
      toast.error(`Import failed: ${insertError.message}`);
      return { success: 0, failed: validDeals.length, errors: [{ row: 1, error: insertError.message }] };
    }

    toast.success(`Successfully imported ${validDeals.length} deals`);
    return {
      success: validDeals.length,
      failed: errors.length,
      errors,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    toast.error("Import failed: " + errorMsg);
    return { success: 0, failed: 0, errors: [{ row: 0, error: errorMsg }] };
  }
};

/**
 * Export deals to CSV
 */
export const exportDealsToCSV = async (
  dealIds?: string[],
  userId?: string
): Promise<string> => {
  try {
    let query = supabase.from("deals").select("*");

    if (dealIds && dealIds.length > 0) {
      query = query.in("id", dealIds);
    } else if (userId) {
      query = query.eq("created_by", userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Map database fields to CSV headers
    const csvData = (data || []).map((deal) => ({
      id: deal.id,
      title: deal.title,
      description: deal.description || "",
      stage: deal.stage,
      industry: deal.industry,
      location: deal.location || "",
      deal_type: deal.deal_type,
      target_raise: deal.target_raise || "",
      ask_amount: deal.ask_amount || "",
      status: deal.status,
      created_at: deal.created_at,
    }));

    // Convert to CSV
    const csv = Papa.unparse(csvData);

    // Create download link
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `deals_export_${Date.now()}.csv`);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Deals exported successfully");
    return csv;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Export failed";
    toast.error(errorMsg);
    return "";
  }
};

/**
 * Bulk update deal status
 */
export const bulkUpdateDealStatus = async (
  dealIds: string[],
  newStatus: string
): Promise<BulkImportResult> => {
  try {
    const { error } = await supabase
      .from("deals")
      .update({ status: newStatus })
      .in("id", dealIds);

    if (error) throw error;

    toast.success(`Updated ${dealIds.length} deals`);
    return {
      success: dealIds.length,
      failed: 0,
      errors: [],
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Update failed";
    toast.error(errorMsg);
    return {
      success: 0,
      failed: dealIds.length,
      errors: [{ row: 0, error: errorMsg }],
    };
  }
};

/**
 * Generate CSV template
 */
export const downloadCSVTemplate = () => {
  const template = `title,description,stage,industry,location,deal_type,target_raise,ask_amount
Example Deal,Brief description,seed,Technology,San Francisco,equity,500000,250000
Series A Company,Another example,series-a,FinTech,New York,equity,2000000,1000000
`;

  const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", "deals_import_template.csv");
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  toast.success("Template downloaded");
};

/**
 * Validate CSV headers
 */
export const validateCSVHeaders = (headers: string[]): boolean => {
  const requiredHeaders = ["title", "stage", "industry"];
  return requiredHeaders.every((header) => headers.includes(header));
};

/**
 * Get import progress
 */
export const getImportProgress = async (
  importId: string
): Promise<{ progress: number; status: string }> => {
  try {
    const { data } = await supabase
      .from("bulk_import_logs")
      .select("processed_count, total_count, status")
      .eq("id", importId)
      .single();

    if (!data) {
      return { progress: 0, status: "not_found" };
    }

    const progress = Math.round((data.processed_count / data.total_count) * 100);
    return { progress, status: data.status };
  } catch (error) {
    console.error("Error getting import progress:", error);
    return { progress: 0, status: "error" };
  }
};
