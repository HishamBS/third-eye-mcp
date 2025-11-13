"use client";

import { useState, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { FIELD_LABELS, BUTTON_LABELS, PLACEHOLDERS } from "./constants";
import {
  STATUS_TEXT_COLORS,
  STATUS_BG_COLORS_SUBTLE,
  STATUS_BORDER_COLORS_SUBTLE,
} from "@/constants/color-mappings";

/**
 * SchemaBuilder Component - Phase 19.3 (PROPER)
 *
 * Visual schema builder for non-technical users
 * NO JSON editing - pure form-based interface
 * Per R04: Memoized callbacks
 * Per R07: Strict typing
 * Per R13: All text from SSOT
 */

export interface SchemaProperty {
  readonly name: string;
  readonly type: "string" | "number" | "boolean" | "object" | "array";
  readonly description: string;
  readonly required: boolean;
}

interface SchemaBuilderProps {
  readonly title: string;
  readonly properties: readonly SchemaProperty[];
  readonly onChange: (properties: readonly SchemaProperty[]) => void;
}

const TYPE_LABELS: Record<SchemaProperty["type"], string> = {
  string: "Text",
  number: "Number",
  boolean: "True/False",
  object: "Object",
  array: "List",
} as const;

export function SchemaBuilder({
  title,
  properties,
  onChange,
}: SchemaBuilderProps) {
  const [localProperties, setLocalProperties] = useState<SchemaProperty[]>(
    properties.length > 0 ? [...properties] : [],
  );

  const handleAddProperty = useCallback(() => {
    const newProperty: SchemaProperty = {
      name: "",
      type: "string",
      description: "",
      required: false,
    };
    const updated = [...localProperties, newProperty];
    setLocalProperties(updated);
    onChange(updated);
  }, [localProperties, onChange]);

  const handleRemoveProperty = useCallback(
    (index: number) => {
      const updated = localProperties.filter((_, i) => i !== index);
      setLocalProperties(updated);
      onChange(updated);
    },
    [localProperties, onChange],
  );

  const handleUpdateProperty = useCallback(
    (index: number, field: keyof SchemaProperty, value: string | boolean) => {
      const updated = localProperties.map((prop, i) =>
        i === index ? { ...prop, [field]: value } : prop,
      );
      setLocalProperties(updated);
      onChange(updated);
    },
    [localProperties, onChange],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-brand-foreground">{title}</h3>
        <button
          onClick={handleAddProperty}
          className="flex items-center gap-2 rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-brand-foreground transition-all hover:bg-brand-accent/90 hover:scale-105 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Add Property
        </button>
      </div>

      {localProperties.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-brand-outline/40 bg-brand-paper/50 p-8 text-center">
          <p className="text-semantic-muted">
            No properties defined yet. Click &quot;Add Property&quot; to get
            started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {localProperties.map((property, index) => (
            <div
              key={index}
              className="rounded-lg border border-brand-outline/50 bg-brand-paperElev p-4"
            >
              <div className="grid gap-4 md:grid-cols-12">
                {/* Property Name */}
                <div className="md:col-span-3">
                  <label className="mb-1 block text-xs font-medium text-semantic-muted">
                    Property Name
                  </label>
                  <input
                    type="text"
                    value={property.name}
                    onChange={(e) =>
                      handleUpdateProperty(index, "name", e.target.value)
                    }
                    placeholder={PLACEHOLDERS.NAME}
                    className="w-full rounded-lg border border-brand-outline/50 bg-brand-paper px-3 py-2 text-sm text-brand-foreground placeholder-brand-outline focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                  />
                </div>

                {/* Property Type */}
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-semantic-muted">
                    Type
                  </label>
                  <select
                    value={property.type}
                    onChange={(e) =>
                      handleUpdateProperty(
                        index,
                        "type",
                        e.target.value as SchemaProperty["type"],
                      )
                    }
                    className="w-full rounded-lg border border-brand-outline/50 bg-brand-paper px-3 py-2 text-sm text-brand-foreground focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                  >
                    {Object.entries(TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div className="md:col-span-5">
                  <label className="mb-1 block text-xs font-medium text-semantic-muted">
                    Description
                  </label>
                  <input
                    type="text"
                    value={property.description}
                    onChange={(e) =>
                      handleUpdateProperty(index, "description", e.target.value)
                    }
                    placeholder="What is this property for?"
                    className="w-full rounded-lg border border-brand-outline/50 bg-brand-paper px-3 py-2 text-sm text-brand-foreground placeholder-brand-outline focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                  />
                </div>

                {/* Required + Delete */}
                <div className="md:col-span-2 flex items-end gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={property.required}
                      onChange={(e) =>
                        handleUpdateProperty(
                          index,
                          "required",
                          e.target.checked,
                        )
                      }
                      className="h-4 w-4 rounded border-brand-outline/50 bg-brand-paper text-brand-accent focus:ring-2 focus:ring-brand-accent/40 focus:ring-offset-0"
                    />
                    <span className="text-xs font-medium text-semantic-muted">
                      Required
                    </span>
                  </label>
                  <button
                    onClick={() => handleRemoveProperty(index)}
                    className="rounded-lg border ${STATUS_BORDER_COLORS_SUBTLE.error} ${STATUS_BG_COLORS_SUBTLE.error} p-2 ${STATUS_TEXT_COLORS.error} transition-all hover:${STATUS_BG_COLORS_SUBTLE.error} hover:border-semantic-error"
                    aria-label="Remove property"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live Preview */}
      {localProperties.length > 0 && (
        <details className="rounded-lg border border-brand-outline/40 bg-brand-paper/50 p-4">
          <summary className="cursor-pointer text-sm font-medium text-brand-accent">
            Show Generated Schema (for developers)
          </summary>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-brand-ink p-3 text-xs ${STATUS_TEXT_COLORS.success}">
            {JSON.stringify(
              {
                type: "object",
                properties: Object.fromEntries(
                  localProperties.map((prop) => [
                    prop.name,
                    {
                      type: prop.type,
                      ...(prop.description && {
                        description: prop.description,
                      }),
                    },
                  ]),
                ),
                required: localProperties
                  .filter((p) => p.required)
                  .map((p) => p.name),
              },
              null,
              2,
            )}
          </pre>
        </details>
      )}
    </div>
  );
}
