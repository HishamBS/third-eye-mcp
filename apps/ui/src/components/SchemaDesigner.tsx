'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description?: string;
  enum?: string[];
  items?: SchemaField;
  properties?: Record<string, SchemaField>;
}

interface SchemaDesignerProps {
  initialSchema?: Record<string, SchemaField>;
  onChange?: (schema: Record<string, SchemaField>) => void;
}

export function SchemaDesigner({ initialSchema = {}, onChange }: SchemaDesignerProps) {
  const [fields, setFields] = useState<Record<string, SchemaField>>(initialSchema);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [newFieldName, setNewFieldName] = useState('');

  const addField = () => {
    if (!newFieldName || fields[newFieldName]) return;

    const newFields = {
      ...fields,
      [newFieldName]: {
        name: newFieldName,
        type: 'string',
        required: false,
      },
    };

    setFields(newFields);
    onChange?.(newFields);
    setNewFieldName('');
    setEditingField(newFieldName);
  };

  const updateField = (name: string, updates: Partial<SchemaField>) => {
    const newFields = {
      ...fields,
      [name]: { ...fields[name], ...updates },
    };
    setFields(newFields);
    onChange?.(newFields);
  };

  const deleteField = (name: string) => {
    const newFields = { ...fields };
    delete newFields[name];
    setFields(newFields);
    onChange?.(newFields);
    setEditingField(null);
  };

  const generateJSONSchema = () => {
    const schema = {
      type: 'object',
      properties: {} as Record<string, any>,
      required: [] as string[],
    };

    Object.entries(fields).forEach(([name, field]) => {
      schema.properties[name] = {
        type: field.type,
        description: field.description,
      };

      if (field.enum) {
        schema.properties[name].enum = field.enum;
      }

      if (field.type === 'array' && field.items) {
        schema.properties[name].items = {
          type: field.items.type,
        };
      }

      if (field.required) {
        schema.required.push(name);
      }
    });

    return schema;
  };

  const typeOptions = ['string', 'number', 'boolean', 'array', 'object'] as const;

  return (
    <div className="space-y-6">
      {/* Add New Field */}
      <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/50 p-4">
        <h3 className="mb-4 text-sm font-semibold text-white">Add Field</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addField()}
            placeholder="Field name (e.g., temperature, max_tokens)"
            className="flex-1 rounded-lg border border-brand-outline/50 bg-brand-ink px-4 py-2 text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
          />
          <button
            onClick={addField}
            disabled={!newFieldName || !!fields[newFieldName]}
            className="rounded-lg bg-brand-accent px-6 py-2 font-semibold text-white transition hover:bg-brand-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      {/* Fields List */}
      <div className="space-y-3">
        <AnimatePresence>
          {Object.entries(fields).map(([name, field]) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="rounded-xl border border-brand-outline/40 bg-brand-paper/50 p-4"
            >
              <div className="space-y-3">
                {/* Field Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold text-white">{name}</span>
                    {field.required && (
                      <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                        Required
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingField(editingField === name ? null : name)}
                      className="rounded-lg bg-white/10 px-3 py-1 text-xs text-white transition hover:bg-white/20"
                    >
                      {editingField === name ? 'Collapse' : 'Edit'}
                    </button>
                    <button
                      onClick={() => deleteField(name)}
                      className="rounded-lg bg-red-500/20 px-3 py-1 text-xs text-red-400 transition hover:bg-red-500/30"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Field Details (when editing) */}
                {editingField === name && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-3 border-t border-brand-outline/30 pt-3"
                  >
                    {/* Type Selection */}
                    <div>
                      <label className="mb-2 block text-xs text-slate-400">Type</label>
                      <select
                        value={field.type}
                        onChange={(e) => updateField(name, { type: e.target.value as any })}
                        className="w-full rounded-lg border border-brand-outline/50 bg-brand-ink px-3 py-2 text-sm text-white focus:border-brand-accent focus:outline-none"
                      >
                        {typeOptions.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="mb-2 block text-xs text-slate-400">Description</label>
                      <textarea
                        value={field.description || ''}
                        onChange={(e) => updateField(name, { description: e.target.value })}
                        placeholder="Describe what this field does..."
                        className="w-full resize-none rounded-lg border border-brand-outline/50 bg-brand-ink px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none"
                        rows={2}
                      />
                    </div>

                    {/* Required Toggle */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`required-${name}`}
                        checked={field.required}
                        onChange={(e) => updateField(name, { required: e.target.checked })}
                        className="h-4 w-4 rounded border-brand-outline/50 bg-brand-ink text-brand-accent focus:ring-2 focus:ring-brand-accent/40"
                      />
                      <label htmlFor={`required-${name}`} className="text-sm text-slate-300">
                        Required field
                      </label>
                    </div>

                    {/* Enum Values (for string type) */}
                    {field.type === 'string' && (
                      <div>
                        <label className="mb-2 block text-xs text-slate-400">
                          Allowed Values (comma-separated, optional)
                        </label>
                        <input
                          type="text"
                          value={field.enum?.join(', ') || ''}
                          onChange={(e) => {
                            const values = e.target.value
                              .split(',')
                              .map((v) => v.trim())
                              .filter(Boolean);
                            updateField(name, { enum: values.length > 0 ? values : undefined });
                          }}
                          placeholder="e.g., low, medium, high"
                          className="w-full rounded-lg border border-brand-outline/50 bg-brand-ink px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none"
                        />
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Quick Summary (when not editing) */}
                {editingField !== name && (
                  <div className="text-xs text-slate-400">
                    <span className="capitalize">{field.type}</span>
                    {field.description && ` • ${field.description.slice(0, 60)}${field.description.length > 60 ? '...' : ''}`}
                    {field.enum && ` • Values: ${field.enum.join(', ')}`}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {Object.keys(fields).length === 0 && (
          <div className="rounded-xl border border-dashed border-brand-outline/40 p-8 text-center">
            <p className="text-slate-400">No fields defined yet. Add a field to get started.</p>
          </div>
        )}
      </div>

      {/* JSON Schema Preview */}
      {Object.keys(fields).length > 0 && (
        <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Generated JSON Schema</h3>
            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(generateJSONSchema(), null, 2));
              }}
              className="rounded-lg bg-white/10 px-3 py-1 text-xs text-white transition hover:bg-white/20"
            >
              Copy
            </button>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-brand-ink p-3 text-xs text-green-400">
            {JSON.stringify(generateJSONSchema(), null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
