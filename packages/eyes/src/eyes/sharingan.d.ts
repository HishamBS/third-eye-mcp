import { z } from 'zod';
import { BaseEye } from '../schemas/base';
export declare const SharinganMetadata: z.ZodObject<{
    ambiguityScore: z.ZodNumber;
    ambiguousTerms: z.ZodArray<z.ZodString, "many">;
    missingContext: z.ZodArray<z.ZodString, "many">;
    clarifyingQuestions: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    ambiguityScore: number;
    ambiguousTerms: string[];
    missingContext: string[];
    clarifyingQuestions: string[];
}, {
    ambiguityScore: number;
    ambiguousTerms: string[];
    missingContext: string[];
    clarifyingQuestions: string[];
}>;
export declare const SharinganEnvelopeSchema: z.ZodObject<{
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
    tag: z.ZodLiteral<"sharingan">;
    data: z.ZodObject<{
        ambiguityScore: z.ZodOptional<z.ZodNumber>;
        ambiguousTerms: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        missingContext: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        clarifyingQuestions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        ambiguityScore: z.ZodOptional<z.ZodNumber>;
        ambiguousTerms: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        missingContext: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        clarifyingQuestions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        ambiguityScore: z.ZodOptional<z.ZodNumber>;
        ambiguousTerms: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        missingContext: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        clarifyingQuestions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">>;
}, "strip", z.ZodTypeAny, {
    tag: "sharingan";
    ok: boolean;
    code: "OK" | "OK_WITH_NOTES" | "OK_NO_CLARIFICATION_NEEDED" | "OK_INTENT_CONFIRMED" | "OK_PROMPT_READY" | "OK_SCHEMA_EMITTED" | "OK_PLAN_APPROVED" | "OK_SCAFFOLD_APPROVED" | "OK_IMPL_APPROVED" | "OK_TESTS_APPROVED" | "OK_DOCS_APPROVED" | "OK_CODE_APPROVED" | "OK_TEXT_VALIDATED" | "OK_CONSISTENT" | "OK_ALL_APPROVED" | "REJECT_AMBIGUOUS" | "REJECT_UNSAFE" | "REJECT_INCOMPLETE" | "REJECT_INCONSISTENT" | "REJECT_NO_EVIDENCE" | "REJECT_BAD_PLAN" | "REJECT_CODE_ISSUES" | "E_NEEDS_CLARIFICATION" | "E_INTENT_UNCONFIRMED" | "E_PLAN_INCOMPLETE" | "E_REASONING_MISSING" | "E_SCAFFOLD_ISSUES" | "E_IMPL_ISSUES" | "E_TESTS_INSUFFICIENT" | "E_DOCS_MISSING" | "E_CITATIONS_MISSING" | "E_CONTRADICTION_DETECTED" | "E_PHASES_INCOMPLETE" | "NEED_CLARIFICATION" | "NEED_MORE_CONTEXT" | "SUGGEST_ALTERNATIVE" | "EYE_ERROR" | "EYE_TIMEOUT" | "INVALID_ENVELOPE";
    md: string;
    data: {
        ambiguityScore?: number | undefined;
        ambiguousTerms?: string[] | undefined;
        missingContext?: string[] | undefined;
        clarifyingQuestions?: string[] | undefined;
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
    tag: "sharingan";
    ok: boolean;
    code: "OK" | "OK_WITH_NOTES" | "OK_NO_CLARIFICATION_NEEDED" | "OK_INTENT_CONFIRMED" | "OK_PROMPT_READY" | "OK_SCHEMA_EMITTED" | "OK_PLAN_APPROVED" | "OK_SCAFFOLD_APPROVED" | "OK_IMPL_APPROVED" | "OK_TESTS_APPROVED" | "OK_DOCS_APPROVED" | "OK_CODE_APPROVED" | "OK_TEXT_VALIDATED" | "OK_CONSISTENT" | "OK_ALL_APPROVED" | "REJECT_AMBIGUOUS" | "REJECT_UNSAFE" | "REJECT_INCOMPLETE" | "REJECT_INCONSISTENT" | "REJECT_NO_EVIDENCE" | "REJECT_BAD_PLAN" | "REJECT_CODE_ISSUES" | "E_NEEDS_CLARIFICATION" | "E_INTENT_UNCONFIRMED" | "E_PLAN_INCOMPLETE" | "E_REASONING_MISSING" | "E_SCAFFOLD_ISSUES" | "E_IMPL_ISSUES" | "E_TESTS_INSUFFICIENT" | "E_DOCS_MISSING" | "E_CITATIONS_MISSING" | "E_CONTRADICTION_DETECTED" | "E_PHASES_INCOMPLETE" | "NEED_CLARIFICATION" | "NEED_MORE_CONTEXT" | "SUGGEST_ALTERNATIVE" | "EYE_ERROR" | "EYE_TIMEOUT" | "INVALID_ENVELOPE";
    md: string;
    data: {
        ambiguityScore?: number | undefined;
        ambiguousTerms?: string[] | undefined;
        missingContext?: string[] | undefined;
        clarifyingQuestions?: string[] | undefined;
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
export type SharinganEnvelope = z.infer<typeof SharinganEnvelopeSchema>;
/**
 * Sharingan Eye - Ambiguity Radar
 * Detects vague, ambiguous, or underspecified requests
 */
/**
 * SharinganEye
 *
 * NOTE: Persona content is stored in database (personas table).
 * This class only provides schema validation.
 */
export declare class SharinganEye implements BaseEye {
    readonly name = "sharingan";
    validate(envelope: unknown): envelope is SharinganEnvelope;
}
export declare const sharingan: SharinganEye;
//# sourceMappingURL=sharingan.d.ts.map