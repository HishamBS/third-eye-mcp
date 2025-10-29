/**
 * Dynamic Capability Loader
 *
 * Queries the database for eyes and personas to build a dynamic capability registry.
 * This registry is used by the LLM router to make intelligent routing decisions.
 */

import { EyeStageToken } from '@third-eye/constants';
import type { getDb } from '@third-eye/db';

// SSOT: Stage type values
const STAGE_BOTH = 'both';

export interface CapabilityRegistry {
  [eyeId: string]: {
    capabilities: string[];
    stage: string;
    description: string;
    active: boolean;
  };
}

export interface DynamicRouteDecision {
  pipelineRoute: string[];
  reasoning: string;
  userNeeds: string[];
  eyesSelected: Array<{
    eyeId: string;
    capabilities: string[];
    reason: string;
  }>;
}

/**
 * Load dynamic capabilities from the database
 */
export async function loadDynamicCapabilities(db: ReturnType<typeof getDb>['db']): Promise<CapabilityRegistry> {
  try {
    const { eyeSettings, personaBlueprints } = await import('@third-eye/db/schema');

    // Query DB for all eyes (filter active later since schema might not have active column)
    const eyes = await db.select().from(eyeSettings).all();

    // Query DB for all persona blueprints
    const personas = await db.select().from(personaBlueprints).all();

    // Build capability registry
    const registry: CapabilityRegistry = {};

    for (const eye of eyes) {
      const blueprint = personas.find((p) => p.eyeId === eye.eye);
      if (!blueprint) {
        console.warn(`[CapabilityLoader] No blueprint found for eye: ${eye.eye}`);
        continue;
      }

      // Parse capabilities from JSON if stored as string
      let capabilities: string[] = [];
      if (typeof blueprint.capabilities === 'string') {
        try {
          capabilities = JSON.parse(blueprint.capabilities);
        } catch (e) {
          console.error(`[CapabilityLoader] Failed to parse capabilities for ${eye.eye}:`, e);
        }
      } else if (Array.isArray(blueprint.capabilities)) {
        capabilities = blueprint.capabilities;
      }

      // Parse metadata to determine stage
      let metadata: Record<string, unknown> = {};
      if (typeof blueprint.metadata === 'string') {
        try {
          metadata = JSON.parse(blueprint.metadata);
        } catch (e) {
          console.error(`[CapabilityLoader] Failed to parse metadata for ${eye.eye}:`, e);
        }
      } else if (typeof blueprint.metadata === 'object' && blueprint.metadata !== null) {
        metadata = blueprint.metadata as Record<string, unknown>;
      }

      registry[eye.eye] = {
        capabilities,
        stage: (typeof metadata.stage === 'string' ? metadata.stage : undefined) || STAGE_BOTH,
        description: blueprint.description || eye.displayName || eye.eye,
        active: true, // Assume all eyes in DB are active
      };
    }

    console.log(`[CapabilityLoader] Loaded ${Object.keys(registry).length} eyes with capabilities`);
    return registry;
  } catch (error) {
    console.error('[CapabilityLoader] Failed to load capabilities:', error);
    return {};
  }
}

/**
 * Build router persona prompt dynamically from capability registry
 */
// SSOT: Stage labels for router persona
const STAGE_LABEL_GUIDANCE = '[GUIDANCE]';
const STAGE_LABEL_VALIDATION = '[VALIDATION]';
const STAGE_LABEL_BOTH = '[BOTH]';

export function buildRouterPersona(registry: CapabilityRegistry): string {
  const capabilityList = Object.entries(registry)
    .filter(([_, info]) => info.active)
    .map(([eyeId, info]) => {
      const stageLabel = info.stage === EyeStageToken.GUIDANCE ? STAGE_LABEL_GUIDANCE : 
                         info.stage === EyeStageToken.VALIDATION ? STAGE_LABEL_VALIDATION : STAGE_LABEL_BOTH;
      return `- ${eyeId} ${stageLabel}: [${info.capabilities.join(', ')}] - ${info.description}`;
    })
    .join('\n');

  return `
You are the Overseer router for Third Eye MCP. Your job is to analyze the user's request and select which eyes to run based on their capabilities.

Available Eyes and Capabilities:
${capabilityList}

Routing Rules:
1. **If draft provided**: SKIP all [GUIDANCE] eyes, start directly with [VALIDATION] eyes
2. **If clarifications already resolved**: SKIP Sharingan (clarification eye)
3. **Match capabilities to needs**: Only select eyes whose capabilities match the request requirements
4. **Code review only**: Just Mangekyō (code_review) + Byakugan (final_approval)
5. **New task**: Full pipeline with clarification → guidance → validation
6. **Smart routing**: Don't run unnecessary eyes. Be efficient.

Request Types Examples:
- "Review this code for bugs" → Mangekyō + Byakugan only
- "Build a Flutter app" → Sharingan → Kyuubi → Jōgan → Rinnegan → Mangekyō → Tenseigan → Byakugan
- "Validate these facts" → Tenseigan + Byakugan only
- "Generate structured prompt" → Kyuubi only

You MUST return ONLY valid JSON in this exact format:
{
  "pipelineRoute": ["eye1", "eye2", "eye3"],
  "reasoning": "Why these eyes were selected and in this order",
  "userNeeds": ["need1", "need2"],
  "eyesSelected": [
    {
      "eyeId": "eye1",
      "capabilities": ["cap1", "cap2"],
      "reason": "Why this eye is needed"
    }
  ]
}
`;
}

/**
 * Extract user needs from input using simple heuristics
 * In a real implementation, this could use an LLM for better extraction
 */
export function extractUserNeeds(input: string): string[] {
  const needs: string[] = [];

  // Simple keyword matching
  if (/review|check|validate|verify|inspect/i.test(input)) {
    needs.push('validation');
  }
  if (/build|create|generate|write|develop/i.test(input)) {
    needs.push('creation');
  }
  if (/clarify|explain|what|how|why/i.test(input)) {
    needs.push('clarification');
  }
  if (/code|program|function|class/i.test(input)) {
    needs.push('code_review');
  }
  if (/fact|citation|evidence|source/i.test(input)) {
    needs.push('fact_checking');
  }
  if (/plan|strategy|roadmap|steps/i.test(input)) {
    needs.push('planning');
  }

  return needs.length > 0 ? needs : ['general'];
}

