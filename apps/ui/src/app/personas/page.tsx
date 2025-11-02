'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GlassCard } from '@/components/ui/GlassCard';
import { PersonaWizard } from '@/components/persona-form/PersonaWizard';
import { Plus, Eye, CheckCircle2, Circle, Calendar, FileText, Edit } from 'lucide-react';
import type { PersonaFormState } from '@/types/persona-form';
import type { Persona } from '@/types/api';
import { STATUS_TEXT_COLORS, STATUS_BG_COLORS_SUBTLE, STATUS_BORDER_COLORS_SUBTLE } from '@/constants/color-mappings';
import { API_ROUTES } from '@/constants/api-routes';

// Framer Motion animation duration (in seconds)
const ANIMATION_FAST = 0.2; // 200ms

/**
 * Safely parse JSON fields that might be strings or already parsed
 * Ensures arrays are always arrays and objects are always objects
 */
function safeParseJSON<T>(value: T | string, defaultValue: T): T {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  }
  return value ?? defaultValue;
}

/**
 * Personas Page - Management interface for Eye personas
 *
 * Features:
 * - List all personas grouped by Eye
 * - Create new personas via PersonaWizard
 * - Activate/deactivate persona versions
 * - View persona details
 *
 * Per R01: Uses SSOT for API routes, color mappings, timing
 * Per R07: Strict typing throughout
 * Per R13: No magic numbers or strings
 */
