/**
 * Persona Runtime Renderer
 *
 * Builds lean prompts using stage templates and capability assignments.
 * Includes stage summary, skeleton JSON, behavior checklist, and example.
 */

import type {
  PersonaBlueprint,
  PhaseSpec,
} from "@third-eye/constants/blueprints-data";
import {
  EyeStageToken,
  EyeStatusCode,
  PromptSection,
  SelfCheckItem,
  ErrorMessage,
  ResponseFormatType,
  TypeString,
} from "@third-eye/constants";
import {
  getStageTemplate,
  type StageEnvelopeTemplate,
} from "@third-eye/constants";

export interface PersonaPromptOptions {
  /** Include self-check instructions */
  includeSelfCheck?: boolean;
  /** Debug mode (logs raw responses) */
  debug?: boolean;
}

// REPAIR_PLAN A4: Function calling tool schema for structured eye responses
export const EYE_RESPONSE_TOOL = {
  type: "function" as const,
  function: {
    name: "submit_eye_analysis",
    description: "Submit structured analysis from the Eye",
    parameters: {
      type: "object",
      properties: {
        tag: { type: "string", description: "Eye identifier tag" },
        ok: { type: "boolean", description: "Whether the analysis succeeded" },
        code: {
          type: "string",
          description: "Status code (E_OK, E_NEEDS_CLARIFICATION, etc.)",
        },
        md: { type: "string", description: "Markdown-formatted analysis" },
        data: {
          type: "object",
          description: "Structured data specific to this eye",
          additionalProperties: true,
        },
        next: {
          oneOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } },
          ],
          description: "Next recommended eye(s) or action",
        },
        next_action: {
          oneOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } },
          ],
          description: "Next action (legacy field, same as next)",
        },
        ui: {
          type: "object",
          description: "Optional UI display fields",
          additionalProperties: true,
        },
      },
      required: ["tag", "ok", "code", "md", "data"],
    },
  },
};

export interface PersonaPrompt {
  /** Complete system prompt for LLM */
  systemPrompt: string;
  /** User message with context */
  userMessage: string;
  /** Deterministic decoding defaults */
  config: {
    temperature: number;
    top_p: number;
    tools: (typeof EYE_RESPONSE_TOOL)[];
    tool_choice: { type: "function"; function: { name: string } };
  };
}

/**
 * Render persona prompt using blueprint and stage template
 */
export function renderPersonaPrompt(
  blueprint: PersonaBlueprint,
  stage: EyeStageToken,
  inputData?: string,
  options: PersonaPromptOptions = {},
): PersonaPrompt {
  const { includeSelfCheck = true, debug = false } = options;

  // Get stage template
  const template = getStageTemplate(blueprint.metadata.eyeId, stage);
  if (!template) {
    throw new Error(
      `${ErrorMessage.NO_TEMPLATE} ${blueprint.metadata.eyeId} ${ErrorMessage.AT_STAGE} ${stage}`,
    );
  }

  // Get phase specification
  const phaseSpec =
    stage === EyeStageToken.GUIDANCE
      ? blueprint.phases.guidance
      : blueprint.phases.validation;

  if (!phaseSpec) {
    throw new Error(
      `${ErrorMessage.NO_PHASE_SPEC} ${blueprint.metadata.eyeId} ${ErrorMessage.AT_STAGE} ${stage}`,
    );
  }

  // Build system prompt
  const systemPrompt = buildSystemPrompt(
    blueprint,
    phaseSpec,
    template,
    includeSelfCheck,
  );

  // Build user message
  const userMessage = buildUserMessage(phaseSpec, template, inputData);

  return {
    systemPrompt,
    userMessage,
    config: {
      temperature: 0,
      top_p: 1,
      tools: [EYE_RESPONSE_TOOL],
      tool_choice: {
        type: "function",
        function: { name: "submit_eye_analysis" },
      },
    },
  };
}

/**
 * Build system prompt from blueprint and phase spec
 */
