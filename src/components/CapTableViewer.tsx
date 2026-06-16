import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCapTableEntries } from "@/lib/portfolioManagement";
import type { CapTableEntry } from "@/lib/portfolioManagement";
import { Download, Copy } from "lucide-react";
import { toast } from "sonner";

interface CapTableViewerProps {
  investmentId: string;
  readonly?: boolean;
}

export default function CapTableViewer({
  investmentId,
  readonly = true,
}: CapTableViewerProps) {
  const [capTable, setCapTable] = useState<CapTableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCapTable = async () => {
      setLoading(true);
      try {
        const entries = await getCapTableEntries(investmentId);
        setCapTable(entries);
      } catch (error) {
        console.error("Error loading cap table:", error);
        toast.error("Failed to load cap table");
      } finally {
        setLoading(false);
      }
    };

    loadCapTable();
  }, [investmentId]);

  const getTotalOwnership = () => {
    return capTable.reduce((sum, entry) => sum + (entry.ownership_percentage || 0), 0);
  };

  const getShareClassSummary = () => {
    const summary: Record<string, { shares: number; percentage: number; holders: number }> = {};
    capTable.forEach((entry) => {
      if (!summary[entry.share_class]) {
        summary[entry.share_class] = { shares: 0, percentage: 0, holders: 0 };
      }
      summary[entry.share_class].shares += entry.shares_issued;
      summary[entry.share_class].percentage += entry.ownership_percentage || 0;
      summary[entry.share_class].holders += 1;
    });
    return summary;
  };

  const handleExport = () => {
    try {
      const csv = [
        [
          "Shareholder",
          "Type",
          "Share Class",
          "Shares Issued",
          "Ownership %",
          "Voting Rights %",
          "Board Seat",
          "Anti-dilution",
          "Pro-rata Rights",
        ],
        ...capTable.map((entry) => [
          entry.shareholder_name,
          entry.shareholder_type,
          entry.share_class,
          entry.shares_issued.toString(),
          (entry.ownership_percentage || 0).toFixed(2),
          (entry.voting_rights || 0).toFixed(2),
          entry.board_seat ? "Yes" : "No",
          entry.anti_dilution ? "Yes" : "No",
          entry.pro_rata_rights ? "Yes" : "No",
        ]),
      ]
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cap-table-${investmentId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Cap table exported");
    } catch (error) {
      console.error("Error exporting cap table:", error);
      toast.error("Failed to export cap table");
    }
  };

  const handleCopyJson = () => {
    try {
      const json = JSON.stringify(capTable, null, 2);
      navigator.clipboard.writeText(json);
      toast.success("Cap table copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const shareClassSummary = getShareClassSummary();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Capitalization Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Shareholders</span>
                <span className="font-semibold">{capTable.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Shares Issued</span>
                <span className="font-semibold">
                  {capTable.reduce((sum, e) => sum + e.shares_issued, 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Ownership %</span>
                <span className="font-semibold">{getTotalOwnership().toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Share Classes</span>
                <span className="font-semibold">{Object.keys(shareClassSummary).length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Governance Rights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Board Seats</span>
                <span className="font-semibold">
                  {capTable.filter((e) => e.board_seat).length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Info Rights</span>
                <span className="font-semibold">
                  {capTable.filter((e) => e.information_rights).length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pro-rata Rights</span>
                <span className="font-semibold">
                  {capTable.filter((e) => e.pro_rata_rights).length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Anti-dilution</span>
                <span className="font-semibold">
                  {capTable.filter((e) => e.anti_dilution).length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Share Class Summary */}
      {Object.keys(shareClassSummary).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By Share Class</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(shareClassSummary).map(([shareClass, summary]) => (
                <div key={shareClass} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div>
                    <div className="text-sm font-medium">{shareClass}</div>
                    <div className="text-xs text-muted-foreground">
                      {summary.holders} holder{summary.holders !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{summary.shares.toLocaleString()} shares</div>
                    <div className="text-xs text-muted-foreground">{summary.percentage.toFixed(2)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cap Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Capital Table</CardTitle>
          <div className="flex gap-2">
            {!readonly && (
              <Button size="sm" variant="outline" onClick={handleCopyJson}>
                <Copy className="w-4 h-4 mr-1" /> JSON
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {capTable.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No cap table entries yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Shareholder</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Share Class</TableHead>
                    <TableHead className="text-xs text-right">Shares</TableHead>
                    <TableHead className="text-xs text-right">Ownership %</TableHead>
                    <TableHead className="text-xs text-center">Rights</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {capTable.map((entry) => (
                    <TableRow key={entry.id} className="border-b">
                      <TableCell className="text-sm font-medium">
                        {entry.shareholder_name}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="capitalize">
                          {entry.shareholder_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{entry.share_class}</TableCell>
                      <TableCell className="text-xs text-right">
                        {entry.shares_issued.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium">
                        {(entry.ownership_percentage || 0).toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-xs text-center">
                        <div className="flex gap-1 justify-center flex-wrap">
                          {entry.board_seat && (
                            <Badge variant="secondary" className="text-xs">
                              Board
                            </Badge>
                          )}
                          {entry.information_rights && (
                            <Badge variant="secondary" className="text-xs">
                              Info
                            </Badge>
                          )}
                          {entry.pro_rata_rights && (
                            <Badge variant="secondary" className="text-xs">
                              Pro-rata
                            </Badge>
                          )}
                          {entry.anti_dilution && (
                            <Badge variant="secondary" className="text-xs">
                              Anti-dil
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detailed View</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {capTable.map((entry) => (
              <div
                key={entry.id}
                className="border border-border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-sm">{entry.shareholder_name}</h4>
                    <p className="text-xs text-muted-foreground capitalize">
                      {entry.shareholder_type}
                    </p>
                  </div>
                  <Badge className="capitalize">{entry.share_class}</Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <div className="text-muted-foreground mb-1">Shares Issued</div>
                    <div className="font-semibold">
                      {entry.shares_issued.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Ownership</div>
                    <div className="font-semibold">
                      {(entry.ownership_percentage || 0).toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Voting Rights</div>
                    <div className="font-semibold">
                      {(entry.voting_rights || 0).toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Liquidation Pref</div>
                    <div className="font-semibold">
                      {(entry.liquidation_preference || 0).toFixed(2)}x
                    </div>
                  </div>
                </div>

                {(entry.board_seat ||
                  entry.information_rights ||
                  entry.pro_rata_rights ||
                  entry.anti_dilution) && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                    {entry.board_seat && (
                      <Badge variant="secondary" className="text-xs">
                        ✓ Board Seat
                      </Badge>
                    )}
                    {entry.information_rights && (
                      <Badge variant="secondary" className="text-xs">
                        ✓ Information Rights
                      </Badge>
                    )}
                    {entry.pro_rata_rights && (
                      <Badge variant="secondary" className="text-xs">
                        ✓ Pro-rata Rights
                      </Badge>
                    )}
                    {entry.anti_dilution && (
                      <Badge variant="secondary" className="text-xs">
                        ✓ Anti-dilution
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
