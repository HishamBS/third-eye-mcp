import { z } from 'zod';
export declare const EyeStatusCode: z.ZodEnum<["OK", "OK_WITH_NOTES", "OK_NO_CLARIFICATION_NEEDED", "OK_INTENT_CONFIRMED", "OK_PROMPT_READY", "OK_SCHEMA_EMITTED", "OK_PLAN_APPROVED", "OK_SCAFFOLD_APPROVED", "OK_IMPL_APPROVED", "OK_TESTS_APPROVED", "OK_DOCS_APPROVED", "OK_CODE_APPROVED", "OK_TEXT_VALIDATED", "OK_CONSISTENT", "OK_ALL_APPROVED", "REJECT_AMBIGUOUS", "REJECT_UNSAFE", "REJECT_INCOMPLETE", "REJECT_INCONSISTENT", "REJECT_NO_EVIDENCE", "REJECT_BAD_PLAN", "REJECT_CODE_ISSUES", "E_NEEDS_CLARIFICATION", "E_INTENT_UNCONFIRMED", "E_PLAN_INCOMPLETE", "E_REASONING_MISSING", "E_SCAFFOLD_ISSUES", "E_IMPL_ISSUES", "E_TESTS_INSUFFICIENT", "E_DOCS_MISSING", "E_CITATIONS_MISSING", "E_CONTRADICTION_DETECTED", "E_PHASES_INCOMPLETE", "NEED_CLARIFICATION", "NEED_MORE_CONTEXT", "SUGGEST_ALTERNATIVE", "EYE_ERROR", "EYE_TIMEOUT", "INVALID_ENVELOPE"]>;
export type EyeStatusCodeType = z.infer<typeof EyeStatusCode>;
export declare const BaseEnvelopeSchema: z.ZodObject<{
    tag: z.ZodString;
    ok: z.ZodBoolean;
    code: z.ZodEnum<["OK", "OK_WITH_NOTES", "OK_NO_CLARIFICATION_NEEDED", "OK_INTENT_CONFIRMED", "OK_PROMPT_READY", "OK_SCHEMA_EMITTED", "OK_PLAN_APPROVED", "OK_SCAFFOLD_APPROVED", "OK_IMPL_APPROVED", "OK_TESTS_APPROVED", "OK_DOCS_APPROVED", "OK_CODE_APPROVED", "OK_TEXT_VALIDATED", "OK_CONSISTENT", "OK_ALL_APPROVED", "REJECT_AMBIGUOUS", "REJECT_UNSAFE", "REJECT_INCOMPLETE", "REJECT_INCONSISTENT", "REJECT_NO_EVIDENCE", "REJECT_BAD_PLAN", "REJECT_CODE_ISSUES", "E_NEEDS_CLARIFICATION", "E_INTENT_UNCONFIRMED", "E_PLAN_INCOMPLETE", "E_REASONING_MISSING", "E_SCAFFOLD_ISSUES", "E_IMPL_ISSUES", "E_TESTS_INSUFFICIENT", "E_DOCS_MISSING", "E_CITATIONS_MISSING", "E_CONTRADICTION_DETECTED", "E_PHASES_INCOMPLETE", "NEED_CLARIFICATION", "NEED_MORE_CONTEXT", "SUGGEST_ALTERNATIVE", "EYE_ERROR", "EYE_TIMEOUT", "INVALID_ENVELOPE"]>;
    md: z.ZodString;
    data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
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
}, "strip", z.ZodTypeAny, {
    tag: string;
    ok: boolean;
    code: "OK" | "OK_WITH_NOTES" | "OK_NO_CLARIFICATION_NEEDED" | "OK_INTENT_CONFIRMED" | "OK_PROMPT_READY" | "OK_SCHEMA_EMITTED" | "OK_PLAN_APPROVED" | "OK_SCAFFOLD_APPROVED" | "OK_IMPL_APPROVED" | "OK_TESTS_APPROVED" | "OK_DOCS_APPROVED" | "OK_CODE_APPROVED" | "OK_TEXT_VALIDATED" | "OK_CONSISTENT" | "OK_ALL_APPROVED" | "REJECT_AMBIGUOUS" | "REJECT_UNSAFE" | "REJECT_INCOMPLETE" | "REJECT_INCONSISTENT" | "REJECT_NO_EVIDENCE" | "REJECT_BAD_PLAN" | "REJECT_CODE_ISSUES" | "E_NEEDS_CLARIFICATION" | "E_INTENT_UNCONFIRMED" | "E_PLAN_INCOMPLETE" | "E_REASONING_MISSING" | "E_SCAFFOLD_ISSUES" | "E_IMPL_ISSUES" | "E_TESTS_INSUFFICIENT" | "E_DOCS_MISSING" | "E_CITATIONS_MISSING" | "E_CONTRADICTION_DETECTED" | "E_PHASES_INCOMPLETE" | "NEED_CLARIFICATION" | "NEED_MORE_CONTEXT" | "SUGGEST_ALTERNATIVE" | "EYE_ERROR" | "EYE_TIMEOUT" | "INVALID_ENVELOPE";
    md: string;
    data: Record<string, unknown>;
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
    tag: string;
    ok: boolean;
    code: "OK" | "OK_WITH_NOTES" | "OK_NO_CLARIFICATION_NEEDED" | "OK_INTENT_CONFIRMED" | "OK_PROMPT_READY" | "OK_SCHEMA_EMITTED" | "OK_PLAN_APPROVED" | "OK_SCAFFOLD_APPROVED" | "OK_IMPL_APPROVED" | "OK_TESTS_APPROVED" | "OK_DOCS_APPROVED" | "OK_CODE_APPROVED" | "OK_TEXT_VALIDATED" | "OK_CONSISTENT" | "OK_ALL_APPROVED" | "REJECT_AMBIGUOUS" | "REJECT_UNSAFE" | "REJECT_INCOMPLETE" | "REJECT_INCONSISTENT" | "REJECT_NO_EVIDENCE" | "REJECT_BAD_PLAN" | "REJECT_CODE_ISSUES" | "E_NEEDS_CLARIFICATION" | "E_INTENT_UNCONFIRMED" | "E_PLAN_INCOMPLETE" | "E_REASONING_MISSING" | "E_SCAFFOLD_ISSUES" | "E_IMPL_ISSUES" | "E_TESTS_INSUFFICIENT" | "E_DOCS_MISSING" | "E_CITATIONS_MISSING" | "E_CONTRADICTION_DETECTED" | "E_PHASES_INCOMPLETE" | "NEED_CLARIFICATION" | "NEED_MORE_CONTEXT" | "SUGGEST_ALTERNATIVE" | "EYE_ERROR" | "EYE_TIMEOUT" | "INVALID_ENVELOPE";
    md: string;
    data: Record<string, unknown>;
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
export type BaseEnvelope = z.infer<typeof BaseEnvelopeSchema>;
export type LegacyEnvelope = {
    eye: string;
    code: EyeStatusCodeType;
    verdict: 'APPROVED' | 'REJECTED' | 'NEEDS_INPUT';
    summary: string;
    details?: string;
    suggestions?: string[];
    confidence?: number;
    metadata?: Record<string, unknown>;
};
export interface BaseEye {
    readonly name: string;
    /**
     * Validate that envelope conforms to this Eye's schema
     */
    validate(envelope: unknown): envelope is BaseEnvelope;
}
export declare function createStatusCode(code: EyeStatusCodeType, description: string): {
    code: EyeStatusCodeType;
    description: string;
};
export declare function isApproved(envelope: BaseEnvelope): boolean;
export declare function isRejected(envelope: BaseEnvelope): boolean;
export declare function needsInput(envelope: BaseEnvelope): boolean;
export declare function legacyToEnvelope(legacy: LegacyEnvelope): BaseEnvelope;
//# sourceMappingURL=base.d.ts.map