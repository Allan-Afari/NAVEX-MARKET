import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  importDealsFromCSV,
  exportDealsToCSV,
  downloadCSVTemplate,
  bulkUpdateDealStatus,
} from "@/lib/bulkImport";
import type { BulkImportResult } from "@/lib/bulkImport";
import type { User } from "@supabase/supabase-js";

interface BulkImportDialogProps {
  user: User;
  onImportComplete?: () => void;
}

const BulkImportDialog = ({
  user,
  onImportComplete,
}: BulkImportDialogProps) => {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    try {
      setImporting(true);
      const importResult = await importDealsFromCSV(file, user.id);
      setResult(importResult);

      if (importResult.success > 0) {
        onImportComplete?.();
      }
    } catch (error) {
      console.error("Error importing deals:", error);
      toast.error("Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    try {
      setImporting(true);
      await exportDealsToCSV(undefined, user.id);
    } catch (error) {
      console.error("Error exporting deals:", error);
      toast.error("Export failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="w-4 h-4" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import/Export Deals</DialogTitle>
          <DialogDescription>
            Import multiple deals from CSV or export your existing deals
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Import Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Import Deals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select CSV File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="w-full"
                >
                  Choose File
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => downloadCSVTemplate()}
              >
                Download Template
              </Button>

              {result && (
                <div className="space-y-3">
                  {result.success > 0 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-sm text-green-900">
                          {result.success} deals imported successfully
                        </p>
                      </div>
                    </div>
                  )}

                  {result.failed > 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="font-medium text-sm text-yellow-900 mb-2">
                        {result.failed} rows failed
                      </p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {result.errors.slice(0, 5).map((error, idx) => (
                          <p key={idx} className="text-xs text-yellow-800">
                            Row {error.row}: {error.error}
                          </p>
                        ))}
                        {result.errors.length > 5 && (
                          <p className="text-xs text-yellow-800">
                            ... and {result.errors.length - 5} more
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export Deals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleExport}
                disabled={importing}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                {importing ? "Exporting..." : "Export All Deals"}
              </Button>
            </CardContent>
          </Card>

          {/* CSV Format Help */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                CSV Format
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-3 rounded-lg text-xs font-mono overflow-x-auto">
                <pre>{`title,description,stage,industry,location,deal_type,target_raise,ask_amount
"Company A","Description","seed","Tech","SF","equity","500000","250000"
"Company B","Description","series-a","Fintech","NYC","equity","2000000","1000000"`}</pre>
              </div>
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                <p>
                  <strong>Required:</strong> title, stage, industry
                </p>
                <p>
                  <strong>Optional:</strong> description, location, deal_type,
                  target_raise, ask_amount
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkImportDialog;
