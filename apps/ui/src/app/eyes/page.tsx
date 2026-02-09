"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Eye as EyeIconLucide, Sparkles, Settings } from "lucide-react";
import { EyeIcon } from "@/components/EyeIcon";
import { GlassCard } from "@/components/ui/GlassCard";
import { useDialog } from "@/hooks/useDialog";
import { EmptyState } from "@/components/EmptyState";
import { HelpIcon } from "@/components/HelpIcon";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { UI_HELP_TEXT } from "@third-eye/constants";
import { PersonaWizardModal } from "@/components/persona-form/PersonaWizardModal";
import { CustomEyeWizard } from "@/components/custom-eye-form/CustomEyeWizard";
import { EyeWizardModal } from "@/components/eye-wizard/EyeWizardModal";
import type { Eye, Persona } from "@third-eye/types";
import { API_BASE_URL } from "@/consts/api";
import {
  STATUS_TEXT_COLORS,
  STATUS_BG_COLORS_SUBTLE,
  STATUS_BG_COLORS,
  STATUS_BORDER_COLORS_SUBTLE,
} from "@/constants/color-mappings";
import { TIMING, ANIMATION_DURATION } from "@/constants/timing";

/**
 * Extended Eye type for UI display. The backend API may return fields under
 * different names than the DB schema (e.g., `capabilities` instead of
 * `capabilityTags`). This type extends the shared Eye with those optional
 * UI-enriched fields.
 */
interface UiEye extends Omit<Eye, "version"> {
  version: number | string;
  capabilities?: string[];
  personaTemplate?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  defaultRouting?: Record<string, unknown>;
}

interface CreateEyePayload {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  readonly outputSchema: Record<string, unknown>;
  readonly iconSvg?: string;
  readonly personaId?: string;
}

interface UpdateEyePayload {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  readonly outputSchema: Record<string, unknown>;
  readonly iconSvg?: string;
  readonly personaId?: string;
}

interface EyeTestResult {
  readonly success: boolean;
  readonly output?: Record<string, unknown>;
  readonly error?: string;
}

