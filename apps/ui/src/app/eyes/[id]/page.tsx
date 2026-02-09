"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { EyeWizardModal } from "@/components/eye-wizard/EyeWizardModal";
import { EyeIcon } from "@/components/EyeIcon";
import type { Eye, Persona, EyeRouting } from "@third-eye/types";
import { API_BASE_URL } from "@/consts/api";
import {
  STATUS_TEXT_COLORS,
  STATUS_BG_COLORS_SUBTLE,
  STATUS_BORDER_COLORS_SUBTLE,
} from "@/constants/color-mappings";

/**
 * Extended Eye type for detail page. The API may return enriched fields
 * (capabilities from blueprint, source label) not in the base DB schema.
 */
interface UiEye extends Omit<Eye, "version"> {
  version: number | string;
  source?: string;
  capabilities?: string[];
  personaTemplate?: string;
}

/**
 * Extended Persona for the detail page. The API may return a `content` field
 * representing the serialised persona body, plus `eye` (slug) for display.
 */
interface UiPersona extends Partial<Persona> {
  id: string;
  name: string;
  version: number;
  active: boolean;
  createdAt: Date | string;
  content?: string;
  eye?: string;
}

/**
 * Routing as returned by /api/routing. The API currently returns `eye` (slug)
 * rather than the DB `eyeId` (UUID). Keep a local type until the API migrates.
 */
interface UiEyeRouting extends Partial<EyeRouting> {
  eye?: string;
  primaryProvider: string | null;
  primaryModel: string | null;
}

