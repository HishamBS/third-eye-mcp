/**
 * Persona Runtime Renderer
 *
 * Builds lean prompts using stage templates and capability assignments.
 * Includes stage summary, skeleton JSON, behavior checklist, and example.
 */
import type { PersonaBlueprint } from '../interfaces/persona-blueprint';
import { EyeStageToken } from '@third-eye/constants';
export interface PersonaPromptOptions {
    /** Include self-check instructions */
    includeSelfCheck?: boolean;
    /** Debug mode (logs raw responses) */
    debug?: boolean;
}
export interface PersonaPrompt {
    /** Complete system prompt for LLM */
    systemPrompt: string;
    /** User message with context */
    userMessage: string;
    /** Deterministic decoding defaults */
    config: {
        temperature: number;
        top_p: number;
        response_format: {
            type: 'json_object';
        };
    };
}
/**
 * Render persona prompt using blueprint and stage template
 */
export declare function renderPersonaPrompt(blueprint: PersonaBlueprint, stage: EyeStageToken, inputData?: string, options?: PersonaPromptOptions): PersonaPrompt;
/**
 * Parse and validate response from LLM
 */
export declare function parsePersonaResponse(response: string, blueprint: PersonaBlueprint, stage: EyeStageToken): unknown;
//# sourceMappingURL=persona-renderer.d.ts.map