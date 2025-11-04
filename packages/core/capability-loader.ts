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
    const { eyes, personaBlueprints } = await import('@third-eye/db/schema');
    const { eq } = await import('drizzle-orm');

    // Query DB for all active eyes (SSOT - database is single source of truth)
    const allEyes = await db
      .select()
      .from(eyes)
      .where(eq(eyes.active, true))
      .all();

    // Query DB for all persona blueprints
    const personas = await db.select().from(personaBlueprints).all();

    // Build capability registry
    const registry: CapabilityRegistry = {};

    for (const eye of allEyes) {
      const blueprint = personas.find((p) => p.eyeId === eye.name);
      if (!blueprint) {
        console.warn(`[CapabilityLoader] No blueprint found for eye: ${eye.name}`);
        continue;
      }

      // Parse capabilities from JSON if stored as string
      let capabilities: string[] = [];
      if (typeof blueprint.capabilities === 'string') {
        try {
          capabilities = JSON.parse(blueprint.capabilities);
        } catch (e) {
          console.error(`[CapabilityLoader] Failed to parse capabilities for ${eye.name}:`, e);
        }
      } else if (Array.isArray(blueprint.capabilities)) {
        capabilities = blueprint.capabilities;
      }

      // Parse phases to determine stage
      let phases: Record<string, unknown> = {};
      if (typeof blueprint.phases === 'string') {
        try {
          phases = JSON.parse(blueprint.phases);
        } catch (e) {
          console.error(`[CapabilityLoader] Failed to parse phases for ${eye.name}:`, e);
        }
      } else if (typeof blueprint.phases === 'object' && blueprint.phases !== null) {
        phases = blueprint.phases as Record<string, unknown>;
      }

      // Determine stage from phases
      const hasGuidance = phases.guidance !== undefined && phases.guidance !== null;
      const hasValidation = phases.validation !== undefined && phases.validation !== null;
      let stage = STAGE_BOTH;
      if (hasGuidance && !hasValidation) {
        stage = EyeStageToken.GUIDANCE;
      } else if (hasValidation && !hasGuidance) {
        stage = EyeStageToken.VALIDATION;
      }

      registry[eye.name] = {
        capabilities,
        stage,
        description: blueprint.description || eye.description || eye.name,
        active: eye.active,
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
2. **If clarifications already resolved**: SKIP eyes with clarification capability
3. **Match capabilities to needs**: Only select eyes whose capabilities match the request requirements
4. **Code review only**: Select eyes with code_review + final_approval capabilities
5. **New task**: Full pipeline with clarification → guidance → validation
6. **Smart routing**: Don't run unnecessary eyes. Be efficient.

Request Types Examples (dynamically generated from available eyes):
${generateDynamicExamples(registry)}

You MUST return ONLY valid JSON in this exact envelope format (required fields):
{
  "tag": "overseer",
  "ok": true,
  "code": "OK",
  "md": "Brief markdown explanation of your routing decision (1-3 sentences)",
  "data": {
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
  },
  "next": ["eye1"],
  "ui": {
    "title": "Routing Decision",
    "summary": "Selected X eyes for Y task",
    "details": "Full reasoning explanation",
    "icon": "🧭",
    "color": "info"
  }
}

CRITICAL: All fields above are REQUIRED. The "code" field MUST be one of: OK, OK_WITH_NOTES, NEED_CLARIFICATION, REJECT_AMBIGUOUS, REJECT_UNSAFE, REJECT_INCOMPLETE, REJECT_INCONSISTENT, REJECT_NO_EVIDENCE, REJECT_BAD_PLAN, REJECT_CODE_ISSUES, E_NEEDS_CLARIFICATION, E_INTENT_UNCONFIRMED, E_PLAN_INCOMPLETE, E_REASONING_MISSING, E_SCAFFOLD_ISSUES, E_IMPL_ISSUES, E_TESTS_INSUFFICIENT, E_DOCS_MISSING, E_CITATIONS_MISSING, E_CONTRADICTION_DETECTED, E_PHASES_INCOMPLETE, NEED_MORE_CONTEXT, SUGGEST_ALTERNATIVE, EYE_ERROR, EYE_TIMEOUT, INVALID_ENVELOPE.

The "next" field MUST be a string or non-empty array of strings (eye IDs).
The "ui.color" field MUST be one of: "success", "warning", "error", "info" (NOT a hex color).
`;
}

/**
 * Extract user needs from input using simple heuristics
 * In a real implementation, this could use an LLM for better extraction
 */
/**
 * Generate dynamic examples based on available eyes in registry
 * Replaces hardcoded eye names with actual available eyes
 */
function generateDynamicExamples(registry: CapabilityRegistry): string {
  const examples: string[] = [];
  
  // Find eyes with specific capabilities
  const codeReviewEyes = Object.entries(registry)
    .filter(([_, info]) => info.active && info.capabilities.some(cap => cap.includes('code_review') || cap.includes('code_review')))
    .map(([eyeId]) => eyeId);
  
  const finalApprovalEyes = Object.entries(registry)
    .filter(([_, info]) => info.active && info.capabilities.some(cap => cap.includes('final_approval') || cap.includes('approval')))
    .map(([eyeId]) => eyeId);
  
  const clarificationEyes = Object.entries(registry)
    .filter(([_, info]) => info.active && info.capabilities.some(cap => cap.includes('clarification')))
    .map(([eyeId]) => eyeId);
  
  const factCheckEyes = Object.entries(registry)
    .filter(([_, info]) => info.active && info.capabilities.some(cap => cap.includes('fact') || cap.includes('evidence')))
    .map(([eyeId]) => eyeId);
  
  const promptEyes = Object.entries(registry)
    .filter(([_, info]) => info.active && info.capabilities.some(cap => cap.includes('prompt') || cap.includes('structuring')))
    .map(([eyeId]) => eyeId);

  if (codeReviewEyes.length > 0 && finalApprovalEyes.length > 0) {
    examples.push(`- "Review this code for bugs" → ${codeReviewEyes[0]} + ${finalApprovalEyes[0]} only`);
  }
  
  if (clarificationEyes.length > 0 && promptEyes.length > 0) {
    const guidanceEyes = Object.entries(registry)
      .filter(([_, info]) => info.active && info.stage === EyeStageToken.GUIDANCE)
      .map(([eyeId]) => eyeId)
      .slice(0, 3);
    const validationEyes = Object.entries(registry)
      .filter(([_, info]) => info.active && info.stage === EyeStageToken.VALIDATION)
      .map(([eyeId]) => eyeId)
      .slice(0, 2);
    
    if (guidanceEyes.length > 0 && validationEyes.length > 0) {
      const route = [...clarificationEyes.slice(0, 1), ...guidanceEyes, ...validationEyes].join(' → ');
      examples.push(`- "Build a new feature" → ${route}`);
    }
  }
  
  if (factCheckEyes.length > 0 && finalApprovalEyes.length > 0) {
    examples.push(`- "Validate these facts" → ${factCheckEyes[0]} + ${finalApprovalEyes[0]} only`);
  }
  
  if (promptEyes.length > 0) {
    examples.push(`- "Generate structured prompt" → ${promptEyes[0]} only`);
  }

  return examples.length > 0 ? examples.join('\n') : '- Examples will be generated based on available eyes';
}

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

