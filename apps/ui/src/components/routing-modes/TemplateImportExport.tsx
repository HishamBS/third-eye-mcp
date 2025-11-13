/**
 * REPAIR_PLAN A7.3: Template Import/Export Functionality
 *
 * JSON download/upload for pipeline templates
 * - Export single template as JSON
 * - Export all templates as batch
 * - Import templates from JSON file
 */

import { useRef } from "react";
import type {
  PipelineTemplate,
  CreateTemplateRequest,
} from "@/hooks/useRoutingModes";

interface TemplateImportExportProps {
  templates: PipelineTemplate[];
  onImport: (templates: CreateTemplateRequest[]) => Promise<void>;
}

export function TemplateImportExport({
  templates,
  onImport,
}: TemplateImportExportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportSingleTemplate = (template: PipelineTemplate) => {
    const exportData = {
      name: template.name,
      description: template.description,
      eyes: template.eyes,
      strict: template.strict,
      autoTriggerPattern: template.autoTriggerPattern,
      isPublic: template.isPublic,
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `template-${template.name.toLowerCase().replace(/\s+/g, "-")}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportAllTemplates = () => {
    const exportData = templates.map((template) => ({
      name: template.name,
      description: template.description,
      eyes: template.eyes,
      strict: template.strict,
      autoTriggerPattern: template.autoTriggerPattern,
      isPublic: template.isPublic,
    }));

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `third-eye-templates-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Support both single template and array of templates
      const templatesToImport: CreateTemplateRequest[] = Array.isArray(data)
        ? data
        : [data];

      // Validate structure
      for (const template of templatesToImport) {
        if (!template.name || !template.eyes || !Array.isArray(template.eyes)) {
          throw new Error("Invalid template format: missing required fields");
        }
      }

      await onImport(templatesToImport);
      alert(`Successfully imported ${templatesToImport.length} template(s)`);
    } catch (error) {
      alert(
        `Import failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex items-center space-x-3">
      <button
        onClick={exportAllTemplates}
        disabled={templates.length === 0}
        className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a 3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        <span>Export All ({templates.length})</span>
      </button>

      <button
        onClick={handleImportClick}
        className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
        <span>Import JSON</span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}

export function TemplateExportButton({
  template,
}: {
  template: PipelineTemplate;
}) {
  const exportTemplate = () => {
    const exportData = {
      name: template.name,
      description: template.description,
      eyes: template.eyes,
      strict: template.strict,
      autoTriggerPattern: template.autoTriggerPattern,
      isPublic: template.isPublic,
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `template-${template.name.toLowerCase().replace(/\s+/g, "-")}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={exportTemplate}
      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center space-x-1"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
      <span>Export</span>
    </button>
  );
}
