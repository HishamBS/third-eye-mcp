export const ClarificationFieldTokens = Object.freeze({
    AUDIENCE: 'audience',
    DELIVERABLE: 'deliverable',
    SCOPE: 'scope',
    SUCCESS_CRITERIA: 'successCriteria',
    REFERENCES: 'references',
});
export const CLARIFICATION_FIELDS = Object.freeze([
    ClarificationFieldTokens.AUDIENCE,
    ClarificationFieldTokens.DELIVERABLE,
    ClarificationFieldTokens.SCOPE,
    ClarificationFieldTokens.SUCCESS_CRITERIA,
    ClarificationFieldTokens.REFERENCES,
]);
export const CLARIFICATION_FIELD_SET = new Set(CLARIFICATION_FIELDS);
export const isClarificationField = (value) => typeof value === 'string' && CLARIFICATION_FIELD_SET.has(value);
export const REQUIRED_CLARIFICATION_FIELDS = CLARIFICATION_FIELDS;
export const CLARIFICATION_FIELD_PROMPTS = Object.freeze({
    [ClarificationFieldTokens.AUDIENCE]: 'Who is the audience or stakeholder this deliverable must satisfy?',
    [ClarificationFieldTokens.DELIVERABLE]: 'What concrete deliverable or format is expected (report, checklist, plan, etc.)?',
    [ClarificationFieldTokens.SCOPE]: 'List any constraints, scope boundaries, or systems involved.',
    [ClarificationFieldTokens.SUCCESS_CRITERIA]: 'What success criteria confirm this task is complete?',
    [ClarificationFieldTokens.REFERENCES]: 'Provide references, logs, or prior context the agent should align with.',
});
export const CLARIFICATION_PROMPT_LOOKUP = Object.freeze(Object.entries(CLARIFICATION_FIELD_PROMPTS).reduce((accumulator, [field, prompt]) => {
    accumulator[prompt] = field;
    return accumulator;
}, {}));
export const CLARIFICATION_FALLBACKS = Object.freeze({
    [ClarificationFieldTokens.AUDIENCE]: 'Audience not specified',
    [ClarificationFieldTokens.DELIVERABLE]: 'Deliverable not specified',
    [ClarificationFieldTokens.SCOPE]: 'Scope requires clarification',
    [ClarificationFieldTokens.SUCCESS_CRITERIA]: 'Success criteria not specified',
    [ClarificationFieldTokens.REFERENCES]: 'No references provided',
});
//# sourceMappingURL=clarifications.js.map