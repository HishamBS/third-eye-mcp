export declare const ClarificationFieldTokens: Readonly<{
    readonly AUDIENCE: "audience";
    readonly DELIVERABLE: "deliverable";
    readonly SCOPE: "scope";
    readonly SUCCESS_CRITERIA: "successCriteria";
    readonly REFERENCES: "references";
}>;
export type ClarificationField = (typeof ClarificationFieldTokens)[keyof typeof ClarificationFieldTokens];
export declare const CLARIFICATION_FIELDS: ReadonlyArray<ClarificationField>;
export declare const CLARIFICATION_FIELD_SET: ReadonlySet<ClarificationField>;
export declare const isClarificationField: (value: unknown) => value is ClarificationField;
export declare const REQUIRED_CLARIFICATION_FIELDS: ReadonlyArray<ClarificationField>;
export declare const CLARIFICATION_FIELD_PROMPTS: Readonly<Record<ClarificationField, string>>;
export declare const CLARIFICATION_PROMPT_LOOKUP: Readonly<Record<string, ClarificationField>>;
export declare const CLARIFICATION_FALLBACKS: Readonly<Record<ClarificationField, string>>;
//# sourceMappingURL=clarifications.d.ts.map