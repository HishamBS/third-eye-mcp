'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { PersonaWizard } from '@/components/persona-form/PersonaWizard';
import { Plus, Eye, CheckCircle2, Circle, Calendar } from 'lucide-react';
import type { PersonaFormState } from '@/types/persona-form';
import type { Persona } from '@/types/api';
import { STATUS_TEXT_COLORS, STATUS_BG_COLORS_SUBTLE, STATUS_BORDER_COLORS_SUBTLE } from '@/constants/color-mappings';
import { TIMING } from '@/constants/timing';
import { API_ROUTES } from '@/constants/api-routes';

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
  const [filterEye, setFilterEye] = useState<string>('all');

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
          content: JSON.stringify(data),
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
    return (
      <PersonaWizard
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
              <p className="mt-1 text-sm text-brand-outline">
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
                  : 'bg-brand-paperElev text-brand-outline hover:bg-brand-paperElev/80'
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
                    : 'bg-brand-paperElev text-brand-outline hover:bg-brand-paperElev/80'
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
            <p className="text-brand-outline">Loading personas...</p>
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
              <Eye className="mx-auto h-16 w-16 text-brand-outline/50" />
              <h2 className="mt-4 text-xl font-semibold text-brand-foreground">No Personas Yet</h2>
              <p className="mt-2 text-sm text-brand-outline">
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
                transition={{ duration: TIMING.ANIMATION.FAST }}
              >
                <h2 className="mb-4 text-xl font-bold text-brand-foreground">
                  {eye}
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {personasByEye[eye]
                    .sort((a, b) => b.version - a.version)
                    .map((persona) => (
                      <motion.div
                        key={`${persona.eye}-${persona.version}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: TIMING.ANIMATION.FAST }}
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
                                  <Circle className="h-5 w-5 text-brand-outline/50" />
                                )}
                                <h3 className="font-semibold text-brand-foreground">
                                  Version {persona.version}
                                </h3>
                              </div>
                              <div className="mt-2 flex items-center gap-2 text-xs text-brand-outline">
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
                        </GlassCard>
                      </motion.div>
                    ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
