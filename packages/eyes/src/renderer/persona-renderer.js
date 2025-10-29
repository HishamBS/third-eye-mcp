/**
 * Persona Runtime Renderer
 *
 * Builds lean prompts using stage templates and capability assignments.
 * Includes stage summary, skeleton JSON, behavior checklist, and example.
 */
import { EyeStageToken, PromptSection, SelfCheckItem, ErrorMessage, ResponseFormatType, TypeString } from '@third-eye/constants';
import { getStageTemplate } from '@third-eye/constants';
/**
 * Render persona prompt using blueprint and stage template
 */
export function renderPersonaPrompt(blueprint, stage, inputData, options = {}) {
    const { includeSelfCheck = true, debug = false } = options;
    // Get stage template
    const template = getStageTemplate(blueprint.metadata.eyeId, stage);
    if (!template) {
        throw new Error(`${ErrorMessage.NO_TEMPLATE} ${blueprint.metadata.eyeId} ${ErrorMessage.AT_STAGE} ${stage}`);
    }
    // Get phase specification
    const phaseSpec = stage === EyeStageToken.GUIDANCE
        ? blueprint.phases.guidance
        : blueprint.phases.validation;
    if (!phaseSpec) {
        throw new Error(`${ErrorMessage.NO_PHASE_SPEC} ${blueprint.metadata.eyeId} ${ErrorMessage.AT_STAGE} ${stage}`);
    }
    // Build system prompt
    const systemPrompt = buildSystemPrompt(blueprint, phaseSpec, template, includeSelfCheck);
    // Build user message
    const userMessage = buildUserMessage(phaseSpec, template, inputData);
    return {
        systemPrompt,
        userMessage,
        config: {
            temperature: 0,
            top_p: 1,
            response_format: { type: ResponseFormatType.JSON_OBJECT },
        },
    };
}
/**
 * Build system prompt from blueprint and phase spec
 */
function buildSystemPrompt(blueprint, phaseSpec, template, includeSelfCheck) {
    const parts = [];
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
    // Response format requirements
    parts.push(PromptSection.RESPONSE_FORMAT);
    parts.push(PromptSection.RESPONSE_FORMAT_INSTRUCTION);
    parts.push(PromptSection.EMPTY_LINE);
    parts.push(PromptSection.RESPONSE_SCHEMA_INTRO);
    parts.push(PromptSection.JSON_BLOCK_START);
    parts.push(JSON.stringify(template.skeleton, null, 2));
    parts.push(PromptSection.JSON_BLOCK_END);
    parts.push(PromptSection.EMPTY_LINE);
    parts.push(PromptSection.ALLOWED_STATUS_CODES);
    parts.push(`${PromptSection.ALLOWED_STATUS_CODES_INTRO} ${template.allowedCodes.join(', ')}`);
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
function buildUserMessage(phaseSpec, template, inputData) {
    const parts = [];
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
export function parsePersonaResponse(response, blueprint, stage) {
    let parsed;
    try {
        // Try to parse as JSON
        parsed = JSON.parse(response);
    }
    catch (error) {
        // If not valid JSON, log debug info
        throw new Error(`${ErrorMessage.PARSE_FAILED}: ${error}`);
    }
    // Basic validation
    if (!parsed || typeof parsed !== TypeString.OBJECT) {
        throw new Error(ErrorMessage.NOT_OBJECT);
    }
    return parsed;
}
//# sourceMappingURL=persona-renderer.js.map