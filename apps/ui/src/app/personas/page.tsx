"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { GlassCard } from "@/components/ui/GlassCard";
import { PersonaWizard } from "@/components/persona-form/PersonaWizard";
import { EyeIcon } from "@/components/EyeIcon";
import {
  Plus,
  Eye,
  CheckCircle2,
  Circle,
  Calendar,
  FileText,
  Edit,
} from "lucide-react";
import type { PersonaFormState } from "@/types/persona-form";
import type { Persona } from "@/types/api";
import {
  STATUS_TEXT_COLORS,
  STATUS_BG_COLORS_SUBTLE,
  STATUS_BORDER_COLORS_SUBTLE,
} from "@/constants/color-mappings";
import { API_ROUTES } from "@/constants/api-routes";
import { API_BASE_URL } from "@/consts/api";

// Framer Motion animation duration (in seconds)
const ANIMATION_FAST = 0.2; // 200ms

/**
 * Safely parse JSON fields that might be strings or already parsed
 * Ensures arrays are always arrays and objects are always objects
 */
function safeParseJSON<T>(value: T | string, defaultValue: T): T {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  }
  return value ?? defaultValue;
}

/**
 * Extract clean, human-readable mission text
 * Removes technical prompt details (GUIDANCE/VALIDATION phases, JSON schemas, examples)
 * Returns only the first paragraph describing the persona's role
 */
