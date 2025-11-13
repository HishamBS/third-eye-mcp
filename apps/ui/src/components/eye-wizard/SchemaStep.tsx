"use client";

import { useState, useCallback, useMemo } from "react";
import type { WizardStepProps } from "@/types/eye-wizard";
import {
  SchemaBuilder,
  type SchemaProperty,
} from "../custom-eye-form/SchemaBuilder";
import { SCHEMA_LABELS, VALIDATION_MESSAGES } from "./constants";

/**
 * Convert JSON string to SchemaProperty array
 */
function jsonToProperties(jsonString: string): SchemaProperty[] {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== "object" || !parsed.properties) {
      return [];
    }

    const { properties, required = [] } = parsed;
    return Object.entries(properties).map(([name, schema]) => {
      const prop = schema as Record<string, unknown>;
      return {
        name,
        type: (prop.type as SchemaProperty["type"]) || "string",
        description: (prop.description as string) || "",
        required: Array.isArray(required) && required.includes(name),
      };
    });
  } catch {
    return [];
  }
}

/**
 * Convert SchemaProperty array to JSON string
 */
function propertiesToJson(properties: readonly SchemaProperty[]): string {
  if (properties.length === 0) {
    return "{}";
  }

  const schema = {
    type: "object",
    properties: Object.fromEntries(
      properties.map((prop) => [
        prop.name,
        {
          type: prop.type,
          ...(prop.description && { description: prop.description }),
        },
      ]),
    ),
    required: properties.filter((p) => p.required).map((p) => p.name),
  };

  return JSON.stringify(schema, null, 2);
}

/**
 * SchemaStep - Step 2 of EyeWizard
 * Handles input and output schema editing using visual builder
 */
export function SchemaStep({ state, dispatch }: WizardStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Convert JSON to properties for visual builder
  const inputProperties = useMemo(
    () => jsonToProperties(state.formData.inputSchema),
    [state.formData.inputSchema],
  );

  const outputProperties = useMemo(
    () => jsonToProperties(state.formData.outputSchema),
    [state.formData.outputSchema],
  );

  // Handle input schema change
  const handleInputSchemaChange = useCallback(
    (properties: readonly SchemaProperty[]) => {
      try {
        const jsonString = propertiesToJson(properties);
        dispatch({
          type: "UPDATE_SCHEMAS",
          payload: { inputSchema: jsonString },
        });
        // Clear error if it exists
        if (errors.inputSchema) {
          setErrors((prev) => ({ ...prev, inputSchema: "" }));
        }
      } catch (error) {
        setErrors((prev) => ({
          ...prev,
          inputSchema: VALIDATION_MESSAGES.INPUT_SCHEMA_INVALID_JSON,
        }));
      }
    },
    [dispatch, errors.inputSchema],
  );

  // Handle output schema change
  const handleOutputSchemaChange = useCallback(
    (properties: readonly SchemaProperty[]) => {
      try {
        const jsonString = propertiesToJson(properties);
        dispatch({
          type: "UPDATE_SCHEMAS",
          payload: { outputSchema: jsonString },
        });
        // Clear error if it exists
        if (errors.outputSchema) {
          setErrors((prev) => ({ ...prev, outputSchema: "" }));
        }
      } catch (error) {
        setErrors((prev) => ({
          ...prev,
          outputSchema: VALIDATION_MESSAGES.OUTPUT_SCHEMA_INVALID_JSON,
        }));
      }
    },
    [dispatch, errors.outputSchema],
  );

  return (
    <div className="space-y-8">
      {/* Input Schema Section */}
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-brand-foreground">
            {SCHEMA_LABELS.INPUT_SCHEMA_LABEL}
          </h3>
          <p className="mt-1 text-sm text-semantic-muted">
            {SCHEMA_LABELS.INPUT_SCHEMA_HELP}
          </p>
        </div>
        {errors.inputSchema && (
          <div className="mb-4 rounded-lg border border-status-error bg-status-error/10 p-3">
            <p className="text-sm text-status-error">{errors.inputSchema}</p>
          </div>
        )}
        <SchemaBuilder
          title={SCHEMA_LABELS.INPUT_SCHEMA_LABEL}
          properties={inputProperties}
          onChange={handleInputSchemaChange}
        />
      </div>

      {/* Divider */}
      <div className="border-t border-brand-outline/50" />

      {/* Output Schema Section */}
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-brand-foreground">
            {SCHEMA_LABELS.OUTPUT_SCHEMA_LABEL}
          </h3>
          <p className="mt-1 text-sm text-semantic-muted">
            {SCHEMA_LABELS.OUTPUT_SCHEMA_HELP}
          </p>
        </div>
        {errors.outputSchema && (
          <div className="mb-4 rounded-lg border border-status-error bg-status-error/10 p-3">
            <p className="text-sm text-status-error">{errors.outputSchema}</p>
          </div>
        )}
        <SchemaBuilder
          title={SCHEMA_LABELS.OUTPUT_SCHEMA_LABEL}
          properties={outputProperties}
          onChange={handleOutputSchemaChange}
        />
      </div>

      {/* Help Text */}
      <div className="rounded-lg border border-brand-accent/20 bg-brand-accent/5 p-4">
        <p className="text-sm text-brand-accent">
          💡 <strong>Tip:</strong> Define the structure of data your Eye expects
          to receive (Input Schema) and the structure of data it will return
          (Output Schema). This helps ensure data consistency and makes it
          easier to integrate with other systems.
        </p>
      </div>
    </div>
  );
}