export default function EyeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eyeId = params.id as string;

  const [eye, setEye] = useState<UiEye | null>(null);
  const [personas, setPersonas] = useState<UiPersona[]>([]);
  const [routing, setRouting] = useState<UiEyeRouting | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "persona" | "routing" | "test"
  >("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Persona editing state
  const [isEditingPersona, setIsEditingPersona] = useState(false);
  const [personaContent, setPersonaContent] = useState("");

  // Name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");

  // Eye wizard modal state
  const [isEyeWizardOpen, setIsEyeWizardOpen] = useState(false);

  useEffect(() => {
    fetchEyeData();
  }, [eyeId]);

  const fetchEyeData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch Eye details from direct eye endpoint
      const eyeRes = await fetch(`${API_BASE_URL}/api/eyes/${eyeId}`);
      if (eyeRes.ok) {
        const result = await eyeRes.json();
        const foundEye = result.data || result;

        // If eye doesn't have capabilities, fetch from blueprint (server API directly)
        if (foundEye && !foundEye.capabilities) {
          try {
            const blueprintRes = await fetch(
              `${API_BASE_URL}/api/personas/blueprints/${eyeId}`,
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
                  foundEye.capabilities = capabilities;
                }
              }
            }
          } catch (e) {
            console.debug("Could not fetch blueprint for capabilities:", e);
          }
        }

        setEye(foundEye || null);
      } else if (eyeRes.status === 404) {
        // Fall back to fetching from eyes/all
        const eyesRes = await fetch(`${API_BASE_URL}/api/eyes/all`);
        if (eyesRes.ok) {
          const result = await eyesRes.json();
          const foundEye = result.data?.find((e: UiEye) => e.id === eyeId);
          setEye(foundEye || null);
        }
      }

      // Fetch personas for this Eye
      try {
        const personasRes = await fetch(
          `${API_BASE_URL}/api/personas/${eyeId}`,
        );
        if (personasRes.ok) {
          const result = await personasRes.json();
          setPersonas(result.data?.versions || []);
        }
      } catch (e) {
        console.debug("Could not fetch personas:", e);
      }

      // Fetch routing configuration
      try {
        const routingRes = await fetch(`${API_BASE_URL}/api/routing`);
        if (routingRes.ok) {
          const result = await routingRes.json();
          const eyeRouting = result.data?.find(
            (r: UiEyeRouting) => r.eye === eyeId || r.eyeId === eyeId,
          );
          setRouting(eyeRouting || null);
        }
      } catch (e) {
        console.debug("Could not fetch routing:", e);
      }
    } catch (err) {
      console.error("Failed to load Eye details:", err);
      setError("Failed to load Eye details");
    } finally {
      setLoading(false);
    }
  };

  const startEditingName = () => {
    setEditedName(eye?.name || "");
    setIsEditingName(true);
  };

  const saveName = async () => {
    if (!editedName.trim()) {
      setError("Eye name cannot be empty");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/eyes/${eyeId}/name`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: editedName.trim() }),
      });

      if (response.ok) {
        setSuccess("Eye name updated successfully");
        setIsEditingName(false);
        await fetchEyeData();
      } else {
        const result = await response.json();
        setError(result.error?.detail || "Failed to update Eye name");
      }
    } catch (err) {
      setError("Failed to update Eye name");
    }
  };

  const openEyeWizard = () => {
    setIsEyeWizardOpen(true);
  };

  const closeEyeWizard = () => {
    setIsEyeWizardOpen(false);
  };

  const handleEyeSaved = async () => {
    setSuccess("Eye updated successfully");
    closeEyeWizard();
    await fetchEyeData();
  };

  const startEditingPersona = () => {
    const activePersona = personas.find((p) => p.active);
    setPersonaContent(activePersona?.content || "");
    setIsEditingPersona(true);
  };

  const savePersona = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/personas/${eyeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: personaContent }),
      });

      if (response.ok) {
        setSuccess("Persona saved successfully!");
        setIsEditingPersona(false);
        await fetchEyeData();
      } else {
        setError("Failed to save persona");
      }
    } catch (err) {
      setError("Failed to save persona");
    }
  };

  const activatePersona = async (version: number) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/personas/${eyeId}/activate/${version}`,
        {
          method: "PATCH",
        },
      );

      if (response.ok) {
        setSuccess(`Version ${version} activated!`);
        await fetchEyeData();
      } else {
        setError("Failed to activate version");
      }
    } catch (err) {
      setError("Failed to activate version");
    }
  };

  const toHumanReadable = (text: string) => {
    return text
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-paper flex items-center justify-center">
        <p className="text-brand-foreground">Loading Eye details...</p>
      </div>
    );
  }

  if (!eye) {
    return (
      <div className="min-h-screen bg-brand-paper flex items-center justify-center">
        <div className="text-center">
          <p className="text-brand-foreground mb-4">Eye not found</p>
          <Link href="/eyes" className="text-brand-accent hover:underline">
            ← Back to Eyes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-paper">
      {/* Header */}
      <div className="border-b border-brand-outline/60 bg-brand-paperElev/50">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link
                href="/eyes"
                className="text-semantic-muted transition-colors hover:text-brand-accent"
              >
                ← Back to Eyes
              </Link>
              <div className="flex items-center gap-4">
                <EyeIcon eye={eye.name} size={64} />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">
                      {eye.source}
                    </p>
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs text-brand-foreground">
                      v{eye.version}
                    </span>
                  </div>
                  <h1 className="mt-1 text-2xl font-semibold text-brand-foreground capitalize">
                    {eye.name}
                  </h1>
                  {eye.capabilities && eye.capabilities.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
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
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mx-auto max-w-7xl px-6 pt-4">
          <div
            className={`rounded-xl border ${STATUS_BORDER_COLORS_SUBTLE.error} ${STATUS_BG_COLORS_SUBTLE.error} p-4 ${STATUS_TEXT_COLORS.error}`}
          >
            {error}
          </div>
        </div>
      )}
      {success && (
        <div className="mx-auto max-w-7xl px-6 pt-4">
          <div
            className={`rounded-xl border ${STATUS_BORDER_COLORS_SUBTLE.success} ${STATUS_BG_COLORS_SUBTLE.success} p-4 ${STATUS_TEXT_COLORS.success}`}
          >
            {success}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-brand-outline/40">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex gap-6">
            {(["overview", "persona", "routing", "test"] as const).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`border-b-2 px-2 py-4 text-sm font-semibold capitalize transition ${
                    activeTab === tab
                      ? "border-brand-accent text-brand-foreground"
                      : "border-transparent text-semantic-muted hover:text-brand-foreground"
                  }`}
                >
                  {tab}
                </button>
              ),
            )}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <GlassCard>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-brand-foreground">
                Eye Overview
              </h2>
              <button
                onClick={openEyeWizard}
                className="rounded-full border border-brand-outline/50 px-5 py-2 text-sm font-semibold text-semantic-muted transition hover:border-brand-accent hover:text-brand-accent"
              >
                Edit Eye
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-semantic-muted mb-2">
                  Name
                </label>
                <p className="text-brand-foreground capitalize">{eye.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-semantic-muted mb-2">
                  Description
                </label>
                <p className="text-brand-foreground">{eye.description}</p>
              </div>
              {eye.capabilities && eye.capabilities.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-semantic-muted mb-2">
                    Capabilities
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {eye.capabilities.map((cap, idx) => (
                      <span
                        key={idx}
                        className="rounded-full bg-brand-accent/20 px-3 py-1 text-sm text-brand-accent"
                      >
                        {toHumanReadable(cap)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-semantic-muted mb-2">
                  Source
                </label>
                <span
                  className={`inline-block rounded-full px-3 py-1 text-sm ${
                    eye.source === "built-in"
                      ? "bg-white/20 text-brand-foreground"
                      : `${STATUS_BG_COLORS_SUBTLE.success} ${STATUS_TEXT_COLORS.success}`
                  }`}
                >
                  {eye.source}
                </span>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Persona Tab */}
        {activeTab === "persona" && (
          <GlassCard>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-brand-foreground">
                Persona Management
              </h2>
              {!isEditingPersona && (
                <button
                  onClick={startEditingPersona}
                  className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-foreground transition hover:bg-brand-primary"
                >
                  Create New Version
                </button>
              )}
            </div>

            {isEditingPersona ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-semantic-muted">
                    Persona Content
                  </label>
                  <textarea
                    value={personaContent}
                    onChange={(e) => setPersonaContent(e.target.value)}
                    className="h-96 w-full resize-none rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 font-mono text-sm text-brand-foreground focus:border-brand-accent focus:outline-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsEditingPersona(false)}
                    className="rounded-full border border-brand-outline/50 px-5 py-2 text-sm font-semibold text-semantic-muted transition hover:border-brand-accent hover:text-brand-accent"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={savePersona}
                    className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-foreground transition hover:bg-brand-primary"
                  >
                    Save Persona
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {personas.length === 0 ? (
                  <p className="text-semantic-muted">No personas found</p>
                ) : (
                  personas.map((persona) => (
                    <div
                      key={persona.id}
                      className={`rounded-xl border p-4 ${
                        persona.active
                          ? "border-brand-accent/50 bg-brand-accent/5"
                          : "border-brand-outline/40 bg-brand-paper/50"
                      }`}
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-brand-foreground">
                            Version {persona.version}
                            {persona.active && (
                              <span
                                className={`ml-2 rounded-full ${STATUS_BG_COLORS_SUBTLE.success} px-2 py-1 text-xs ${STATUS_TEXT_COLORS.success}`}
                              >
                                Active
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-semantic-muted">
                            {new Date(persona.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {!persona.active && (
                          <button
                            onClick={() => activatePersona(persona.version)}
                            className={`rounded-full border ${STATUS_BORDER_COLORS_SUBTLE.success} px-4 py-1.5 text-xs font-semibold ${STATUS_TEXT_COLORS.success} transition hover:${STATUS_BG_COLORS_SUBTLE.success}`}
                          >
                            Activate
                          </button>
                        )}
                      </div>
                      <div className="rounded-lg bg-brand-paper/70 p-3">
                        <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs text-semantic-muted">
                          {(
                            persona.content ?? "No content available"
                          ).substring(0, 500)}
                          ...
                        </pre>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </GlassCard>
        )}

        {/* Routing Tab */}
        {activeTab === "routing" && (
          <GlassCard>
            <h2 className="mb-6 text-xl font-semibold text-brand-foreground">
              Routing Configuration
            </h2>
            {routing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-semantic-muted mb-2">
                    Primary Provider
                  </label>
                  <p className="text-brand-foreground">
                    {routing.primaryProvider || "Not configured"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-semantic-muted mb-2">
                    Primary Model
                  </label>
                  <p className="text-brand-foreground">
                    {routing.primaryModel || "Not configured"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-semantic-muted">
                No routing configuration found
              </p>
            )}
          </GlassCard>
        )}

        {/* Test Tab */}
        {activeTab === "test" && (
          <GlassCard>
            <h2 className="mb-6 text-xl font-semibold text-brand-foreground">
              Test Eye
            </h2>
            <p className="text-semantic-muted">
              Test functionality coming soon...
            </p>
          </GlassCard>
        )}
      </div>

      {/* Eye Wizard Modal */}
      {eye && (
        <EyeWizardModal
          isOpen={isEyeWizardOpen}
          eyeId={eye.id}
          eyeName={eye.name}
          onClose={closeEyeWizard}
          onSuccess={handleEyeSaved}
        />
      )}
    </div>
  );
}
