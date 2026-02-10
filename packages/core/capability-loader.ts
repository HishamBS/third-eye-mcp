/**
 * Dynamic Capability Loader
 *
 * Queries the database for eyes and personas to build a dynamic capability registry.
 * This registry is used by the LLM router to make intelligent routing decisions.
 */

import { EyeStageToken } from "@third-eye/constants";
import type { getDb } from "@third-eye/db";

// SSOT: Stage type values
const STAGE_BOTH = "both";

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
export async function loadDynamicCapabilities(
  db: ReturnType<typeof getDb>["db"],
): Promise<CapabilityRegistry> {
  try {
    const { eyes, personaBlueprints } = await import("@third-eye/db/schema");
    const { eq } = await import("drizzle-orm");

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
      // Match blueprint by eyeId (UUID) - SSOT: use UUID for FK relationships
      const blueprint = personas.find((p) => p.eyeId === eye.id);
      if (!blueprint) {
        console.warn(
          `[CapabilityLoader] No blueprint found for eye: ${eye.name} (id: ${eye.id})`,
        );
        continue;
      }

      // Parse capabilities from JSON if stored as string
      let capabilities: string[] = [];
      if (typeof blueprint.capabilities === "string") {
        try {
          capabilities = JSON.parse(blueprint.capabilities);
        } catch (e) {
          console.error(
            `[CapabilityLoader] Failed to parse capabilities for ${eye.name}:`,
            e,
          );
        }
      } else if (Array.isArray(blueprint.capabilities)) {
        capabilities = blueprint.capabilities;
      }

      // Parse phases to determine stage
      let phases: Record<string, unknown> = {};
      if (typeof blueprint.phases === "string") {
        try {
          phases = JSON.parse(blueprint.phases);
        } catch (e) {
          console.error(
            `[CapabilityLoader] Failed to parse phases for ${eye.name}:`,
            e,
          );
        }
      } else if (
        typeof blueprint.phases === "object" &&
        blueprint.phases !== null
      ) {
        phases = blueprint.phases as Record<string, unknown>;
      }

      // Determine stage from phases
      const hasGuidance =
        phases.guidance !== undefined && phases.guidance !== null;
      const hasValidation =
        phases.validation !== undefined && phases.validation !== null;
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

    console.log(
      `[CapabilityLoader] Loaded ${Object.keys(registry).length} eyes with capabilities`,
    );
    return registry;
  } catch (error) {
    console.error("[CapabilityLoader] Failed to load capabilities:", error);
    return {};
  }
}

/**
 * Build router persona prompt dynamically from capability registry
 */
// SSOT: Stage labels for router persona
const STAGE_LABEL_GUIDANCE = "[GUIDANCE]";
const STAGE_LABEL_VALIDATION = "[VALIDATION]";
const STAGE_LABEL_BOTH = "[BOTH]";

export function buildRouterPersona(registry: CapabilityRegistry): string {
  const capabilityList = Object.entries(registry)
    .filter(([_, info]) => info.active)
    .map(([eyeId, info]) => {
      const stageLabel =
        info.stage === EyeStageToken.GUIDANCE
          ? STAGE_LABEL_GUIDANCE
          : info.stage === EyeStageToken.VALIDATION
            ? STAGE_LABEL_VALIDATION
            : STAGE_LABEL_BOTH;
      return `- ${eyeId} ${stageLabel}: [${info.capabilities.join(", ")}] - ${info.description}`;
    })
    .join("\n");

  return `
You are the Overseer router for Third Eye MCP. Your job is to analyze the user's request and select which eyes to run based on their capabilities.

Available Eyes and Capabilities:
${capabilityList}

Request Type Classification:
1. DRAFT_REVIEW: User provides existing content (code, text, draft) for review. Route to validation-stage eyes only. Skip all guidance-stage eyes. Example: "Review this code", "Check my draft", "Here's my implementation".
2. VALIDATION_ONLY: User asks a single validation question. Route to the single most relevant validation eye. Example: "Is this claim accurate?", "Does this code have bugs?"
3. NEW_TASK: User requests new work without providing content. Full pipeline: guidance -> validation. Intent confirmation (intent_validation capability) is REQUIRED for new tasks -- confirm understanding before executing.

Routing Rules:
- If content/draft/code is PROVIDED in the input -> DRAFT_REVIEW (skip guidance eyes)
- If the request is a single validation question -> VALIDATION_ONLY (minimal route)
- If no content provided and new work requested -> NEW_TASK (full pipeline with intent confirmation)
- Match eye capabilities to request needs. Only include eyes whose capabilities are required.
- Fewer eyes = faster pipeline. Be efficient.

Request Types Examples (dynamically generated from available eyes):
${generateDynamicExamples(registry)}

You MUST call the submit_eye_analysis function with this exact structure (required fields):
{
  "tag": "overseer",
  "ok": true,
  "code": "OK",
  "md": "Brief markdown explanation of your routing decision (1-3 sentences)",
  "data": {
    "requestType": "new_task",
    "contentDomain": "mixed",
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
  "next": "eye1",
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
The "ui.color" field MUST be one of: "success", "warning", "error", "info", "danger" (NOT a hex color).
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
  // Helper: find first active eye with a capability substring
  const findEye = (capSubstring: string): string | null => {
    const entry = Object.entries(registry).find(
      ([_, info]) =>
        info.active && info.capabilities.some((c) => c.includes(capSubstring)),
    );
    return entry ? entry[0] : null;
  };

  const codeReview = findEye("code_review");
  const finalApproval = findEye("final_approval");
  const clarification = findEye("clarification");
  const prompt = findEye("prompt") || findEye("structuring");
  const intentValidation = findEye("intent_validation");
  const factCheck = findEye("fact") || findEye("evidence");
  const planning = findEye("strategic_planning") || findEye("architecture");

  const examples: string[] = [];

  // Example 1: VALIDATION_ONLY -- content provided, single validation eye
  if (codeReview) {
    examples.push(
      `- VALIDATION_ONLY: "Review this code" → requestType: validation_only → [${codeReview}] (content provided, single validation)`,
    );
  }

  // Example 2: VALIDATION_ONLY -- single fact-check question
  if (factCheck) {
    examples.push(
      `- VALIDATION_ONLY: "Is this claim accurate?" → requestType: validation_only → [${factCheck}] (single question)`,
    );
  }

  // Example 3: DRAFT_REVIEW -- content provided, skip guidance
  if (codeReview && factCheck) {
    examples.push(
      `- DRAFT_REVIEW: "Here's my draft code + tests" → requestType: draft_review → [${codeReview}, ${factCheck}] (content provided, skip guidance, no intent confirmation)`,
    );
  }

  // Example 4: NEW_TASK -- new work, full pipeline with intent confirmation
  if (
    clarification &&
    prompt &&
    intentValidation &&
    factCheck &&
    finalApproval
  ) {
    examples.push(
      `- NEW_TASK: "Generate a report on X" → requestType: new_task → [${clarification}, ${prompt}, ${intentValidation}, ${factCheck}, ${finalApproval}] (new work, intent confirmation required)`,
    );
  }

  // Example 5: NEW_TASK -- high-risk new work with planning
  if (clarification && prompt && intentValidation && planning) {
    examples.push(
      `- NEW_TASK: "Plan a production database migration" → requestType: new_task → [${clarification}, ${prompt}, ${intentValidation}, ${planning}] (new work, high-risk, intent confirmation required)`,
    );
  }

  return examples.length > 0
    ? examples.join("\n")
    : "- Examples will be generated based on available eyes";
}
