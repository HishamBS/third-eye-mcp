'use client';

import { useState, useEffect } from 'react';
import type { WizardStepProps } from '@/types/custom-eye-form';
import { SchemaBuilder, type SchemaProperty } from '../SchemaBuilder';
import { SchemaTemplateSelector } from '../SchemaTemplateSelector';
import { SCHEMA_TEMPLATES } from '../constants';

/**
 * SchemaStep - Step 2 of CustomEyeWizard
 *
 * Visual schema builder with templates
 * Per R07: Strict typing
 * Per R13: All text from SSOT
 */

// Convert JSON schema to properties array
function schemaToProperties(schemaStr: string): SchemaProperty[] {
  try {
    const schema = JSON.parse(schemaStr);
    if (!schema.properties) return [];

    const required = schema.required || [];
    return Object.entries(schema.properties).map(([name, prop]: [string, any]) => ({
      name,
      type: prop.type || 'string',
      description: prop.description || '',
      required: required.includes(name),
    }));
  } catch {
    return [];
  }
}

// Convert properties array to JSON schema string
function propertiesToSchema(properties: readonly SchemaProperty[]): string {
  const schema = {
    type: 'object',
    properties: Object.fromEntries(
      properties.map((prop) => [
        prop.name,
        {
          type: prop.type,
          ...(prop.description && { description: prop.description }),
        },
      ])
    ),
    required: properties.filter((p) => p.required).map((p) => p.name),
  };
  return JSON.stringify(schema, null, 2);
}

export function SchemaStep({ state, dispatch }: WizardStepProps) {
  const [inputProps, setInputProps] = useState<SchemaProperty[]>(() =>
    schemaToProperties(state.formData.inputSchema)
  );
  const [outputProps, setOutputProps] = useState<SchemaProperty[]>(() =>
    schemaToProperties(state.formData.outputSchema)
  );

  // Sync with form state
  useEffect(() => {
    dispatch({ type: 'SET_INPUT_SCHEMA', inputSchema: propertiesToSchema(inputProps) });
  }, [inputProps, dispatch]);

  useEffect(() => {
    dispatch({ type: 'SET_OUTPUT_SCHEMA', outputSchema: propertiesToSchema(outputProps) });
  }, [outputProps, dispatch]);

  return (
    <div className="space-y-8">
      {/* Templates */}
      <SchemaTemplateSelector
        onSelect={(inputSchema, outputSchema) => {
          setInputProps(schemaToProperties(inputSchema));
          setOutputProps(schemaToProperties(outputSchema));
        }}
      />

      {/* Input Schema Builder */}
      <SchemaBuilder
        title="Input Schema"
        properties={inputProps}
        onChange={(props) => setInputProps([...props])}
      />

      {/* Output Schema Builder */}
      <SchemaBuilder
        title="Output Schema"
        properties={outputProps}
        onChange={(props) => setOutputProps([...props])}
      />
    </div>
  );
}