function getCleanMission(rawMission: string): string {
  if (!rawMission) return "N/A";

  // Split by double newlines or phase markers
  const firstPart = rawMission.split(
    /\n\n|GUIDANCE Phase|VALIDATION Phase|Check:|Always respond with|Response \(/i,
  )[0];

  return firstPart.trim() || rawMission;
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
  const [personaVersions, setPersonaVersions] = useState<Persona[]>([]);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    guidance: false,
    validation: false,
    envelope: false,
    systemPrompt: false,
    reminders: false,
    llmConfig: false,
    notes: false,
  });

  // Fetch personas on mount
  useEffect(() => {
    fetchPersonas();
  }, []);

  const fetchPersonas = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}${API_ROUTES.PERSONAS}`);
      if (!response.ok) {
        throw new Error("Failed to fetch personas");
      }
      const data = await response.json();
      setPersonas(data.data || data || []);
    } catch (err) {
      console.error("Error fetching personas:", err);
      setError(err instanceof Error ? err.message : "Failed to load personas");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = useCallback(async (data: PersonaFormState) => {
    try {
      const response = await fetch(API_ROUTES.PERSONAS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        throw new Error("Failed to save persona");
      }

      await fetchPersonas();
      setShowWizard(false);
    } catch (err) {
      console.error("Error saving persona:", err);
      alert(
        "Failed to save persona: " +
          (err instanceof Error ? err.message : "Unknown error"),
      );
    }
  }, []);

  const handleCancel = useCallback(() => {
    setShowWizard(false);
    setEditingPersona(null);
  }, []);

  const handleView = useCallback(
    (persona: Persona) => {
      setViewingPersona(persona);
      // Fetch all versions for this eye
      const allVersions = personas.filter((p) => p.eye === persona.eye);
      setPersonaVersions(allVersions.sort((a, b) => b.version - a.version));
    },
    [personas],
  );

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
        { method: "POST" },
      );

      if (!response.ok) {
        throw new Error("Failed to toggle persona status");
      }

      await fetchPersonas();
    } catch (err) {
      console.error("Error toggling persona:", err);
      alert("Failed to update persona status");
    }
  };

  // Deduplicate personas - one card per eye (show active or latest version)
  // NO FALLBACKS - all personas from API must have valid eyeName
  // Filter out any personas missing eyeName (should not happen, but validate)
  const validPersonas = personas.filter((persona) => {
    if (!persona.eyeName) {
      console.error(
        `[PERSONAS PAGE] Persona ${persona.id} missing eyeName. Excluding from display.`,
      );
      return false;
    }
    return true;
  });

  const deduplicatedPersonas = validPersonas
    .reduce((acc, persona) => {
      // eyeName is guaranteed to be non-null after filtering
      const existing = acc.find((p) => p.eyeName === persona.eyeName);

      if (!existing) {
        acc.push(persona);
      } else {
        // Prefer active version over higher version number
        if (persona.active && !existing.active) {
          const index = acc.findIndex((p) => p.eyeName === persona.eyeName);
          acc[index] = persona;
        } else if (
          !persona.active &&
          !existing.active &&
          persona.version > existing.version
        ) {
          // If neither is active, use latest version
          const index = acc.findIndex((p) => p.eyeName === persona.eyeName);
          acc[index] = persona;
        }
      }

      return acc;
    }, [] as Persona[])
    .sort((a, b) => a.eyeName.localeCompare(b.eyeName));

  if (showWizard) {
    // Reconstruct PersonaFormState from structured fields if editing with safe JSON parsing
    const initialData = editingPersona
      ? ({
          metadata: safeParseJSON(editingPersona.metadataJson, {
            eyeId: "",
            name: "",
            description: "",
            version: 1,
            capabilities: [],
          }),
          mission: editingPersona.mission,
          guidancePhase: safeParseJSON(editingPersona.guidanceJson, null),
          validationPhase: safeParseJSON(editingPersona.validationJson, null),
          envelopeContract: safeParseJSON(editingPersona.envelopeJson, {}),
          reminders: safeParseJSON(editingPersona.remindersJson, []),
          notes: editingPersona.notes,
          llmConfig: safeParseJSON(editingPersona.llmConfigJson, {
            temperature: 0.7,
            top_p: 1,
            response_format: "json",
            max_tokens: 4096,
          }),
        } as PersonaFormState)
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
              <h1 className="text-3xl font-bold text-brand-foreground">
                Personas
              </h1>
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
              <h2 className="mt-4 text-xl font-semibold text-brand-foreground">
                No Personas Yet
              </h2>
              <p className="mt-2 text-sm text-semantic-muted">
                Create your first persona to configure how Eyes interact with
                users
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
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            {deduplicatedPersonas.map((persona) => (
              <motion.div
                key={persona.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: ANIMATION_FAST }}
              >
                <GlassCard
                  className={`p-4 transition-colors ${
                    persona.active
                      ? `${STATUS_BORDER_COLORS_SUBTLE.success} border`
                      : "border border-brand-outline/30"
                  }`}
                >
                  {/* Eye Name Badge */}
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-accent/20">
                      <EyeIcon eye={persona.eyeName} size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-brand-foreground">
                      {persona.eyeName}
                    </h3>
                  </div>

                  {/* Version Info */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {persona.active ? (
                          <CheckCircle2
                            className={`h-5 w-5 ${STATUS_TEXT_COLORS.success}`}
                          />
                        ) : (
                          <Circle className="h-5 w-5 text-semantic-muted/50" />
                        )}
                        <span className="font-semibold text-brand-foreground">
                          Version {persona.version}
                        </span>
                        {persona.active && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BG_COLORS_SUBTLE.success} ${STATUS_TEXT_COLORS.success}`}
                          >
                            Active
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-semantic-muted">
                        <Calendar className="h-4 w-4" />
                        {new Date(persona.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

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
        )}
      </div>

      {/* View Persona Modal */}
      {viewingPersona && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={handleCloseView}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-brand-paper p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-brand-foreground">
                  {viewingPersona.eye}
                </h2>
                {/* Version Switcher */}
                {personaVersions.length > 1 && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-semantic-muted">
                      Version:
                    </label>
                    <select
                      value={viewingPersona.version}
                      onChange={(e) => {
                        const selectedVersion = personaVersions.find(
                          (p) => p.version === parseInt(e.target.value),
                        );
                        if (selectedVersion) setViewingPersona(selectedVersion);
                      }}
                      className="rounded-lg border border-brand-outline bg-brand-paperElev px-3 py-1.5 text-sm font-medium text-brand-foreground focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent"
                    >
                      {/* Deduplicate versions to prevent multiple "v2 (active)" entries */}
                      {Array.from(
                        new Map(
                          personaVersions.map((p) => [p.version, p])
                        ).values()
                      ).map((p) => (
                        <option key={p.id} value={p.version}>
                          v{p.version} {p.active ? "(active)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
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
                metadata: safeParseJSON(viewingPersona.metadataJson, {
                  eyeId: "",
                  name: "",
                  description: "",
                  version: 1,
                  capabilities: [],
                }),
                mission: viewingPersona.mission,
                guidancePhase: safeParseJSON(viewingPersona.guidanceJson, null),
                validationPhase: safeParseJSON(
                  viewingPersona.validationJson,
                  null,
                ),
                envelopeContract: safeParseJSON(
                  viewingPersona.envelopeJson,
                  {},
                ),
                reminders: safeParseJSON(viewingPersona.remindersJson, []),
                notes: viewingPersona.notes,
                llmConfig: safeParseJSON(viewingPersona.llmConfigJson, {
                  temperature: 0.7,
                  top_p: 1,
                  response_format: "json",
                  max_tokens: 4096,
                }),
              };
              return (
                <div className="space-y-6">
                  {/* Mission - Prominent Hero Section */}
                  <section>
                    <div className="rounded-xl bg-gradient-to-br from-brand-accent/15 to-brand-accent/5 p-6 border-2 border-brand-accent/30 shadow-lg">
                      <h3 className="text-sm font-semibold text-brand-accent uppercase tracking-wide mb-3">
                        Mission
                      </h3>
                      <p className="text-xl leading-relaxed text-brand-foreground font-medium">
                        {getCleanMission(data.mission)}
                      </p>
                    </div>
                  </section>

                  {/* Capabilities - Visual Pills */}
                  <section>
                    <h3 className="mb-3 text-base font-semibold text-brand-foreground flex items-center gap-2">
                      <span className="text-brand-accent">✦</span> Capabilities
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {data.metadata.capabilities &&
                      data.metadata.capabilities.length > 0 ? (
                        data.metadata.capabilities.map((cap) => (
                          <span
                            key={cap}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-accent/20 px-4 py-2 text-sm font-medium text-brand-accent border border-brand-accent/30"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-accent"></span>
                            {cap}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-semantic-muted italic">
                          No capabilities defined
                        </span>
                      )}
                    </div>
                  </section>

                  {/* Phases Section */}
                  <section>
                    <h3 className="mb-3 text-base font-semibold text-brand-foreground flex items-center gap-2">
                      <span className="text-brand-accent">⚡</span> Phases
                    </h3>
                    <div className="space-y-3">
                      {/* Guidance Phase - Collapsible */}
                      {data.guidancePhase && (
                        <div
                          className={`rounded-xl border ${STATUS_BORDER_COLORS_SUBTLE.info} ${STATUS_BG_COLORS_SUBTLE.info} overflow-hidden shadow-sm`}
                        >
                          <button
                            onClick={() =>
                              setExpandedSections((prev) => ({
                                ...prev,
                                guidance: !prev.guidance,
                              }))
                            }
                            className={`w-full p-4 flex items-center justify-between text-left hover:opacity-80 transition`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">📋</span>
                              <h4
                                className={`font-semibold ${STATUS_TEXT_COLORS.info}`}
                              >
                                Guidance Phase
                              </h4>
                            </div>
                            <span className={STATUS_TEXT_COLORS.info}>
                              {expandedSections.guidance ? "▼" : "▶"}
                            </span>
                          </button>
                          {expandedSections.guidance && (
                            <div className="px-4 pb-4 max-h-96 overflow-y-auto space-y-4">
                              {data.guidancePhase.stage && (
                                <div>
                                  <h5 className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-1">
                                    Stage
                                  </h5>
                                  <p className="text-sm text-brand-foreground">
                                    {data.guidancePhase.stage}
                                  </p>
                                </div>
                              )}
                              {data.guidancePhase.mission && (
                                <div>
                                  <h5 className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-1">
                                    Mission
                                  </h5>
                                  <div className="prose prose-sm prose-invert max-w-none text-semantic-muted">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                      {data.guidancePhase.mission}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                              )}
                              {data.guidancePhase.check && (
                                <div>
                                  <h5 className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-1">
                                    Check
                                  </h5>
                                  <div className="prose prose-sm prose-invert max-w-none text-semantic-muted">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                      {data.guidancePhase.check}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                              )}
                              {data.guidancePhase.reminders &&
                                data.guidancePhase.reminders.length > 0 && (
                                  <div>
                                    <h5 className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-1">
                                      Reminders
                                    </h5>
                                    <ul className="space-y-1.5">
                                      {data.guidancePhase.reminders.map(
                                        (reminder, i) => (
                                          <li
                                            key={i}
                                            className="flex items-start gap-2 text-sm text-semantic-muted"
                                          >
                                            <span className="text-blue-400 mt-0.5">
                                              •
                                            </span>
                                            <div className="prose prose-sm prose-invert max-w-none flex-1">
                                              <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                              >
                                                {reminder}
                                              </ReactMarkdown>
                                            </div>
                                          </li>
                                        ),
                                      )}
                                    </ul>
                                  </div>
                                )}
                              {data.guidancePhase.example && (
                                <div>
                                  <h5 className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-1">
                                    Example Response
                                  </h5>
                                  <pre className="mt-2 rounded-lg bg-black/30 p-4 text-xs text-semantic-muted overflow-x-auto">
                                    {data.guidancePhase.example}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Validation Phase - Collapsible */}
                      {data.validationPhase && (
                        <div
                          className={`rounded-xl border ${STATUS_BORDER_COLORS_SUBTLE.success} ${STATUS_BG_COLORS_SUBTLE.success} overflow-hidden shadow-sm`}
                        >
                          <button
                            onClick={() =>
                              setExpandedSections((prev) => ({
                                ...prev,
                                validation: !prev.validation,
                              }))
                            }
                            className={`w-full p-4 flex items-center justify-between text-left hover:opacity-80 transition`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">✅</span>
                              <h4
                                className={`font-semibold ${STATUS_TEXT_COLORS.success}`}
                              >
                                Validation Phase
                              </h4>
                            </div>
                            <span className={STATUS_TEXT_COLORS.success}>
                              {expandedSections.validation ? "▼" : "▶"}
                            </span>
                          </button>
                          {expandedSections.validation && (
                            <div className="px-4 pb-4 max-h-96 overflow-y-auto space-y-4">
                              {data.validationPhase.stage && (
                                <div>
                                  <h5 className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-1">
                                    Stage
                                  </h5>
                                  <p className="text-sm text-brand-foreground">
                                    {data.validationPhase.stage}
                                  </p>
                                </div>
                              )}
                              {data.validationPhase.mission && (
                                <div>
                                  <h5 className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-1">
                                    Mission
                                  </h5>
                                  <div className="prose prose-sm prose-invert max-w-none text-semantic-muted">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                      {data.validationPhase.mission}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                              )}
                              {data.validationPhase.check && (
                                <div>
                                  <h5 className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-1">
                                    Check
                                  </h5>
                                  <div className="prose prose-sm prose-invert max-w-none text-semantic-muted">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                      {data.validationPhase.check}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                              )}
                              {data.validationPhase.reminders &&
                                data.validationPhase.reminders.length > 0 && (
                                  <div>
                                    <h5 className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-1">
                                      Reminders
                                    </h5>
                                    <ul className="space-y-1.5">
                                      {data.validationPhase.reminders.map(
                                        (reminder, i) => (
                                          <li
                                            key={i}
                                            className="flex items-start gap-2 text-sm text-semantic-muted"
                                          >
                                            <span className="text-green-400 mt-0.5">
                                              •
                                            </span>
                                            <div className="prose prose-sm prose-invert max-w-none flex-1">
                                              <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                              >
                                                {reminder}
                                              </ReactMarkdown>
                                            </div>
                                          </li>
                                        ),
                                      )}
                                    </ul>
                                  </div>
                                )}
                              {data.validationPhase.example && (
                                <div>
                                  <h5 className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-1">
                                    Example Response
                                  </h5>
                                  <pre className="mt-2 rounded-lg bg-black/30 p-4 text-xs text-semantic-muted overflow-x-auto">
                                    {data.validationPhase.example}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Envelope Contract - Collapsible with Badge Design */}
                  <section>
                    <div className="rounded-xl border border-brand-outline/50 bg-brand-paper/30 overflow-hidden shadow-sm">
                      <button
                        onClick={() =>
                          setExpandedSections((prev) => ({
                            ...prev,
                            envelope: !prev.envelope,
                          }))
                        }
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-brand-paper/50 transition"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">📦</span>
                          <h3 className="text-base font-semibold text-brand-foreground">
                            Envelope Contract
                          </h3>
                        </div>
                        <span className="text-brand-accent">
                          {expandedSections.envelope ? "▼" : "▶"}
                        </span>
                      </button>
                      {expandedSections.envelope && (
                        <div className="px-4 pb-4 space-y-4 max-h-96 overflow-y-auto">
                          <div>
                            <p className="mb-2 text-xs font-semibold text-brand-accent uppercase tracking-wide">
                              Required Keys
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {data.envelopeContract.requiredKeys &&
                              data.envelopeContract.requiredKeys.length > 0 ? (
                                data.envelopeContract.requiredKeys.map(
                                  (key, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-1 rounded-md bg-brand-accent/15 px-3 py-1.5 text-xs font-medium text-brand-accent border border-brand-accent/30"
                                    >
                                      <span className="text-brand-accent">
                                        ●
                                      </span>
                                      {key}
                                    </span>
                                  ),
                                )
                              ) : (
                                <span className="text-xs text-semantic-muted italic">
                                  None
                                </span>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="mb-2 text-xs font-semibold text-brand-accent uppercase tracking-wide">
                              Required Data Keys
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {data.envelopeContract.requiredDataKeys &&
                              data.envelopeContract.requiredDataKeys.length >
                                0 ? (
                                data.envelopeContract.requiredDataKeys.map(
                                  (key, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-1 rounded-md bg-blue-500/15 px-3 py-1.5 text-xs font-medium text-blue-400 border border-blue-500/30"
                                    >
                                      <span className="text-blue-400">●</span>
                                      {key}
                                    </span>
                                  ),
                                )
                              ) : (
                                <span className="text-xs text-semantic-muted italic">
                                  None
                                </span>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="mb-2 text-xs font-semibold text-brand-accent uppercase tracking-wide">
                              Required UI Keys
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {data.envelopeContract.requiredUiKeys &&
                              data.envelopeContract.requiredUiKeys.length >
                                0 ? (
                                data.envelopeContract.requiredUiKeys.map(
                                  (key, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-1 rounded-md bg-green-500/15 px-3 py-1.5 text-xs font-medium text-green-400 border border-green-500/30"
                                    >
                                      <span className="text-green-400">●</span>
                                      {key}
                                    </span>
                                  ),
                                )
                              ) : (
                                <span className="text-xs text-semantic-muted italic">
                                  None
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Reminders - Collapsible (Yellow/Warning Theme) */}
                  {data.reminders && data.reminders.length > 0 && (
                    <section>
                      <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 overflow-hidden shadow-sm">
                        <button
                          onClick={() =>
                            setExpandedSections((prev) => ({
                              ...prev,
                              reminders: !prev.reminders,
                            }))
                          }
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-yellow-500/20 transition"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">⚠️</span>
                            <h3 className="text-base font-semibold text-yellow-300">
                              Reminders
                            </h3>
                          </div>
                          <span className="text-yellow-300">
                            {expandedSections.reminders ? "▼" : "▶"}
                          </span>
                        </button>
                        {expandedSections.reminders && (
                          <div className="px-4 pb-4 max-h-80 overflow-y-auto">
                            <ul className="space-y-2">
                              {data.reminders.map((reminder, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2 text-sm text-yellow-100"
                                >
                                  <span className="text-yellow-400 mt-0.5">
                                    •
                                  </span>
                                  <span>{reminder}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {/* System Prompt - Advanced/Technical Section */}
                  <section>
                    <div className="rounded-xl border border-purple-500/40 bg-purple-500/10 overflow-hidden shadow-sm">
                      <button
                        onClick={() =>
                          setExpandedSections((prev) => ({
                            ...prev,
                            systemPrompt: !prev.systemPrompt,
                          }))
                        }
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-purple-500/20 transition"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🔧</span>
                          <div>
                            <h3 className="text-base font-semibold text-purple-300">
                              System Prompt (Advanced)
                            </h3>
                            <p className="text-xs text-purple-400/70 mt-0.5">
                              Full technical prompt for developers
                            </p>
                          </div>
                        </div>
                        <span className="text-purple-300">
                          {expandedSections.systemPrompt ? "▼" : "▶"}
                        </span>
                      </button>
                      {expandedSections.systemPrompt && (
                        <div className="px-4 pb-4">
                          <div className="mb-3 rounded-lg bg-purple-900/30 border border-purple-500/30 p-3">
                            <p className="text-xs text-purple-300">
                              ⚠️ <strong>Developer Only:</strong> This is the
                              raw system prompt including technical
                              instructions, JSON schemas, and examples.
                            </p>
                          </div>
                          <div className="max-h-96 overflow-y-auto rounded-lg bg-black/20 p-4">
                            <div className="prose prose-sm prose-invert max-w-none text-semantic-muted">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {data.mission}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* LLM Configuration - Collapsible */}
                  {data.llmConfig && (
                    <section>
                      <div className="rounded-xl border border-brand-outline/50 bg-brand-paper/30 overflow-hidden shadow-sm">
                        <button
                          onClick={() =>
                            setExpandedSections((prev) => ({
                              ...prev,
                              llmConfig: !prev.llmConfig,
                            }))
                          }
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-brand-paper/50 transition"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">⚙️</span>
                            <h3 className="text-base font-semibold text-brand-foreground">
                              LLM Configuration
                            </h3>
                          </div>
                          <span className="text-brand-accent">
                            {expandedSections.llmConfig ? "▼" : "▶"}
                          </span>
                        </button>
                        {expandedSections.llmConfig && (
                          <div className="px-4 pb-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-lg bg-brand-paperElev p-3 border border-brand-outline/30">
                                <p className="text-xs font-semibold text-brand-accent uppercase tracking-wide mb-1">
                                  Temperature
                                </p>
                                <p className="text-sm font-mono text-brand-foreground">
                                  {data.llmConfig.temperature ?? "N/A"}
                                </p>
                              </div>
                              <div className="rounded-lg bg-brand-paperElev p-3 border border-brand-outline/30">
                                <p className="text-xs font-semibold text-brand-accent uppercase tracking-wide mb-1">
                                  Top P
                                </p>
                                <p className="text-sm font-mono text-brand-foreground">
                                  {data.llmConfig.top_p ?? "N/A"}
                                </p>
                              </div>
                              <div className="rounded-lg bg-brand-paperElev p-3 border border-brand-outline/30">
                                <p className="text-xs font-semibold text-brand-accent uppercase tracking-wide mb-1">
                                  Response Format
                                </p>
                                <p className="text-sm font-mono text-brand-foreground">
                                  {data.llmConfig.response_format ?? "N/A"}
                                </p>
                              </div>
                              <div className="rounded-lg bg-brand-paperElev p-3 border border-brand-outline/30">
                                <p className="text-xs font-semibold text-brand-accent uppercase tracking-wide mb-1">
                                  Max Tokens
                                </p>
                                <p className="text-sm font-mono text-brand-foreground">
                                  {data.llmConfig.max_tokens ?? "N/A"}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {/* Notes - Collapsible */}
                  {data.notes && (
                    <section>
                      <div className="rounded-xl border border-brand-outline/50 bg-brand-paper/30 overflow-hidden shadow-sm">
                        <button
                          onClick={() =>
                            setExpandedSections((prev) => ({
                              ...prev,
                              notes: !prev.notes,
                            }))
                          }
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-brand-paper/50 transition"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">📝</span>
                            <h3 className="text-base font-semibold text-brand-foreground">
                              Notes
                            </h3>
                          </div>
                          <span className="text-brand-accent">
                            {expandedSections.notes ? "▼" : "▶"}
                          </span>
                        </button>
                        {expandedSections.notes && (
                          <div className="px-4 pb-4 max-h-80 overflow-y-auto">
                            <div className="prose prose-sm prose-invert max-w-none text-semantic-muted">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {data.notes}
                              </ReactMarkdown>
                            </div>
                          </div>
                        )}
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
