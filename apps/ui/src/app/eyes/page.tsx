'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Eye as EyeIcon, Sparkles, Settings } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useDialog } from '@/hooks/useDialog';
import { EmptyState } from '@/components/EmptyState';
import { HelpIcon } from '@/components/HelpIcon';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { UI_HELP_TEXT } from '@third-eye/constants';
import { PersonaWizardModal } from '@/components/persona-form/PersonaWizardModal';
import { CustomEyeWizard } from '@/components/custom-eye-form/CustomEyeWizard';

interface Eye {
  id: string;
  name: string;
  version: string;
  description: string;
  source: 'built-in' | 'custom';
  capabilities?: string[];
  personaTemplate?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  defaultRouting?: Record<string, unknown>;
  createdAt?: string;
  personaId?: string | null;
}

interface Persona {
  id: string;
  name: string;
  eye: string;
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
  const [eyes, setEyes] = useState<Eye[]>([]);
  const [builtInEyes, setBuiltInEyes] = useState<Eye[]>([]);
  const [customEyes, setCustomEyes] = useState<Eye[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedEye, setSelectedEye] = useState<Eye | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'built-in' | 'custom'>('all');
  const [isTesting, setIsTesting] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<EyeTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Phase 15: Persona configuration modal
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [selectedPersonaEye, setSelectedPersonaEye] = useState<{ id: string; name: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    iconSvg: '', // SVG content (not path)
    inputSchema: '{\n  "type": "object",\n  "properties": {\n    "input": {"type": "string"}\n  },\n  "required": ["input"]\n}',
    outputSchema: '{\n  "type": "object",\n  "properties": {\n    "result": {"type": "string"}\n  }\n}',
    personaTemplate: '',
    personaId: '',
  });

  // Original form state for detecting changes
  const [originalFormData, setOriginalFormData] = useState(formData);

  useEffect(() => {
    fetchEyes();
    fetchPersonas();
  }, []);

  const fetchPersonas = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
      const response = await fetch(`${API_URL}/api/personas`);
      if (response.ok) {
        const result = await response.json();
        setPersonas(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch personas:', error);
    }
  };

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchEyes = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
      const response = await fetch(`${API_URL}/api/eyes/all`);
      if (!response.ok) {
        throw new Error(`Failed to load eyes (status ${response.status})`);
      }

      const payload = await response.json();
      let allEyesData: Eye[] = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

      if (allEyesData.length === 0) {
        // Fallback: pull built-in registry so UI never renders empty during outages
        const registryResponse = await fetch(`${API_URL}/api/eyes/registry`);
        if (registryResponse.ok) {
          const registryPayload = await registryResponse.json();
          const registryEyes: Eye[] = Array.isArray(registryPayload?.data)
            ? registryPayload.data
            : [];
          allEyesData = registryEyes.map((eye) => ({
            ...eye,
            source: eye.source ?? 'built-in',
          }));
        }
      }

      if (allEyesData.length === 0) {
        setError(UI_HELP_TEXT.ERROR_EYES_NO_REGISTRY);
      } else {
        setError(null);
      }

      // Enrich with capabilities from blueprints (call server API directly)
      const enrichedEyesData = await Promise.all(
        allEyesData.map(async (eye: Eye) => {
          if (!eye.capabilities) {
            try {
              const blueprintRes = await fetch(`${API_URL}/api/personas/blueprints/${eye.id}`);
              if (blueprintRes.ok) {
                const blueprint = await blueprintRes.json();
                if (blueprint.success && blueprint.data && blueprint.data.capabilities) {
                  return { ...eye, capabilities: blueprint.data.capabilities };
                }
              }
            } catch (e) {
              console.debug(`Could not fetch capabilities for ${eye.id}:`, e);
            }
          }
          return eye;
        })
      );

      setEyes(enrichedEyesData);
      setBuiltInEyes(enrichedEyesData.filter((e: Eye) => (e.source ?? 'built-in') === 'built-in'));
      setCustomEyes(enrichedEyesData.filter((e: Eye) => e.source === 'custom'));
    } catch (error) {
      console.error('Failed to fetch eyes:', error);
      setError(UI_HELP_TEXT.ERROR_EYES_LOAD_FAILED);
      setEyes([]);
      setBuiltInEyes([]);
      setCustomEyes([]);
    }
  };

  const getFilteredEyes = () => {
    if (viewMode === 'built-in') return builtInEyes;
    if (viewMode === 'custom') return customEyes;
    return eyes;
  };

  const startCreating = () => {
    const initialData = {
      name: '',
      description: '',
      iconSvg: '',
      inputSchema: '{\n  "type": "object",\n  "properties": {\n    "input": {"type": "string"}\n  },\n  "required": ["input"]\n}',
      outputSchema: '{\n  "type": "object",\n  "properties": {\n    "result": {"type": "string"}\n  }\n}',
      personaTemplate: '',
      personaId: '',
    };
    setFormData(initialData);
    setOriginalFormData(initialData);
    setHasUnsavedChanges(false);
    setIsCreating(true);
    setSelectedEye(null);
  };

  const viewEye = (eye: Eye) => {
    setSelectedEye(eye);
    setIsCreating(false);
    setIsEditing(false);
    setIsTesting(false);
    setTestResult(null);
    setHasUnsavedChanges(false);

    if (eye.source === 'custom') {
      const data = {
        name: eye.name,
        description: eye.description,
        iconSvg: (eye as any).iconSvg || '',
        inputSchema: JSON.stringify(eye.inputSchema, null, 2),
        outputSchema: JSON.stringify(eye.outputSchema, null, 2),
        personaTemplate: eye.personaTemplate || '',
        personaId: eye.personaId || '',
      };
      setFormData(data);
      setOriginalFormData(data);
    }
  };

  const discardChanges = () => {
    setFormData(originalFormData);
    setHasUnsavedChanges(false);
  };

  const cancelForm = async () => {
    if (hasUnsavedChanges) {
      const confirmed = await dialog.confirm(UI_HELP_TEXT.EYES_DIALOG_DISCARD_TITLE, UI_HELP_TEXT.EYES_DIALOG_DISCARD_MESSAGE, UI_HELP_TEXT.EYES_DIALOG_DISCARD_CONFIRM, UI_HELP_TEXT.EYES_BUTTON_CANCEL);
      if (!confirmed) {
        return;
      }
    }
    setIsCreating(false);
    setIsEditing(false);
    setSelectedEye(null);
    setIsTesting(false);
    setTestResult(null);
    setTestInput('');
    setHasUnsavedChanges(false);
  };

  const saveEye = async () => {
    if (!formData.name || !formData.description) {
      setError(formData.name ? UI_HELP_TEXT.ERROR_EYE_DESCRIPTION_REQUIRED : UI_HELP_TEXT.ERROR_EYE_NAME_REQUIRED);
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

      const response = await fetch('/api/eyes/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSuccess(UI_HELP_TEXT.EYES_SUCCESS_CREATED);
        setHasUnsavedChanges(false);
        await fetchEyes();
        cancelForm();
      } else {
        const result = await response.json();
        console.error('Custom eye creation failed:', result);
        setError(result.error?.detail || result.error?.title || UI_HELP_TEXT.EYES_ERROR_CREATE_FALLBACK);
      }
    } catch (error) {
      console.error('Custom eye creation error:', error);
      setError(UI_HELP_TEXT.ERROR_EYE_SAVE_FAILED);
    } finally {
      setLoading(false);
    }
  };

  // Track form changes
  useEffect(() => {
    if (isCreating || isEditing) {
      const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalFormData);
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
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';

      const payload: UpdateEyePayload = {
        name: formData.name,
        description: formData.description,
        inputSchema,
        outputSchema,
        ...(formData.iconSvg && { iconSvg: formData.iconSvg }),
        ...(formData.personaId && { personaId: formData.personaId }),
      };

      const response = await fetch(`${API_URL}/api/eyes/custom/${selectedEye.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSuccess(UI_HELP_TEXT.EYES_SUCCESS_UPDATED);
        setHasUnsavedChanges(false);
        setIsEditing(false);
        await fetchEyes();
        cancelForm();
      } else {
        const result = await response.json();
        setError(result.error?.detail || UI_HELP_TEXT.EYES_ERROR_UPDATE_FALLBACK);
      }
    } catch (error) {
      setError(UI_HELP_TEXT.ERROR_EYE_UPDATE_FAILED);
    } finally {
      setLoading(false);
    }
  };

  const deleteEye = async (eyeId: string) => {
    const confirmed = await dialog.confirm(UI_HELP_TEXT.EYES_DIALOG_DELETE_TITLE, UI_HELP_TEXT.EYES_DIALOG_DELETE_MESSAGE, UI_HELP_TEXT.EYES_DIALOG_DELETE_CONFIRM, UI_HELP_TEXT.EYES_BUTTON_CANCEL);
    if (!confirmed) {
      return;
    }

    setError(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
      const response = await fetch(`${API_URL}/api/eyes/custom/${eyeId}`, {
        method: 'DELETE',
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
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
      const response = await fetch(`${API_URL}/api/eyes/custom/${selectedEye.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testInput }),
      });

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

  const getEyeIconPath = (eyeId: string) => {
    return `/eyes/${eyeId}.svg`;
  };

  const getEyeColor = (_eyeId: string) => {
    // All cards use consistent brand tokens
    return 'border-brand-outline/40 bg-brand-paper/10';
  };

  const toHumanReadable = (text: string) => {
    return text
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Phase 15: Persona configuration handlers
  const openPersonaConfig = (eye: Eye) => {
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

  return (
    <div className="min-h-screen bg-brand-ink">
      {/* Header */}
      <div className="border-b border-brand-outline/60 bg-brand-paperElev/50">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-brand-outline transition-colors hover:text-brand-accent" aria-label={UI_HELP_TEXT.ARIA_NAV_HOME}>
                {UI_HELP_TEXT.EYES_NAV_HOME}
              </Link>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">{UI_HELP_TEXT.EYES_SECTION_LABEL}</p>
                <div className="mt-1 flex items-center gap-2">
                  <h1 className="text-2xl font-semibold text-brand-foreground">{UI_HELP_TEXT.EYES_HEADER_TITLE}</h1>
                  <HelpIcon helpTextKey="EYES_PAGE_TITLE" size="md" />
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <Link href="/prompts" className="text-sm text-brand-outline transition-colors hover:text-brand-foreground" aria-label={UI_HELP_TEXT.ARIA_NAV_PROMPTS}>
                {UI_HELP_TEXT.EYES_NAV_PROMPTS}
              </Link>
              <Link href="/personas" className="text-sm text-brand-outline transition-colors hover:text-brand-foreground" aria-label={UI_HELP_TEXT.ARIA_NAV_PERSONAS}>
                {UI_HELP_TEXT.EYES_NAV_PERSONAS}
              </Link>
              <div className="flex items-center gap-2">
                <button
                  onClick={startCreating}
                  aria-label={UI_HELP_TEXT.ARIA_CREATE_EYE}
                  className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-ink transition-all duration-200 hover:bg-brand-primary hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-ink active:scale-95"
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
            className="rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-red-400"
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
            className="rounded-xl border border-green-500/50 bg-green-500/10 p-4 text-green-400"
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
        ) : isTesting || (selectedEye && selectedEye.source === 'custom' && !isCreating && !isEditing && !isTesting) ? (
          /* Test Panel and View Mode */
          <GlassCard>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-brand-foreground">
                {isTesting ? UI_HELP_TEXT.EYES_FORM_TITLE_TEST.replace('{eyeName}', selectedEye?.name || '') : UI_HELP_TEXT.EYES_FORM_TITLE_VIEW.replace('{eyeName}', selectedEye?.name || '')}
              </h2>
              <div className="flex gap-3">
                {isTesting ? (
                  <>
                    <button
                      onClick={cancelForm}
                      aria-label={UI_HELP_TEXT.ARIA_CLOSE_TEST}
                      className="rounded-full border border-brand-outline/50 px-5 py-2 text-sm font-semibold text-brand-outline transition hover:border-brand-accent hover:text-brand-accent"
                    >
                      {UI_HELP_TEXT.EYES_BUTTON_CLOSE_TEST}
                    </button>
                    <button
                      onClick={testEye}
                      disabled={loading || !testInput}
                      aria-label={UI_HELP_TEXT.ARIA_RUN_TEST}
                      className="rounded-full bg-green-600 px-5 py-2 text-sm font-semibold text-brand-foreground transition hover:bg-green-700 disabled:opacity-50"
                    >
                      {loading ? UI_HELP_TEXT.EYES_BUTTON_TESTING : UI_HELP_TEXT.EYES_BUTTON_RUN_TEST}
                    </button>
                  </>
                ) : (
                  /* View mode for custom eyes */
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      aria-label={UI_HELP_TEXT.ARIA_EDIT_EYE}
                      className="rounded-full border border-brand-accent px-5 py-2 text-sm font-semibold text-brand-accent transition hover:bg-brand-accent/10"
                    >
                      {UI_HELP_TEXT.EYES_BUTTON_EDIT}
                    </button>
                    <button
                      onClick={() => setIsTesting(true)}
                      aria-label={UI_HELP_TEXT.ARIA_TEST_EYE}
                      className="rounded-full bg-green-600 px-5 py-2 text-sm font-semibold text-brand-foreground transition hover:bg-green-700"
                    >
                      {UI_HELP_TEXT.EYES_BUTTON_TEST}
                    </button>
                    <button
                      onClick={() => selectedEye && deleteEye(selectedEye.id)}
                      aria-label={UI_HELP_TEXT.ARIA_DELETE_EYE}
                      className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-brand-foreground transition hover:bg-red-700"
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
                  <label className="mb-2 block text-sm font-medium text-brand-outline">{UI_HELP_TEXT.EYES_FORM_LABEL_TEST_INPUT}</label>
                  <textarea
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder={UI_HELP_TEXT.EYES_PLACEHOLDER_TEST_INPUT}
                    className="h-40 w-full resize-none rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-brand-foreground placeholder-slate-500 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                  />
                </div>

                {testResult && (
                  <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-5">
                    <h3 className="mb-3 text-lg font-semibold text-brand-foreground">{UI_HELP_TEXT.EYES_FORM_LABEL_TEST_RESULT}</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-brand-outline">{UI_HELP_TEXT.EYES_FORM_LABEL_TEST_RESULT_EYE} {testResult.eyeName}</p>
                      </div>
                      <div>
                        <p className="mb-2 text-sm font-medium text-brand-outline">{UI_HELP_TEXT.EYES_FORM_LABEL_TEST_RESULT_RESPONSE}</p>
                        <pre className="overflow-x-auto rounded-lg bg-brand-ink p-4 text-xs text-green-400">
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
                      <h3 className="mb-3 text-lg font-semibold text-brand-foreground">Basic Information</h3>
                      <dl className="space-y-2">
                        <div>
                          <dt className="text-sm font-medium text-brand-outline">Eye Name</dt>
                          <dd className="mt-1 text-brand-foreground">{selectedEye.name}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-brand-outline">Description</dt>
                          <dd className="mt-1 text-brand-foreground">{selectedEye.description}</dd>
                        </div>
                        {selectedEye.iconSvg && (
                          <div>
                            <dt className="text-sm font-medium text-brand-outline">Icon</dt>
                            <dd className="mt-2">
                              <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-brand-outline/50 bg-brand-paperElev p-2">
                                <div
                                  dangerouslySetInnerHTML={{ __html: selectedEye.iconSvg }}
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
                      <h3 className="mb-3 text-lg font-semibold text-brand-foreground">Input Schema</h3>
                      <pre className="overflow-x-auto rounded-lg bg-brand-ink p-4 text-xs text-green-400">
                        {JSON.stringify(JSON.parse(selectedEye.inputSchema || '{}'), null, 2)}
                      </pre>
                    </div>

                    {/* Output Schema */}
                    <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-5">
                      <h3 className="mb-3 text-lg font-semibold text-brand-foreground">Output Schema</h3>
                      <pre className="overflow-x-auto rounded-lg bg-brand-ink p-4 text-xs text-green-400">
                        {JSON.stringify(JSON.parse(selectedEye.outputSchema || '{}'), null, 2)}
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
            {/* View Mode Tabs */}
            <div className="mb-6 flex gap-3">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setViewMode('all')}
                  aria-label={UI_HELP_TEXT.ARIA_FILTER_ALL}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 ${
                    viewMode === 'all'
                      ? 'bg-brand-accent text-brand-ink scale-105'
                      : 'border border-brand-outline/40 text-brand-outline hover:border-brand-accent hover:text-brand-accent hover:scale-105 active:scale-95'
                  } focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-ink`}
                >
                  {UI_HELP_TEXT.EYES_FILTER_ALL.replace('{count}', eyes.length.toString())}
                </button>
                <HelpIcon helpTextKey="EYES_ALL_FILTER" size="sm" />
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setViewMode('built-in')}
                  aria-label={UI_HELP_TEXT.ARIA_FILTER_BUILTIN}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 ${
                    viewMode === 'built-in'
                      ? 'bg-brand-accent text-brand-ink scale-105'
                      : 'border border-brand-outline/40 text-brand-outline hover:border-brand-accent hover:text-brand-accent hover:scale-105 active:scale-95'
                  } focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-ink`}
                >
                  {UI_HELP_TEXT.EYES_FILTER_BUILTIN.replace('{count}', builtInEyes.length.toString())}
                </button>
                <HelpIcon helpTextKey="EYES_BUILTIN_FILTER" size="sm" />
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setViewMode('custom')}
                  aria-label={UI_HELP_TEXT.ARIA_FILTER_CUSTOM}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 ${
                    viewMode === 'custom'
                      ? 'bg-brand-accent text-brand-ink scale-105'
                      : 'border border-brand-outline/40 text-brand-outline hover:border-brand-accent hover:text-brand-accent hover:scale-105 active:scale-95'
                  } focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-ink`}
                >
                  {UI_HELP_TEXT.EYES_FILTER_CUSTOM.replace('{count}', customEyes.length.toString())}
                </button>
                <HelpIcon helpTextKey="EYES_CUSTOM_FILTER" size="sm" />
              </div>
            </div>

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
                {getFilteredEyes().map((eye, index) => (
                  <motion.div
                    key={eye.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
                    className={`rounded-2xl border p-6 shadow-lg transition-all duration-300 hover:shadow-2xl hover:border-brand-accent/50 ${getEyeColor(eye.id)}`}
                  >
                    <Link href={`/eyes/${eye.id}`} className="block">
                      <div className="mb-4 text-center">
                        <div className="mb-3 flex justify-center">
                          <img
                            src={getEyeIconPath(eye.id)}
                            alt={`${eye.name} icon`}
                            className="h-16 w-16"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <h3 className="mb-1 text-xl font-bold text-brand-foreground">{eye.name}</h3>
                        <div className="mb-2 flex items-center justify-center gap-2">
                          <span className="text-sm text-brand-foreground/80">v{eye.version}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              eye.source === 'built-in'
                                ? 'bg-white/20 text-brand-foreground'
                                : 'bg-green-500/30 text-green-100'
                            }`}
                          >
                            {eye.source}
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

                    {eye.source === 'custom' && (
                      <div className="mt-2 text-center">
                        <span className="text-xs text-brand-foreground/70">
                          {UI_HELP_TEXT.EYES_CREATED_PREFIX} {new Date(eye.createdAt!).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </motion.div>
              ))}
              </div>
            )}

            {!loading && getFilteredEyes().length === 0 && (
              <EmptyState
                icon={viewMode === 'custom' ? Sparkles : EyeIcon}
                title={viewMode === 'custom' ? UI_HELP_TEXT.EYES_EMPTY_CUSTOM_TITLE : viewMode === 'built-in' ? UI_HELP_TEXT.EYES_EMPTY_BUILTIN_TITLE : UI_HELP_TEXT.EYES_EMPTY_ALL_TITLE}
                description={
                  viewMode === 'custom'
                    ? UI_HELP_TEXT.EYES_EMPTY_CUSTOM_DESCRIPTION
                    : viewMode === 'built-in'
                    ? UI_HELP_TEXT.EYES_EMPTY_BUILTIN_DESCRIPTION
                    : UI_HELP_TEXT.EYES_EMPTY_ALL_DESCRIPTION
                }
                actions={
                  viewMode === 'custom'
                    ? [{ label: UI_HELP_TEXT.EYES_EMPTY_ACTION_CREATE, onClick: startCreating, variant: 'primary' }]
                    : viewMode === 'all'
                    ? [{ label: UI_HELP_TEXT.EYES_EMPTY_ACTION_VIEW_BUILTIN, onClick: () => setViewMode('built-in'), variant: 'secondary' }]
                    : []
                }
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
    </div>
  );
}
