"use client";

import { useState, useCallback, useMemo } from "react";
import { X, Search } from "lucide-react";
import {
  PERSONA_TEMPLATES,
  CATEGORY_LABELS,
  TEMPLATE_CATEGORIES,
  type PersonaTemplate,
} from "@/lib/persona-templates";
import { TEMPLATE_SELECTOR_TEXT } from "./constants";

/**
 * TemplateSelector Component - Phase 19.2
 *
 * Displays persona templates in a grid with filtering
 * Per R04: Memoized filtering and callbacks
 * Per R07: Strict typing
 * Per R13: All text from SSOT
 */

interface TemplateSelectorProps {
  readonly onSelect: (template: PersonaTemplate) => void;
  readonly onClose: () => void;
}

export function TemplateSelector({ onSelect, onClose }: TemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter templates based on search and category
  const filteredTemplates = useMemo(() => {
    let filtered = [...PERSONA_TEMPLATES];

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [searchQuery, selectedCategory]);

  const handleSelect = useCallback(
    (template: PersonaTemplate) => {
      onSelect(template);
      onClose();
    },
    [onSelect, onClose],
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-brand-paper rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-brand-outline">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-brand-foreground">
                {TEMPLATE_SELECTOR_TEXT.TITLE}
              </h2>
              <p className="text-semantic-muted mt-1">
                {TEMPLATE_SELECTOR_TEXT.SUBTITLE}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-semantic-muted hover:text-brand-foreground transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-brand-foreground/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={TEMPLATE_SELECTOR_TEXT.SEARCH_PLACEHOLDER}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-brand-outline bg-brand-paperElev text-brand-foreground focus:outline-none focus:ring-2 focus:ring-brand-accent"
              />
            </div>

            <select
              value={selectedCategory || ""}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="px-4 py-2 rounded-lg border border-brand-outline bg-brand-paperElev text-brand-foreground focus:outline-none focus:ring-2 focus:ring-brand-accent"
            >
              <option value="">{TEMPLATE_SELECTOR_TEXT.ALL_CATEGORIES}</option>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Template Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12 text-semantic-muted">
              {TEMPLATE_SELECTOR_TEXT.NO_RESULTS}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelect(template)}
                  className="text-left p-4 rounded-lg border border-brand-outline bg-brand-paperElev hover:border-brand-accent hover:bg-brand-accent/5 transition-all group"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-3xl">{template.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-brand-foreground group-hover:text-brand-accent transition-colors">
                        {template.name}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-brand-accent/10 text-brand-accent inline-block mt-1">
                        {CATEGORY_LABELS[template.category]}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-semantic-muted line-clamp-2">
                    {template.description}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