export default function EyesPage() {
  const dialog = useDialog();
  const [eyes, setEyes] = useState<UiEye[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedEye, setSelectedEye] = useState<UiEye | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testInput, setTestInput] = useState("");
  const [testResult, setTestResult] = useState<EyeTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Phase 15: Persona configuration modal
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [selectedPersonaEye, setSelectedPersonaEye] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Eye editing wizard modal
  const [isEyeWizardOpen, setIsEyeWizardOpen] = useState(false);
  const [selectedEyeForEdit, setSelectedEyeForEdit] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    iconSvg: "", // SVG content (not path)
    inputSchema:
      '{\n  "type": "object",\n  "properties": {\n    "input": {"type": "string"}\n  },\n  "required": ["input"]\n}',
    outputSchema:
      '{\n  "type": "object",\n  "properties": {\n    "result": {"type": "string"}\n  }\n}',
    personaTemplate: "",
    personaId: "",
  });

  // Original form state for detecting changes
  const [originalFormData, setOriginalFormData] = useState(formData);

  useEffect(() => {
    fetchEyes();
    fetchPersonas();
  }, []);

  const fetchPersonas = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/personas`);
      if (response.ok) {
        const result = await response.json();
        setPersonas(result.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch personas:", error);
    }
  };

  useEffect(() => {
    if (error) {
      const timer = setTimeout(
        () => setError(null),
        TIMING.MESSAGE_AUTO_DISMISS_MS,
      );
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(
        () => setSuccess(null),
        TIMING.MESSAGE_AUTO_DISMISS_MS,
      );
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchEyes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/eyes/all`);
      if (!response.ok) {
        throw new Error(`Failed to load eyes (status ${response.status})`);
      }

      const payload = await response.json();
      let allEyesData: UiEye[] = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

      if (allEyesData.length === 0) {
        setError(UI_HELP_TEXT.ERROR_EYES_NO_REGISTRY);
      } else {
        setError(null);
      }

      // Enrich with capabilities from blueprints (call server API directly)
      const enrichedEyesData = await Promise.all(
        allEyesData.map(async (eye: UiEye) => {
          if (!eye.capabilities) {
            try {
              const blueprintRes = await fetch(
                `${API_BASE_URL}/api/personas/blueprints/${eye.id}`,
              );
              if (blueprintRes.ok) {
                const blueprint = await blueprintRes.json();
                // Safely extract capabilities with null checks
                // Backend may return capabilities at data.capabilities, data.metadata.capabilities, or data root
                if (blueprint.success && blueprint.data) {
                  const data = blueprint.data;
                  const capabilities =
                    data.capabilities ??
                    data.metadata?.capabilities ??
                    data.metadataJson?.capabilities ??
                    [];
                  if (Array.isArray(capabilities) && capabilities.length > 0) {
                    return { ...eye, capabilities };
                  }
                }
              }
            } catch (e) {
              console.debug(`Could not fetch capabilities for ${eye.id}:`, e);
            }
          }
          return eye;
        }),
      );

      setEyes(enrichedEyesData);
    } catch (error) {
      console.error("Failed to fetch eyes:", error);
      setError(UI_HELP_TEXT.ERROR_EYES_LOAD_FAILED);
      setEyes([]);
    }
  };

  const startCreating = () => {
    const initialData = {
      name: "",
      description: "",
      iconSvg: "",
      inputSchema:
        '{\n  "type": "object",\n  "properties": {\n    "input": {"type": "string"}\n  },\n  "required": ["input"]\n}',
      outputSchema:
        '{\n  "type": "object",\n  "properties": {\n    "result": {"type": "string"}\n  }\n}',
      personaTemplate: "",
      personaId: "",
    };
    setFormData(initialData);
    setOriginalFormData(initialData);
    setHasUnsavedChanges(false);
    setIsCreating(true);
    setSelectedEye(null);
  };

  const viewEye = (eye: UiEye) => {
    setSelectedEye(eye);
    setIsCreating(false);
    setIsEditing(false);
    setIsTesting(false);
    setTestResult(null);
    setHasUnsavedChanges(false);

    // All eyes are now editable
    const data = {
      name: eye.name,
      description: eye.description,
      iconSvg: eye.iconSvg ?? "",
      inputSchema: JSON.stringify(
        eye.inputSchema ?? eye.inputSchemaJson ?? {},
        null,
        2,
      ),
      outputSchema: JSON.stringify(
        eye.outputSchema ?? eye.outputSchemaJson ?? {},
        null,
        2,
      ),
      personaTemplate: eye.personaTemplate || "",
      personaId: eye.personaId || "",
    };
    setFormData(data);
    setOriginalFormData(data);
  };

  const discardChanges = () => {
    setFormData(originalFormData);
    setHasUnsavedChanges(false);
  };

  const cancelForm = async () => {
    if (hasUnsavedChanges) {
      const confirmed = await dialog.confirm(
        UI_HELP_TEXT.EYES_DIALOG_DISCARD_TITLE,
        UI_HELP_TEXT.EYES_DIALOG_DISCARD_MESSAGE,
        UI_HELP_TEXT.EYES_DIALOG_DISCARD_CONFIRM,
        UI_HELP_TEXT.EYES_BUTTON_CANCEL,
      );
      if (!confirmed) {
        return;
      }
    }
    setIsCreating(false);
    setIsEditing(false);
    setSelectedEye(null);
    setIsTesting(false);
    setTestResult(null);
    setTestInput("");
    setHasUnsavedChanges(false);
  };

  const saveEye = async () => {
    if (!formData.name || !formData.description) {
      setError(
        formData.name
          ? UI_HELP_TEXT.ERROR_EYE_DESCRIPTION_REQUIRED
          : UI_HELP_TEXT.ERROR_EYE_NAME_REQUIRED,
      );
      return;
    }

    let inputSchema, outputSchema;
    try {
      inputSchema = JSON.parse(formData.inputSchema);
      outputSchema = JSON.parse(formData.outputSchema);
    } catch (error) {
      setError(UI_HELP_TEXT.ERROR_EYE_INVALID_SCHEMA);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload: CreateEyePayload = {
        name: formData.name,
        description: formData.description,
        inputSchema,
        outputSchema,
        ...(formData.iconSvg && { iconSvg: formData.iconSvg }),
        ...(formData.personaId && { personaId: formData.personaId }),
      };

      const response = await fetch(`${API_BASE_URL}/api/eyes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSuccess(UI_HELP_TEXT.EYES_SUCCESS_CREATED);
        setHasUnsavedChanges(false);
        await fetchEyes();
        cancelForm();
      } else {
        const result = await response.json();
        console.error("Custom eye creation failed:", result);
        setError(
          result.error?.detail ||
            result.error?.title ||
            UI_HELP_TEXT.EYES_ERROR_CREATE_FALLBACK,
        );
      }
    } catch (error) {
      console.error("Custom eye creation error:", error);
      setError(UI_HELP_TEXT.ERROR_EYE_SAVE_FAILED);
    } finally {
      setLoading(false);
    }
  };

  // Track form changes
  useEffect(() => {
    if (isCreating || isEditing) {
      const hasChanges =
        JSON.stringify(formData) !== JSON.stringify(originalFormData);
      setHasUnsavedChanges(hasChanges);
    }
  }, [formData, originalFormData, isCreating, isEditing]);

  const updateEye = async () => {
    if (!selectedEye || !formData.description) {
      setError(UI_HELP_TEXT.ERROR_EYE_DESCRIPTION_REQUIRED);
      return;
    }

    let inputSchema, outputSchema;
    try {
      inputSchema = JSON.parse(formData.inputSchema);
      outputSchema = JSON.parse(formData.outputSchema);
    } catch (error) {
      setError(UI_HELP_TEXT.ERROR_EYE_INVALID_SCHEMA);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload: UpdateEyePayload = {
        name: formData.name,
        description: formData.description,
        inputSchema,
        outputSchema,
        ...(formData.iconSvg && { iconSvg: formData.iconSvg }),
        ...(formData.personaId && { personaId: formData.personaId }),
      };

      const response = await fetch(
        `${API_BASE_URL}/api/eyes/custom/${selectedEye.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (response.ok) {
        setSuccess(UI_HELP_TEXT.EYES_SUCCESS_UPDATED);
        setHasUnsavedChanges(false);
        setIsEditing(false);
        await fetchEyes();
        cancelForm();
      } else {
        const result = await response.json();
        setError(
          result.error?.detail || UI_HELP_TEXT.EYES_ERROR_UPDATE_FALLBACK,
        );
      }
    } catch (error) {
      setError(UI_HELP_TEXT.ERROR_EYE_UPDATE_FAILED);
    } finally {
      setLoading(false);
    }
  };

  const deleteEye = async (eyeId: string) => {
    const confirmed = await dialog.confirm(
      UI_HELP_TEXT.EYES_DIALOG_DELETE_TITLE,
      UI_HELP_TEXT.EYES_DIALOG_DELETE_MESSAGE,
      UI_HELP_TEXT.EYES_DIALOG_DELETE_CONFIRM,
      UI_HELP_TEXT.EYES_BUTTON_CANCEL,
    );
    if (!confirmed) {
      return;
    }

    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/eyes/custom/${eyeId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSuccess(UI_HELP_TEXT.EYES_SUCCESS_DELETED);
        await fetchEyes();
        cancelForm();
      } else {
        const result = await response.json();
        setError(result.error?.detail || UI_HELP_TEXT.ERROR_EYE_DELETE_FAILED);
      }
    } catch (error) {
      setError(UI_HELP_TEXT.ERROR_EYE_DELETE_FAILED);
    }
  };

  const testEye = async () => {
    if (!selectedEye || !testInput) {
      setError(UI_HELP_TEXT.ERROR_EYE_TEST_INPUT_REQUIRED);
      return;
    }

    setLoading(true);
    setError(null);
    setTestResult(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/eyes/custom/${selectedEye.id}/test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testInput }),
        },
      );

      if (response.ok) {
        const result = await response.json();
        setTestResult(result.data);
        setSuccess(UI_HELP_TEXT.EYES_SUCCESS_TEST_COMPLETED);
      } else {
        const result = await response.json();
        setError(result.error?.detail || UI_HELP_TEXT.ERROR_EYE_TEST_FAILED);
      }
    } catch (error) {
      setError(UI_HELP_TEXT.ERROR_EYE_TEST_FAILED);
    } finally {
      setLoading(false);
    }
  };

  const getEyeColor = (_eyeId: string) => {
    // All cards use consistent brand tokens
    return "border-brand-outline/40 bg-brand-paper/10";
  };

  const toHumanReadable = (text: string) => {
    return text
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Phase 15: Persona configuration handlers
  const openPersonaConfig = (eye: UiEye) => {
    setSelectedPersonaEye({ id: eye.id, name: eye.name });
    setIsPersonaModalOpen(true);
  };

  const closePersonaConfig = () => {
    setIsPersonaModalOpen(false);
    setSelectedPersonaEye(null);
  };

  const handlePersonaSaved = () => {
    setSuccess(UI_HELP_TEXT.EYES_SUCCESS_PERSONA_SAVED);
    fetchEyes(); // Refresh eyes list to show updated persona status
  };

  // Eye wizard handlers
  const openEyeWizard = (eye: UiEye) => {
    setSelectedEyeForEdit({ id: eye.id, name: eye.name });
    setIsEyeWizardOpen(true);
  };

  const closeEyeWizard = () => {
    setIsEyeWizardOpen(false);
    setSelectedEyeForEdit(null);
  };

  const handleEyeSaved = () => {
    setSuccess(UI_HELP_TEXT.EYES_SUCCESS_UPDATED);
    fetchEyes(); // Refresh eyes list
  };

  return (
    <div className="min-h-screen bg-brand-paper">
      {/* Header */}
      <div className="border-b border-brand-outline/60 bg-brand-paperElev/50">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="text-semantic-muted transition-colors hover:text-brand-accent"
                aria-label={UI_HELP_TEXT.ARIA_NAV_HOME}
              >
                {UI_HELP_TEXT.EYES_NAV_HOME}
              </Link>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">
                  {UI_HELP_TEXT.EYES_SECTION_LABEL}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <h1 className="text-2xl font-semibold text-brand-foreground">
                    {UI_HELP_TEXT.EYES_HEADER_TITLE}
                  </h1>
                  <HelpIcon helpTextKey="EYES_PAGE_TITLE" size="md" />
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <Link
                href="/personas"
                className="text-sm text-semantic-muted transition-colors hover:text-brand-foreground"
                aria-label={UI_HELP_TEXT.ARIA_NAV_PERSONAS}
              >
                {UI_HELP_TEXT.EYES_NAV_PERSONAS}
              </Link>
              <div className="flex items-center gap-2">
                <button
                  onClick={startCreating}
                  aria-label={UI_HELP_TEXT.ARIA_CREATE_EYE}
                  className={`rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-foreground transition-all ${ANIMATION_DURATION.FAST} hover:bg-brand-primary hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-ink active:scale-95`}
                >
                  {UI_HELP_TEXT.EYES_BUTTON_CREATE}
                </button>
                <HelpIcon helpTextKey="EYES_CREATE_BUTTON" size="sm" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-auto max-w-7xl px-6 pt-4">
          <div
            role="alert"
            aria-live="assertive"
            aria-label={UI_HELP_TEXT.ARIA_ERROR_REGION}
            className={`rounded-xl border ${STATUS_BORDER_COLORS_SUBTLE.error} ${STATUS_BG_COLORS_SUBTLE.error} p-4 ${STATUS_TEXT_COLORS.error}`}
          >
            {error}
          </div>
        </div>
      )}

      {success && (
        <div className="mx-auto max-w-7xl px-6 pt-4">
          <div
            role="alert"
            aria-live="polite"
            aria-label={UI_HELP_TEXT.ARIA_SUCCESS_REGION}
            className={`rounded-xl border ${STATUS_BORDER_COLORS_SUBTLE.success} ${STATUS_BG_COLORS_SUBTLE.success} p-4 ${STATUS_TEXT_COLORS.success}`}
          >
            {success}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-6 py-8">
        {isCreating || isEditing ? (
          /* CustomEyeWizard - Full page visual schema builder */
          <CustomEyeWizard
            initialData={formData}
            eyeId={selectedEye?.id}
            onSave={async (data) => {
              setFormData(data);
              if (isCreating) {
                await saveEye();
              } else {
                await updateEye();
              }
            }}
            onCancel={cancelForm}
          />
        ) : isTesting ||
          (selectedEye && !isCreating && !isEditing && !isTesting) ? (
          /* Test Panel and View Mode */
          <GlassCard>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-brand-foreground">
                {isTesting
                  ? UI_HELP_TEXT.EYES_FORM_TITLE_TEST.replace(
                      "{eyeName}",
                      selectedEye?.name || "",
                    )
                  : UI_HELP_TEXT.EYES_FORM_TITLE_VIEW.replace(
                      "{eyeName}",
                      selectedEye?.name || "",
                    )}
              </h2>
              <div className="flex gap-3">
                {isTesting ? (
                  <>
                    <button
                      onClick={cancelForm}
                      aria-label={UI_HELP_TEXT.ARIA_CLOSE_TEST}
                      className="rounded-full border border-brand-outline/50 px-5 py-2 text-sm font-semibold text-semantic-muted transition hover:border-brand-accent hover:text-brand-accent"
                    >
                      {UI_HELP_TEXT.EYES_BUTTON_CLOSE_TEST}
                    </button>
                    <button
                      onClick={testEye}
                      disabled={loading || !testInput}
                      aria-label={UI_HELP_TEXT.ARIA_RUN_TEST}
                      className={`rounded-full ${STATUS_BG_COLORS.success} px-5 py-2 text-sm font-semibold text-brand-foreground transition hover:bg-semantic-success/80 disabled:opacity-50`}
                    >
                      {loading
                        ? UI_HELP_TEXT.EYES_BUTTON_TESTING
                        : UI_HELP_TEXT.EYES_BUTTON_RUN_TEST}
                    </button>
                  </>
                ) : (
                  /* View mode for custom eyes */
                  <>
                    <button
                      onClick={() => selectedEye && openEyeWizard(selectedEye)}
                      aria-label={UI_HELP_TEXT.ARIA_EDIT_EYE}
                      className="rounded-full border border-brand-accent px-5 py-2 text-sm font-semibold text-brand-accent transition hover:bg-brand-accent/10"
                    >
                      {UI_HELP_TEXT.EYES_BUTTON_EDIT}
                    </button>
                    <button
                      onClick={() => setIsTesting(true)}
                      aria-label={UI_HELP_TEXT.ARIA_TEST_EYE}
                      className={`rounded-full ${STATUS_BG_COLORS.success} px-5 py-2 text-sm font-semibold text-brand-foreground transition hover:bg-semantic-success/80`}
                    >
                      {UI_HELP_TEXT.EYES_BUTTON_TEST}
                    </button>
                    <button
                      onClick={() => selectedEye && deleteEye(selectedEye.id)}
                      aria-label={UI_HELP_TEXT.ARIA_DELETE_EYE}
                      className={`rounded-full ${STATUS_BG_COLORS.error} px-5 py-2 text-sm font-semibold text-brand-foreground transition hover:bg-semantic-error/80`}
                    >
                      {UI_HELP_TEXT.EYES_BUTTON_DELETE}
                    </button>
                  </>
                )}
              </div>
            </div>

            {isTesting ? (
              /* Test Panel */
              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-semantic-muted">
                    {UI_HELP_TEXT.EYES_FORM_LABEL_TEST_INPUT}
                  </label>
                  <textarea
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder={UI_HELP_TEXT.EYES_PLACEHOLDER_TEST_INPUT}
                    className="h-40 w-full resize-none rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-brand-foreground placeholder-brand-outline/60 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                  />
                </div>

                {testResult && (
                  <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-5">
                    <h3 className="mb-3 text-lg font-semibold text-brand-foreground">
                      {UI_HELP_TEXT.EYES_FORM_LABEL_TEST_RESULT}
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-semantic-muted">
                          {UI_HELP_TEXT.EYES_FORM_LABEL_TEST_RESULT_EYE}{" "}
                          {testResult.eyeName}
                        </p>
                      </div>
                      <div>
                        <p className="mb-2 text-sm font-medium text-semantic-muted">
                          {UI_HELP_TEXT.EYES_FORM_LABEL_TEST_RESULT_RESPONSE}
                        </p>
                        <pre
                          className={`overflow-x-auto rounded-lg bg-brand-paperElev p-4 text-xs ${STATUS_TEXT_COLORS.success}`}
                        >
                          {JSON.stringify(testResult.response, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* View Mode for Custom Eyes */
              <div className="space-y-6">
                {selectedEye && (
                  <>
                    {/* Basic Information */}
                    <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-5">
                      <h3 className="mb-3 text-lg font-semibold text-brand-foreground">
                        Basic Information
                      </h3>
                      <dl className="space-y-2">
                        <div>
                          <dt className="text-sm font-medium text-semantic-muted">
                            Eye Name
                          </dt>
                          <dd className="mt-1 text-brand-foreground">
                            {selectedEye.name}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-semantic-muted">
                            Description
                          </dt>
                          <dd className="mt-1 text-brand-foreground">
                            {selectedEye.description}
                          </dd>
                        </div>
                        {selectedEye.iconSvg && (
                          <div>
                            <dt className="text-sm font-medium text-semantic-muted">
                              Icon
                            </dt>
                            <dd className="mt-2">
                              <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-brand-outline/50 bg-brand-paperElev p-2">
                                <div
                                  dangerouslySetInnerHTML={{
                                    __html: selectedEye.iconSvg,
                                  }}
                                  className="h-full w-full"
                                />
                              </div>
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>

                    {/* Input Schema */}
                    <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-5">
                      <h3 className="mb-3 text-lg font-semibold text-brand-foreground">
                        Input Schema
                      </h3>
                      <pre
                        className={`overflow-x-auto rounded-lg bg-brand-paperElev p-4 text-xs ${STATUS_TEXT_COLORS.success}`}
                      >
                        {JSON.stringify(
                          selectedEye.inputSchema ??
                            selectedEye.inputSchemaJson ??
                            {},
                          null,
                          2,
                        )}
                      </pre>
                    </div>

                    {/* Output Schema */}
                    <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-5">
                      <h3 className="mb-3 text-lg font-semibold text-brand-foreground">
                        Output Schema
                      </h3>
                      <pre
                        className={`overflow-x-auto rounded-lg bg-brand-paperElev p-4 text-xs ${STATUS_TEXT_COLORS.success}`}
                      >
                        {JSON.stringify(
                          selectedEye.outputSchema ??
                            selectedEye.outputSchemaJson ??
                            {},
                          null,
                          2,
                        )}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            )}
          </GlassCard>
        ) : (
          /* Eyes Grid */
          <div>
            {/* Eyes Grid */}
            {loading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {eyes.map((eye, index) => (
                  <motion.div
                    key={eye.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
                    className={`rounded-2xl border p-6 shadow-lg transition-all ${ANIMATION_DURATION.NORMAL} hover:shadow-2xl hover:border-brand-accent/50 ${getEyeColor(eye.id)}`}
                  >
                    <Link href={`/eyes/${eye.id}`} className="block">
                      <div className="mb-4 text-center">
                        <div className="mb-3 flex justify-center">
                          <EyeIcon eye={eye.name} size={64} />
                        </div>
                        <h3 className="mb-1 text-xl font-bold text-brand-foreground">
                          {eye.name}
                        </h3>
                        <div className="mb-2 flex items-center justify-center gap-2">
                          <span className="text-sm text-brand-foreground/80">
                            v{eye.version}
                          </span>
                        </div>

                        {/* Capabilities pills if available */}
                        {eye.capabilities && eye.capabilities.length > 0 && (
                          <div className="mb-3 flex flex-wrap justify-center gap-2">
                            {eye.capabilities.map((cap, idx) => (
                              <span
                                key={idx}
                                className="rounded-full bg-brand-accent/20 px-2 py-1 text-xs text-brand-accent"
                              >
                                {toHumanReadable(cap)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <p className="line-clamp-3 text-center text-sm text-brand-foreground/90">
                        {eye.description}
                      </p>
                    </Link>

                    {/* Phase 15: Configure Persona button */}
                    <div className="mt-4 border-t border-white/20 pt-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openPersonaConfig(eye);
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-accent/10 px-4 py-2 text-sm font-medium text-brand-accent transition-all hover:bg-brand-accent/20 hover:scale-105 active:scale-95"
                      >
                        <Settings className="h-4 w-4" />
                        {UI_HELP_TEXT.EYES_BUTTON_CONFIGURE_PERSONA}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {!loading && eyes.length === 0 && (
              <EmptyState
                icon={EyeIcon}
                title={UI_HELP_TEXT.EYES_EMPTY_ALL_TITLE}
                description={UI_HELP_TEXT.EYES_EMPTY_ALL_DESCRIPTION}
                actions={[
                  {
                    label: UI_HELP_TEXT.EYES_EMPTY_ACTION_CREATE,
                    onClick: startCreating,
                    variant: "primary",
                  },
                ]}
              />
            )}
          </div>
        )}
      </div>

      {/* Phase 15: Persona Configuration Modal */}
      {selectedPersonaEye && (
        <PersonaWizardModal
          isOpen={isPersonaModalOpen}
          eyeId={selectedPersonaEye.id}
          eyeName={selectedPersonaEye.name}
          onClose={closePersonaConfig}
          onSave={handlePersonaSaved}
        />
      )}

      {/* Eye Editing Wizard Modal */}
      {selectedEyeForEdit && (
        <EyeWizardModal
          isOpen={isEyeWizardOpen}
          eyeId={selectedEyeForEdit.id}
          eyeName={selectedEyeForEdit.name}
          onClose={closeEyeWizard}
          onSuccess={handleEyeSaved}
        />
      )}
    </div>
  );
}
