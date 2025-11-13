/**
 * Prompt Text Constants
 *
 * All text used in persona prompts must be defined here.
 * No string literals allowed in renderer code.
 */

import { freezeTokens, tokenValues } from "./taxonomy";
import type { TokenLiteral } from "./taxonomy";

/**
 * Section headers for persona prompts
 */
export const PromptSection = freezeTokens({
  CURRENT_TASK: "## Current Task",
  BEHAVIOR_CHECKLIST: "## Behavior Checklist",
  BEHAVIOR_CHECKLIST_INTRO: "Verify that your response:",
  RESPONSE_FORMAT: "## Response Format",
  RESPONSE_FORMAT_INSTRUCTION:
    "You MUST respond with ONLY a JSON object. No Markdown, no explanations, no code blocks.",
  RESPONSE_SCHEMA_INTRO: "Your response MUST match this schema:",
  ALLOWED_STATUS_CODES: "## Allowed Status Codes",
  ALLOWED_STATUS_CODES_INTRO: "You can only use these status codes:",
  SELF_CHECK: "## Self-Check Instructions",
  SELF_CHECK_INTRO: "Before responding, verify:",
  EXAMPLE_RESPONSE: "## Example Response",
  EXAMPLE_INTRO: "Here is a valid example for this stage:",
  EXAMPLE_OUTRO:
    "Copy the structure, but use values appropriate for your current task.",
  CURRENT_CONTEXT: "## Current Context",
  YOUR_TASK: "## Your Task",
  TASK_OUTRO:
    "Analyze the context above and generate a response following the schema and example provided.",
  REMEMBER: "Remember: respond with ONLY a JSON object, no other text.",
  JSON_BLOCK_START: "```json",
  JSON_BLOCK_END: "```",
  DASH_BULLET: "-",
  EMPTY_LINE: "",
  NEWLINE: "\n",
} as const);

export type PromptSection = TokenLiteral<typeof PromptSection>;
export const ALL_PROMPT_SECTIONS = tokenValues(PromptSection);

/**
 * Self-check items
 */
export const SelfCheckItem = freezeTokens({
  REQUIRED_FIELDS:
    "- All required fields are present (tag, ok, code, data, ui, next)",
  STATUS_CODE: "- Status code is from the allowed codes list",
  DATA_STRUCTURE: "- Data structure matches the skeleton",
  UI_FIELDS:
    "- UI fields (title, summary, details, icon, color) are all present",
  NEXT_ACTION: "- Next action is appropriate for the response",
  NO_STRING_LITERALS:
    "- No string literals are hardcoded - use JSON schema values",
} as const);

export type SelfCheckItem = TokenLiteral<typeof SelfCheckItem>;
export const ALL_SELF_CHECK_ITEMS = tokenValues(SelfCheckItem);

/**
 * Error messages
 */
export const ErrorMessage = freezeTokens({
  NO_TEMPLATE: "No template found for",
  NO_PHASE_SPEC: "No phase specification for",
  PARSE_FAILED: "Failed to parse response as JSON",
  NOT_OBJECT: "Response is not a JSON object",
  AT_STAGE: "at stage",
} as const);

export type ErrorMessage = TokenLiteral<typeof ErrorMessage>;
export const ALL_ERROR_MESSAGES = tokenValues(ErrorMessage);