export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [viewingPersona, setViewingPersona] = useState<Persona | null>(null);
  const [filterEye, setFilterEye] = useState<string>('all');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    guidance: false,
    validation: false,
    envelope: false,
  });

  // Fetch personas on mount
  useEffect(() => {
    fetchPersonas();
  }, []);

  const fetchPersonas = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(API_ROUTES.PERSONAS);
      if (!response.ok) {
        throw new Error('Failed to fetch personas');
      }
      const data = await response.json();
      setPersonas(data.data || data || []);
    } catch (err) {
      console.error('Error fetching personas:', err);
      setError(err instanceof Error ? err.message : 'Failed to load personas');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = useCallback(async (data: PersonaFormState) => {
    try {
      const response = await fetch(API_ROUTES.PERSONAS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eye: data.metadata.eyeId,
          name: data.metadata.name,
          metadata_json: data.metadata,
          mission: data.mission,
          guidance_json: data.guidancePhase,
          validation_json: data.validationPhase,
          envelope_json: data.envelopeContract,
          reminders_json: data.reminders,
          notes: data.notes,
          llm_config_json: data.llmConfig,
          active: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save persona');
      }

      await fetchPersonas();
      setShowWizard(false);
    } catch (err) {
      console.error('Error saving persona:', err);
      alert('Failed to save persona: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }, []);

  const handleCancel = useCallback(() => {
    setShowWizard(false);
    setEditingPersona(null);
  }, []);

  const handleView = useCallback((persona: Persona) => {
    setViewingPersona(persona);
  }, []);

  const handleEdit = useCallback((persona: Persona) => {
    setEditingPersona(persona);
    setShowWizard(true);
  }, []);

  const handleCloseView = useCallback(() => {
    setViewingPersona(null);
  }, []);

  const toggleActive = async (persona: Persona) => {
    try {
      const response = await fetch(
        API_ROUTES.PERSONAS_ACTIVATE(persona.eye, persona.version),
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error('Failed to toggle persona status');
      }

      await fetchPersonas();
    } catch (err) {
      console.error('Error toggling persona:', err);
      alert('Failed to update persona status');
    }
  };

  // Group personas by eye
  const personasByEye = personas.reduce((acc, persona) => {
    if (!acc[persona.eye]) {
      acc[persona.eye] = [];
    }
    acc[persona.eye].push(persona);
    return acc;
  }, {} as Record<string, Persona[]>);

  // Get unique eyes for filter
  const uniqueEyes = Object.keys(personasByEye).sort();

  // Filter personas by eye
  const filteredEyes = filterEye === 'all'
    ? uniqueEyes
    : uniqueEyes.filter(eye => eye === filterEye);

  if (showWizard) {
    // Reconstruct PersonaFormState from structured fields if editing with safe JSON parsing
    const initialData = editingPersona
      ? {
          metadata: safeParseJSON(editingPersona.metadata_json, {
            eyeId: '',
            name: '',
            description: '',
            version: 1,
            capabilities: [],
          }),
          mission: editingPersona.mission,
          guidancePhase: safeParseJSON(editingPersona.guidance_json, null),
          validationPhase: safeParseJSON(editingPersona.validation_json, null),
          envelopeContract: safeParseJSON(editingPersona.envelope_json, {}),
          reminders: safeParseJSON(editingPersona.reminders_json, []),
          notes: editingPersona.notes,
          llmConfig: safeParseJSON(editingPersona.llm_config_json, {
            temperature: 0.7,
            top_p: 1,
            response_format: 'json',
            max_tokens: 4096,
          }),
        } as PersonaFormState
      : undefined;

    return (
      <PersonaWizard
        initialData={initialData}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="min-h-screen bg-brand-paper">
      {/* Header */}
      <div className="border-b border-brand-outline/60 bg-brand-paperElev/50">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-brand-foreground">Personas</h1>
              <p className="mt-1 text-sm text-semantic-muted">
                Manage Eye personas and configurations
              </p>
            </div>
            <button
              onClick={() => setShowWizard(true)}
              className="flex items-center gap-2 rounded-lg bg-brand-accent px-4 py-2 font-semibold text-brand-foreground transition-colors hover:bg-brand-accent/90"
            >
              <Plus className="h-5 w-5" />
              Create Persona
            </button>
          </div>

          {/* Filter Bar */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setFilterEye('all')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filterEye === 'all'
                  ? 'bg-brand-accent text-brand-foreground'
                  : 'bg-brand-paperElev text-semantic-muted hover:bg-brand-paperElev/80'
              }`}
            >
              All Eyes
            </button>
            {uniqueEyes.map((eye) => (
              <button
                key={eye}
                onClick={() => setFilterEye(eye)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  filterEye === eye
                    ? 'bg-brand-accent text-brand-foreground'
                    : 'bg-brand-paperElev text-semantic-muted hover:bg-brand-paperElev/80'
                }`}
              >
                {eye}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-semantic-muted">Loading personas...</p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && personas.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <GlassCard className="max-w-md p-8 text-center">
              <Eye className="mx-auto h-16 w-16 text-semantic-muted/50" />
              <h2 className="mt-4 text-xl font-semibold text-brand-foreground">No Personas Yet</h2>
              <p className="mt-2 text-sm text-semantic-muted">
                Create your first persona to configure how Eyes interact with users
              </p>
              <button
                onClick={() => setShowWizard(true)}
                className="mt-6 flex items-center gap-2 rounded-lg bg-brand-accent px-6 py-3 font-semibold text-brand-foreground transition-colors hover:bg-brand-accent/90"
              >
                <Plus className="h-5 w-5" />
                Create First Persona
              </button>
            </GlassCard>
          </div>
        )}

        {!loading && !error && personas.length > 0 && (
          <div className="space-y-8">
            {filteredEyes.map((eye) => (
              <motion.div
                key={eye}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: ANIMATION_FAST }}
              >
                <h2 className="mb-4 text-xl font-bold text-brand-foreground">
                  {eye}
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {personasByEye[eye]
                    .sort((a, b) => b.version - a.version)
                    .map((persona) => (
                      <motion.div
                        key={`${persona.eye}-${persona.version}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: ANIMATION_FAST }}
                      >
                        <GlassCard
                          className={`p-4 transition-colors ${
                            persona.active
                              ? `${STATUS_BORDER_COLORS_SUBTLE.success} border`
                              : 'border border-brand-outline/30'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                {persona.active ? (
                                  <CheckCircle2 className={`h-5 w-5 ${STATUS_TEXT_COLORS.success}`} />
                                ) : (
                                  <Circle className="h-5 w-5 text-semantic-muted/50" />
                                )}
                                <h3 className="font-semibold text-brand-foreground">
                                  Version {persona.version}
                                </h3>
                              </div>
                              <div className="mt-2 flex items-center gap-2 text-xs text-semantic-muted">
                                <Calendar className="h-4 w-4" />
                                {new Date(persona.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                            <button
                              onClick={() => toggleActive(persona)}
                              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                                persona.active
                                  ? `${STATUS_BG_COLORS_SUBTLE.warning} ${STATUS_TEXT_COLORS.warning}`
                                  : `${STATUS_BG_COLORS_SUBTLE.success} ${STATUS_TEXT_COLORS.success}`
                              }`}
                            >
                              {persona.active ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                          {persona.active && (
                            <div className={`mt-3 rounded-lg ${STATUS_BG_COLORS_SUBTLE.success} px-3 py-2`}>
                              <p className={`text-xs font-medium ${STATUS_TEXT_COLORS.success}`}>
                                Active Version
                              </p>
                            </div>
                          )}

                          {/* View and Edit Actions */}
                          <div className="mt-4 flex gap-2">
                            <button
                              onClick={() => handleView(persona)}
                              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-brand-outline px-3 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-paperElev"
                            >
                              <FileText className="h-4 w-4" />
                              View
                            </button>
                            <button
                              onClick={() => handleEdit(persona)}
                              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-accent px-3 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-accent/90"
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </button>
                          </div>
                        </GlassCard>
                      </motion.div>
                    ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* View Persona Modal */}
      {viewingPersona && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={handleCloseView}>
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-brand-paper p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-brand-foreground">
                {viewingPersona.eye} - Version {viewingPersona.version}
              </h2>
              <button
                onClick={handleCloseView}
                className="rounded-lg px-4 py-2 text-brand-foreground transition-colors hover:bg-brand-paperElev"
              >
                Close
              </button>
            </div>

            {(() => {
              // Use structured fields directly from database with safe JSON parsing
              const data = {
                metadata: safeParseJSON(viewingPersona.metadata_json, {
                  eyeId: '',
                  name: '',
                  description: '',
                  version: 1,
                  capabilities: [],
                }),
                mission: viewingPersona.mission,
                guidancePhase: safeParseJSON(viewingPersona.guidance_json, null),
                validationPhase: safeParseJSON(viewingPersona.validation_json, null),
                envelopeContract: safeParseJSON(viewingPersona.envelope_json, {}),
                reminders: safeParseJSON(viewingPersona.reminders_json, []),
                notes: viewingPersona.notes,
                llmConfig: safeParseJSON(viewingPersona.llm_config_json, {
                  temperature: 0.7,
                  top_p: 1,
                  response_format: 'json',
                  max_tokens: 4096,
                }),
              };
              return (
                  <div className="space-y-6">
                    {/* Mission - Always Visible */}
                    <section>
                      <h3 className="mb-3 text-lg font-semibold text-brand-foreground">Mission</h3>
                      <div className="rounded-lg bg-brand-paperElev p-4">
                        <div className="prose prose-sm prose-invert max-w-none text-semantic-muted">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {data.mission || 'N/A'}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </section>

                    {/* Capabilities - Always Visible */}
                    <section>
                      <h3 className="mb-3 text-lg font-semibold text-brand-foreground">Capabilities</h3>
                      <div className="flex flex-wrap gap-2">
                        {data.metadata.capabilities && data.metadata.capabilities.length > 0 ? (
                          data.metadata.capabilities.map((cap) => (
                            <span key={cap} className="rounded-full bg-brand-accent/20 px-3 py-1 text-sm text-brand-accent">
                              {cap}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-semantic-muted">No capabilities defined</span>
                        )}
                      </div>
                    </section>

                    {/* Phases Section */}
                    <section>
                      <h3 className="mb-3 text-lg font-semibold text-brand-foreground">Phases</h3>
                      <div className="space-y-3">
                        {/* Guidance Phase - Collapsible */}
                        {data.guidancePhase && (
                          <div className={`rounded-xl border ${STATUS_BORDER_COLORS_SUBTLE.info} ${STATUS_BG_COLORS_SUBTLE.info} overflow-hidden`}>
                            <button
                              onClick={() => setExpandedSections(prev => ({ ...prev, guidance: !prev.guidance }))}
                              className={`w-full p-4 flex items-center justify-between text-left hover:opacity-80 transition`}
                            >
                              <h4 className={`font-semibold ${STATUS_TEXT_COLORS.info}`}>Guidance Phase</h4>
                              <span className={STATUS_TEXT_COLORS.info}>{expandedSections.guidance ? '▼' : '▶'}</span>
                            </button>
                            {expandedSections.guidance && (
                              <div className="px-4 pb-4 space-y-3">
                                <div className="prose prose-sm prose-invert max-w-none text-semantic-muted">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {typeof data.guidancePhase === 'string'
                                      ? data.guidancePhase
                                      : JSON.stringify(data.guidancePhase, null, 2)}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Validation Phase - Collapsible */}
                        {data.validationPhase && (
                          <div className={`rounded-xl border ${STATUS_BORDER_COLORS_SUBTLE.success} ${STATUS_BG_COLORS_SUBTLE.success} overflow-hidden`}>
                            <button
                              onClick={() => setExpandedSections(prev => ({ ...prev, validation: !prev.validation }))}
                              className={`w-full p-4 flex items-center justify-between text-left hover:opacity-80 transition`}
                            >
                              <h4 className={`font-semibold ${STATUS_TEXT_COLORS.success}`}>Validation Phase</h4>
                              <span className={STATUS_TEXT_COLORS.success}>{expandedSections.validation ? '▼' : '▶'}</span>
                            </button>
                            {expandedSections.validation && (
                              <div className="px-4 pb-4 space-y-3">
                                <div className="prose prose-sm prose-invert max-w-none text-semantic-muted">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {typeof data.validationPhase === 'string'
                                      ? data.validationPhase
                                      : JSON.stringify(data.validationPhase, null, 2)}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </section>

                    {/* Envelope Contract - Collapsible */}
                    <section>
                      <div className="rounded-xl border border-brand-outline/50 bg-brand-paper/30 overflow-hidden">
                        <button
                          onClick={() => setExpandedSections(prev => ({ ...prev, envelope: !prev.envelope }))}
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-brand-paper/50 transition"
                        >
                          <h3 className="text-lg font-semibold text-brand-foreground">Envelope Contract</h3>
                          <span className="text-brand-accent">{expandedSections.envelope ? '▼' : '▶'}</span>
                        </button>
                        {expandedSections.envelope && (
                          <div className="px-4 pb-4 space-y-3">
                            <div>
                              <p className="mb-1 text-xs font-semibold text-brand-accent">Required Keys:</p>
                              <ul className="list-inside list-disc text-sm text-semantic-muted">
                                {data.envelopeContract.requiredKeys && data.envelopeContract.requiredKeys.length > 0 ? (
                                  data.envelopeContract.requiredKeys.map((key, idx) => (
                                    <li key={idx}>{key}</li>
                                  ))
                                ) : (
                                  <li>None</li>
                                )}
                              </ul>
                            </div>
                            <div>
                              <p className="mb-1 text-xs font-semibold text-brand-accent">Required Data Keys:</p>
                              <ul className="list-inside list-disc text-sm text-semantic-muted">
                                {data.envelopeContract.requiredDataKeys && data.envelopeContract.requiredDataKeys.length > 0 ? (
                                  data.envelopeContract.requiredDataKeys.map((key, idx) => (
                                    <li key={idx}>{key}</li>
                                  ))
                                ) : (
                                  <li>None</li>
                                )}
                              </ul>
                            </div>
                            <div>
                              <p className="mb-1 text-xs font-semibold text-brand-accent">Required UI Keys:</p>
                              <ul className="list-inside list-disc text-sm text-semantic-muted">
                                {data.envelopeContract.requiredUiKeys && data.envelopeContract.requiredUiKeys.length > 0 ? (
                                  data.envelopeContract.requiredUiKeys.map((key, idx) => (
                                    <li key={idx}>{key}</li>
                                  ))
                                ) : (
                                  <li>None</li>
                                )}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    </section>

                    {/* Notes - Always Visible if Present */}
                    {data.notes && (
                      <section>
                        <h3 className="mb-3 text-lg font-semibold text-brand-foreground">Notes</h3>
                        <div className="rounded-lg bg-brand-paperElev p-4">
                          <div className="prose prose-sm prose-invert max-w-none text-semantic-muted">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {data.notes}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </section>
                    )}
                  </div>
                );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
