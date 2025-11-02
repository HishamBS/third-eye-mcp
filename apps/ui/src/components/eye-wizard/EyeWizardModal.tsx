'use client';

import { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import type { EyeWizardModalProps, EyeFormData, UpdateEyePayload } from '@/types/eye-wizard';
import { formDataToPayload, eyeToFormData } from '@/types/eye-wizard';
import type { Eye } from '@/types/api';
import { EyeWizard } from './EyeWizard';
import { SUCCESS_MESSAGES } from './constants';

/**
 * EyeWizardModal - Wrapper component for EyeWizard
 * Handles modal UI, API integration, and data fetching
 * Follows PersonaWizardModal pattern (R03)
 */
export function EyeWizardModal({
  isOpen,
  eyeId,
  eyeName,
  onClose,
  onSuccess,
}: EyeWizardModalProps) {
  const [initialData, setInitialData] = useState<Partial<EyeFormData> | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch Eye data when modal opens
  useEffect(() => {
    if (!isOpen || !eyeId) {
      setIsLoading(false);
      return;
    }

    const fetchEyeData = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const response = await fetch(`/api/eyes/${eyeId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch Eye data');
        }

        const result = await response.json();
        const eye: Eye = result.data;

        // Convert Eye to form data
        const formData = eyeToFormData(eye);
        setInitialData(formData);
      } catch (error) {
        console.error('Failed to fetch Eye data:', error);
        setLoadError(error instanceof Error ? error.message : 'Failed to load Eye data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEyeData();
  }, [isOpen, eyeId]);

  // Handle save
  const handleSave = useCallback(
    async (formData: EyeFormData, targetEyeId?: string) => {
      try {
        const payload: UpdateEyePayload = formDataToPayload(formData);
        const id = targetEyeId || eyeId;

        if (!id) {
          throw new Error('Eye ID is required');
        }

        const response = await fetch(`/api/eyes/custom/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to update Eye');
        }

        // Success!
        toast.success(SUCCESS_MESSAGES.EYE_UPDATED);
        onSuccess?.();
        onClose();
      } catch (error) {
        console.error('Failed to save Eye:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to save Eye');
        throw error; // Re-throw to let wizard handle it
      }
    },
    [eyeId, onSuccess, onClose]
  );

  // Handle modal backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="relative h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-brand-outline/50 bg-brand-paper shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-brand-outline/50 px-6 py-4">
          <div>
            <h2 className="text-2xl font-bold text-brand-foreground">
              {eyeName ? `Edit ${eyeName}` : 'Edit Eye'}
            </h2>
            <p className="mt-1 text-sm text-semantic-muted">
              Configure your Eye settings using the wizard below
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-semantic-muted transition hover:bg-brand-outline/20 hover:text-brand-foreground"
            aria-label="Close wizard"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-73px)] overflow-y-auto p-6">
          {isLoading ? (
            // Loading State
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-brand-outline/20 border-t-brand-accent" />
                <p className="text-sm text-semantic-muted">Loading Eye data...</p>
              </div>
            </div>
          ) : loadError ? (
            // Error State
            <div className="flex h-full items-center justify-center">
              <div className="rounded-lg border border-status-error bg-status-error/10 p-6 text-center">
                <p className="text-sm text-status-error">{loadError}</p>
                <button
                  onClick={onClose}
                  className="mt-4 rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-foreground transition hover:bg-brand-primary"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            // Wizard
            <EyeWizard
              initialData={initialData}
              eyeId={eyeId}
              isEditing={true}
              onSave={handleSave}
              onCancel={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
