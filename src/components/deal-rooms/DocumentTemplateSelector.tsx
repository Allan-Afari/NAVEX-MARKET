import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Plus, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import {
  getDocumentTemplates,
  useTemplate as createDocumentFromTemplate,
  DEFAULT_TEMPLATES,
} from "@/lib/documentTemplates";
import type { User } from "@supabase/supabase-js";

interface DocumentTemplateSelectorProps {
  dealRoomId: string;
  user: User;
  onDocumentCreated?: () => void;
}

const DocumentTemplateSelector = ({
  dealRoomId,
  user,
  onDocumentCreated,
}: DocumentTemplateSelectorProps) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("legal");
  const [loading, setLoading] = useState(false);
  const [using, setUsing] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getDocumentTemplates(selectedCategory);
      setTemplates(data);
    } catch (error) {
      console.error("Error loading templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  const handleUseTemplate = async (template: any) => {
    try {
      setUsing(template.id);
      const fileName = `${template.name.replace(/\s+/g, "_")}_${Date.now()}.txt`;

      const result = await createDocumentFromTemplate(
        template.id,
        dealRoomId,
        fileName,
        user.id
      );

      if (result) {
        onDocumentCreated?.();
      }
    } catch (error) {
      console.error("Error using template:", error);
      toast.error("Failed to create document from template");
    } finally {
      setUsing(null);
    }
  };

  const categories = ["legal", "financial", "technical", "operational"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Document Templates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading templates...</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No templates found</p>
          ) : (
            templates.map((template) => (
              <div
                key={template.id}
                className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <p className="font-medium text-sm truncate">{template.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {template.description}
                  </p>
                  {template.tags && template.tags.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {template.tags.slice(0, 2).map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => handleUseTemplate(template)}
                  disabled={using === template.id}
                  className="ml-2 flex-shrink-0"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {using === template.id ? "Creating..." : "Use"}
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentTemplateSelector;
