import { z } from 'zod';
import { BaseEye } from '../schemas/base';
export declare const JoganMetadata: z.ZodObject<{
    primaryIntent: z.ZodEnum<["create", "read", "update", "delete", "refactor", "debug", "test", "document", "deploy", "configure", "analyze", "optimize", "secure", "migrate", "unknown"]>;
    secondaryIntents: z.ZodArray<z.ZodString, "many">;
    intentConfidence: z.ZodNumber;
    implicitRequirements: z.ZodArray<z.ZodString, "many">;
    potentialMisalignment: z.ZodArray<z.ZodString, "many">;
    suggestedScope: z.ZodEnum<["minimal", "moderate", "comprehensive", "unclear"]>;
}, "strip", z.ZodTypeAny, {
    primaryIntent: "unknown" | "create" | "read" | "update" | "delete" | "refactor" | "debug" | "test" | "document" | "deploy" | "configure" | "analyze" | "optimize" | "secure" | "migrate";
    secondaryIntents: string[];
    intentConfidence: number;
    implicitRequirements: string[];
    potentialMisalignment: string[];
    suggestedScope: "moderate" | "minimal" | "comprehensive" | "unclear";
}, {
    primaryIntent: "unknown" | "create" | "read" | "update" | "delete" | "refactor" | "debug" | "test" | "document" | "deploy" | "configure" | "analyze" | "optimize" | "secure" | "migrate";
    secondaryIntents: string[];
    intentConfidence: number;
    implicitRequirements: string[];
    potentialMisalignment: string[];
    suggestedScope: "moderate" | "minimal" | "comprehensive" | "unclear";
}>;
export declare const JoganEnvelopeSchema: z.ZodObject<{
    ok: z.ZodBoolean;
    code: z.ZodEnum<["OK", "OK_WITH_NOTES", "OK_NO_CLARIFICATION_NEEDED", "OK_INTENT_CONFIRMED", "OK_PROMPT_READY", "OK_SCHEMA_EMITTED", "OK_PLAN_APPROVED", "OK_SCAFFOLD_APPROVED", "OK_IMPL_APPROVED", "OK_TESTS_APPROVED", "OK_DOCS_APPROVED", "OK_CODE_APPROVED", "OK_TEXT_VALIDATED", "OK_CONSISTENT", "OK_ALL_APPROVED", "REJECT_AMBIGUOUS", "REJECT_UNSAFE", "REJECT_INCOMPLETE", "REJECT_INCONSISTENT", "REJECT_NO_EVIDENCE", "REJECT_BAD_PLAN", "REJECT_CODE_ISSUES", "E_NEEDS_CLARIFICATION", "E_INTENT_UNCONFIRMED", "E_PLAN_INCOMPLETE", "E_REASONING_MISSING", "E_SCAFFOLD_ISSUES", "E_IMPL_ISSUES", "E_TESTS_INSUFFICIENT", "E_DOCS_MISSING", "E_CITATIONS_MISSING", "E_CONTRADICTION_DETECTED", "E_PHASES_INCOMPLETE", "NEED_CLARIFICATION", "NEED_MORE_CONTEXT", "SUGGEST_ALTERNATIVE", "EYE_ERROR", "EYE_TIMEOUT", "INVALID_ENVELOPE"]>;
    md: z.ZodString;
    next: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
    next_action: z.ZodOptional<z.ZodString>;
    ui: z.ZodOptional<z.ZodObject<{
        title: z.ZodString;
        summary: z.ZodString;
        details: z.ZodString;
        icon: z.ZodString;
        color: z.ZodEnum<["success", "warning", "error", "info"]>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        summary: string;
        details: string;
        icon: string;
        color: "success" | "warning" | "error" | "info";
    }, {
        title: string;
        summary: string;
        details: string;
        icon: string;
        color: "success" | "warning" | "error" | "info";
    }>>;
} & {
    tag: z.ZodLiteral<"jogan">;
    data: z.ZodObject<{
        primaryIntent: z.ZodOptional<z.ZodString>;
        secondaryIntents: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        intentConfidence: z.ZodOptional<z.ZodNumber>;
        implicitRequirements: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        potentialMisalignment: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        suggestedScope: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        primaryIntent: z.ZodOptional<z.ZodString>;
        secondaryIntents: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        intentConfidence: z.ZodOptional<z.ZodNumber>;
        implicitRequirements: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        potentialMisalignment: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        suggestedScope: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        primaryIntent: z.ZodOptional<z.ZodString>;
        secondaryIntents: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        intentConfidence: z.ZodOptional<z.ZodNumber>;
        implicitRequirements: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        potentialMisalignment: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        suggestedScope: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
}, "strip", z.ZodTypeAny, {
    tag: "jogan";
    ok: boolean;
    code: "OK" | "OK_WITH_NOTES" | "OK_NO_CLARIFICATION_NEEDED" | "OK_INTENT_CONFIRMED" | "OK_PROMPT_READY" | "OK_SCHEMA_EMITTED" | "OK_PLAN_APPROVED" | "OK_SCAFFOLD_APPROVED" | "OK_IMPL_APPROVED" | "OK_TESTS_APPROVED" | "OK_DOCS_APPROVED" | "OK_CODE_APPROVED" | "OK_TEXT_VALIDATED" | "OK_CONSISTENT" | "OK_ALL_APPROVED" | "REJECT_AMBIGUOUS" | "REJECT_UNSAFE" | "REJECT_INCOMPLETE" | "REJECT_INCONSISTENT" | "REJECT_NO_EVIDENCE" | "REJECT_BAD_PLAN" | "REJECT_CODE_ISSUES" | "E_NEEDS_CLARIFICATION" | "E_INTENT_UNCONFIRMED" | "E_PLAN_INCOMPLETE" | "E_REASONING_MISSING" | "E_SCAFFOLD_ISSUES" | "E_IMPL_ISSUES" | "E_TESTS_INSUFFICIENT" | "E_DOCS_MISSING" | "E_CITATIONS_MISSING" | "E_CONTRADICTION_DETECTED" | "E_PHASES_INCOMPLETE" | "NEED_CLARIFICATION" | "NEED_MORE_CONTEXT" | "SUGGEST_ALTERNATIVE" | "EYE_ERROR" | "EYE_TIMEOUT" | "INVALID_ENVELOPE";
    md: string;
    data: {
        primaryIntent?: string | undefined;
        secondaryIntents?: string[] | undefined;
        intentConfidence?: number | undefined;
        implicitRequirements?: string[] | undefined;
        potentialMisalignment?: string[] | undefined;
        suggestedScope?: string | undefined;
    } & {
        [k: string]: unknown;
    };
    next: string | string[];
    next_action?: string | undefined;
    ui?: {
        title: string;
        summary: string;
        details: string;
        icon: string;
        color: "success" | "warning" | "error" | "info";
    } | undefined;
}, {
    tag: "jogan";
    ok: boolean;
    code: "OK" | "OK_WITH_NOTES" | "OK_NO_CLARIFICATION_NEEDED" | "OK_INTENT_CONFIRMED" | "OK_PROMPT_READY" | "OK_SCHEMA_EMITTED" | "OK_PLAN_APPROVED" | "OK_SCAFFOLD_APPROVED" | "OK_IMPL_APPROVED" | "OK_TESTS_APPROVED" | "OK_DOCS_APPROVED" | "OK_CODE_APPROVED" | "OK_TEXT_VALIDATED" | "OK_CONSISTENT" | "OK_ALL_APPROVED" | "REJECT_AMBIGUOUS" | "REJECT_UNSAFE" | "REJECT_INCOMPLETE" | "REJECT_INCONSISTENT" | "REJECT_NO_EVIDENCE" | "REJECT_BAD_PLAN" | "REJECT_CODE_ISSUES" | "E_NEEDS_CLARIFICATION" | "E_INTENT_UNCONFIRMED" | "E_PLAN_INCOMPLETE" | "E_REASONING_MISSING" | "E_SCAFFOLD_ISSUES" | "E_IMPL_ISSUES" | "E_TESTS_INSUFFICIENT" | "E_DOCS_MISSING" | "E_CITATIONS_MISSING" | "E_CONTRADICTION_DETECTED" | "E_PHASES_INCOMPLETE" | "NEED_CLARIFICATION" | "NEED_MORE_CONTEXT" | "SUGGEST_ALTERNATIVE" | "EYE_ERROR" | "EYE_TIMEOUT" | "INVALID_ENVELOPE";
    md: string;
    data: {
        primaryIntent?: string | undefined;
        secondaryIntents?: string[] | undefined;
        intentConfidence?: number | undefined;
        implicitRequirements?: string[] | undefined;
        potentialMisalignment?: string[] | undefined;
        suggestedScope?: string | undefined;
    } & {
        [k: string]: unknown;
    };
    next: string | string[];
    next_action?: string | undefined;
    ui?: {
        title: string;
        summary: string;
        details: string;
        icon: string;
        color: "success" | "warning" | "error" | "info";
    } | undefined;
}>;
export type JoganEnvelope = z.infer<typeof JoganEnvelopeSchema>;
/**
 * Jōgan Eye - Intent Analysis
 * Analyzes the true intent behind requests, detecting misalignment between stated and intended goals
 */
/**
 * JoganEye
 *
 * NOTE: Persona content is stored in database (personas table).
 * This class only provides schema validation.
 */
export declare class JoganEye implements BaseEye {
    readonly name = "jogan";
    validate(envelope: unknown): envelope is JoganEnvelope;
}
export declare const jogan: JoganEye;
//# sourceMappingURL=jogan.d.ts.map