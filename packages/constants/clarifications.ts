export const ClarificationFieldTokens = Object.freeze({
  AUDIENCE: 'audience',
  DELIVERABLE: 'deliverable',
  SCOPE: 'scope',
  SUCCESS_CRITERIA: 'successCriteria',
  REFERENCES: 'references',
} as const);

export type ClarificationField =
  (typeof ClarificationFieldTokens)[keyof typeof ClarificationFieldTokens];

export const CLARIFICATION_FIELDS: ReadonlyArray<ClarificationField> = Object.freeze([
  ClarificationFieldTokens.AUDIENCE,
  ClarificationFieldTokens.DELIVERABLE,
  ClarificationFieldTokens.SCOPE,
  ClarificationFieldTokens.SUCCESS_CRITERIA,
  ClarificationFieldTokens.REFERENCES,
]);

export const CLARIFICATION_FIELD_SET: ReadonlySet<ClarificationField> = new Set(
  CLARIFICATION_FIELDS,
);

export const isClarificationField = (value: unknown): value is ClarificationField =>
  typeof value === 'string' && CLARIFICATION_FIELD_SET.has(value as ClarificationField);

export const REQUIRED_CLARIFICATION_FIELDS: ReadonlyArray<ClarificationField> = CLARIFICATION_FIELDS;

export const CLARIFICATION_FIELD_PROMPTS: Readonly<Record<ClarificationField, string>> =
  Object.freeze({
    [ClarificationFieldTokens.AUDIENCE]:
      'Who is the audience or stakeholder this deliverable must satisfy?',
    [ClarificationFieldTokens.DELIVERABLE]:
      'What concrete deliverable or format is expected (report, checklist, plan, etc.)?',
    [ClarificationFieldTokens.SCOPE]: 'List any constraints, scope boundaries, or systems involved.',
    [ClarificationFieldTokens.SUCCESS_CRITERIA]:
      'What success criteria confirm this task is complete?',
    [ClarificationFieldTokens.REFERENCES]:
      'Provide references, logs, or prior context the agent should align with.',
  });

export const CLARIFICATION_PROMPT_LOOKUP: Readonly<Record<string, ClarificationField>> =
  Object.freeze(
    Object.entries(CLARIFICATION_FIELD_PROMPTS).reduce<Record<string, ClarificationField>>(
      (accumulator, [field, prompt]) => {
        accumulator[prompt] = field as ClarificationField;
        return accumulator;
      },
      {},
    ),
  );

export const CLARIFICATION_FALLBACKS: Readonly<Record<ClarificationField, string>> = Object.freeze({
  [ClarificationFieldTokens.AUDIENCE]: 'Audience not specified',
  [ClarificationFieldTokens.DELIVERABLE]: 'Deliverable not specified',
  [ClarificationFieldTokens.SCOPE]: 'Scope requires clarification',
  [ClarificationFieldTokens.SUCCESS_CRITERIA]: 'Success criteria not specified',
  [ClarificationFieldTokens.REFERENCES]: 'No references provided',
});
