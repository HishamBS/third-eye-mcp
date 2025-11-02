'use client';

import { memo, useState, useMemo, useCallback, useEffect } from 'react';
import { EyeIcon } from '@/components/EyeIcon';
import { useAPI } from '@/hooks/useAPI';
import {
  EYE_DISPLAY_NAMES,
  EYE_DESCRIPTIONS,
  PALETTE_TEXT,
  LAYOUT,
} from './constants';
import { EYES } from '@third-eye/types/enums';
import { API_ROUTES } from '@/constants/api-routes';
import type { EyeDefinition } from '@/types/pipeline';

/**
 * Eye Palette Props
 * Per R07: Strict typing
 */
interface EyePaletteProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

/**
 * Eye Palette Component - Phase 10
 *
 * Features:
 * - Displays all Eyes (built-in + custom)
 * - Collapsible sections
 * - Search functionality
 * - Drag-and-drop to canvas
 *
 * Per R04: Memoized for performance
 * Per R07: Strict typing, no 'any'
 * Per R13: All text from SSOT constants
 */
export const EyePalette = memo(function EyePalette({
  collapsed,
  onToggleCollapse,
}: EyePaletteProps) {
  const { get } = useAPI();
  const [search, setSearch] = useState<string>('');
  const [customEyes, setCustomEyes] = useState<EyeDefinition[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch custom eyes from API
  useEffect(() => {
    const fetchCustomEyes = async () => {
      setLoading(true);
      try {
        const envelope = await get<{
          success: boolean;
          data: Array<{
            id: string;
            name: string;
            description: string;
            iconSvg?: string;
            version: number;
            inputSchemaJson: Record<string, unknown>;
            outputSchemaJson: Record<string, unknown>;
          }>;
          meta: {
            requestId?: string;
            timestamp?: string;
          };
        }>(API_ROUTES.EYES_CUSTOM);

        const customEyesData = envelope.data || [];
        const mapped: EyeDefinition[] = customEyesData.map((eye) => ({
          id: eye.id,
          name: eye.name,
          description: eye.description,
          iconSvg: eye.iconSvg,
          capabilities: [], // TODO: Extract from schemas
          isCustom: true as const,
          version: eye.version,
          inputSchema: eye.inputSchemaJson,
          outputSchema: eye.outputSchemaJson,
        }));

        setCustomEyes(mapped);
      } catch (error) {
        console.error('[EyePalette] Failed to fetch custom eyes:', error);
        setCustomEyes([]);
      } finally {
        setLoading(false);
      }
    };

    if (!collapsed) {
      fetchCustomEyes();
    }
  }, [collapsed, get]);

  // Build list of built-in eyes
  const builtInEyes = useMemo<EyeDefinition[]>(() => {
    return EYES.map((eyeId) => ({
      id: eyeId,
      name: EYE_DISPLAY_NAMES[eyeId],
      description: EYE_DESCRIPTIONS[eyeId],
      capabilities: [],
      isCustom: false as const,
      stage: 'GUIDANCE' as const, // TODO: Use EYE_STAGES
    }));
  }, []);

  // Filter eyes based on search
  const filteredBuiltIn = useMemo(() => {
    if (!search) return builtInEyes;
    const lowerSearch = search.toLowerCase();
    return builtInEyes.filter(
      (eye) =>
        eye.name.toLowerCase().includes(lowerSearch) ||
        eye.description.toLowerCase().includes(lowerSearch)
    );
  }, [builtInEyes, search]);

  const filteredCustom = useMemo(() => {
    if (!search) return customEyes;
    const lowerSearch = search.toLowerCase();
    return customEyes.filter(
      (eye) =>
        eye.name.toLowerCase().includes(lowerSearch) ||
        eye.description.toLowerCase().includes(lowerSearch)
    );
  }, [customEyes, search]);

  // Drag start handler for React Flow
  const onDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>, eye: EyeDefinition) => {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData(
        'application/reactflow',
        JSON.stringify({
          type: 'eyeNode',
          data: {
            eyeId: eye.id,
            displayName: eye.name,
            capabilities: eye.capabilities,
            isCustom: eye.isCustom,
            iconSvg: eye.iconSvg,
          },
        })
      );
    },
    []
  );

  // Collapsed view
  if (collapsed) {
    return (
      <div
        className="absolute left-0 top-0 h-full bg-brand-paperElev border-r border-brand-outline flex flex-col items-center py-4"
        style={{ width: LAYOUT.PALETTE_COLLAPSED_WIDTH }}
      >
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-brand-outline/20 rounded-md transition-colors"
          title={PALETTE_TEXT.EXPAND}
        >
          <svg className="w-5 h-5 text-brand-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  }

  // Expanded view
  return (
    <div
      className="absolute left-0 top-0 h-full bg-brand-paperElev border-r border-brand-outline flex flex-col overflow-hidden"
      style={{ width: LAYOUT.PALETTE_WIDTH }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-brand-outline">
        <h2 className="text-lg font-semibold text-brand-foreground">{PALETTE_TEXT.TITLE}</h2>
        <button
          onClick={onToggleCollapse}
          className="p-1 hover:bg-brand-outline/20 rounded-md transition-colors"
          title={PALETTE_TEXT.COLLAPSE}
        >
          <svg className="w-5 h-5 text-brand-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-brand-outline">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={PALETTE_TEXT.SEARCH_PLACEHOLDER}
          className="w-full px-3 py-2 bg-brand-paper border border-brand-outline rounded-md text-brand-foreground placeholder-brand-ink/50 focus:outline-none focus:ring-2 focus:ring-brand-primary"
        />
      </div>

      {/* Eye Lists */}
      <div className="flex-1 overflow-y-auto">
        {/* Built-in Eyes */}
        <div className="p-4">
          <h3 className="text-sm font-semibold text-semantic-muted uppercase tracking-wider mb-3">
            {PALETTE_TEXT.BUILTIN_SECTION}
          </h3>
          {filteredBuiltIn.length > 0 ? (
            <div className="space-y-2">
              {filteredBuiltIn.map((eye) => (
                <div
                  key={eye.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, eye)}
                  className="flex items-start gap-3 p-3 bg-brand-paper border border-brand-outline rounded-lg cursor-grab hover:border-brand-primary hover:shadow-md transition-all"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <EyeIcon eye={eye.id} size={32} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-brand-foreground">{eye.name}</div>
                    <div className="text-xs text-semantic-muted mt-0.5">{eye.description}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-semantic-muted text-center py-4">{PALETTE_TEXT.NO_RESULTS}</div>
          )}
        </div>

        {/* Custom Eyes */}
        <div className="p-4 border-t border-brand-outline">
          <h3 className="text-sm font-semibold text-semantic-muted uppercase tracking-wider mb-3">
            {PALETTE_TEXT.CUSTOM_SECTION}
          </h3>
          {loading ? (
            <div className="text-sm text-semantic-muted text-center py-4">Loading custom eyes...</div>
          ) : filteredCustom.length > 0 ? (
            <div className="space-y-2">
              {filteredCustom.map((eye) => (
                <div
                  key={eye.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, eye)}
                  className="flex items-start gap-3 p-3 bg-brand-paper border border-brand-outline rounded-lg cursor-grab hover:border-brand-accent hover:shadow-md transition-all"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {eye.iconSvg ? (
                      <div
                        className="w-8 h-8 flex items-center justify-center"
                        dangerouslySetInnerHTML={{ __html: eye.iconSvg }}
                      />
                    ) : (
                      <div className="w-8 h-8 flex items-center justify-center bg-brand-accent/20 rounded-full text-xs font-semibold text-brand-accent">
                        {eye.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-brand-foreground">{eye.name}</div>
                    <div className="text-xs text-semantic-muted mt-0.5">{eye.description}</div>
                    <div className="text-xs text-brand-accent mt-1">v{eye.version}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-semantic-muted text-center py-4">{PALETTE_TEXT.NO_CUSTOM}</div>
          )}
        </div>
      </div>
    </div>
  );
});