function buildSystemPrompt(
  blueprint: PersonaBlueprint,
  phaseSpec: PhaseSpec,
  template: StageEnvelopeTemplate,
  includeSelfCheck: boolean,
): string {
  const parts: string[] = [];

  // Mission statement
  parts.push(blueprint.mission);
  parts.push(PromptSection.EMPTY_LINE);

  // Phase-specific mission
  parts.push(`${PromptSection.CURRENT_TASK}: ${phaseSpec.mission}`);
  parts.push(phaseSpec.check);
  parts.push(PromptSection.EMPTY_LINE);

  // Behavior checklist from reminders
  if (phaseSpec.reminders.length > 0) {
    parts.push(PromptSection.BEHAVIOR_CHECKLIST);
    parts.push(PromptSection.BEHAVIOR_CHECKLIST_INTRO);
    for (const reminder of phaseSpec.reminders) {
      parts.push(`${PromptSection.DASH_BULLET} ${reminder}`);
    }
    parts.push(PromptSection.EMPTY_LINE);
  }

  // Response format requirements - explicit tool-calling instruction
  parts.push(PromptSection.RESPONSE_FORMAT);
  parts.push(PromptSection.RESPONSE_FORMAT_INSTRUCTION);
  parts.push(PromptSection.TOOL_CALL_REQUIREMENT);
  parts.push(PromptSection.EMPTY_LINE);
  parts.push(PromptSection.RESPONSE_SCHEMA_INTRO);
  parts.push(PromptSection.JSON_BLOCK_START);
  parts.push(JSON.stringify(template.skeleton, null, 2));
  parts.push(PromptSection.JSON_BLOCK_END);
  parts.push(PromptSection.EMPTY_LINE);
  parts.push(PromptSection.ALLOWED_STATUS_CODES);
  parts.push(
    `${PromptSection.ALLOWED_STATUS_CODES_INTRO} ${template.allowedCodes.join(", ")}`,
  );
  parts.push(PromptSection.EMPTY_LINE);

  // Include self-check instructions
  if (includeSelfCheck) {
    parts.push(PromptSection.SELF_CHECK);
    parts.push(PromptSection.SELF_CHECK_INTRO);
    parts.push(SelfCheckItem.REQUIRED_FIELDS);
    parts.push(SelfCheckItem.STATUS_CODE);
    parts.push(SelfCheckItem.DATA_STRUCTURE);
    parts.push(SelfCheckItem.UI_FIELDS);
    parts.push(SelfCheckItem.NEXT_ACTION);
    parts.push(SelfCheckItem.NO_STRING_LITERALS);
    parts.push(PromptSection.EMPTY_LINE);
  }

  // Example
  parts.push(PromptSection.EXAMPLE_RESPONSE);
  parts.push(PromptSection.EXAMPLE_INTRO);
  parts.push(PromptSection.JSON_BLOCK_START);
  parts.push(phaseSpec.example);
  parts.push(PromptSection.JSON_BLOCK_END);
  parts.push(PromptSection.EMPTY_LINE);
  parts.push(PromptSection.EXAMPLE_OUTRO);

  return parts.join(PromptSection.NEWLINE);
}

/**
 * Build user message from phase spec and template
 */
function buildUserMessage(
  phaseSpec: PhaseSpec,
  template: StageEnvelopeTemplate,
  inputData?: string,
): string {
  const parts: string[] = [];

  if (inputData) {
    parts.push(PromptSection.CURRENT_CONTEXT);
    parts.push(inputData);
    parts.push(PromptSection.EMPTY_LINE);
  }

  parts.push(PromptSection.YOUR_TASK);
  parts.push(phaseSpec.mission);
  parts.push(PromptSection.EMPTY_LINE);
  parts.push(PromptSection.TASK_OUTRO);
  parts.push(PromptSection.REMEMBER);

  return parts.join(PromptSection.NEWLINE);
}

/**
 * Parse and validate response from LLM
 */
export function parsePersonaResponse(
  response: string,
  blueprint: PersonaBlueprint,
  stage: EyeStageToken,
): unknown {
  let parsed: unknown;

  try {
    // Try to parse as JSON
    parsed = JSON.parse(response);
  } catch (error) {
    // If not valid JSON, log debug info
    throw new Error(`${ErrorMessage.PARSE_FAILED}: ${error}`);
  }

  // Basic validation
  if (!parsed || typeof parsed !== TypeString.OBJECT) {
    throw new Error(ErrorMessage.NOT_OBJECT);
  }

  return parsed;
}
