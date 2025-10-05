import { describe, expect, it } from 'vitest';
import { extractClarifications } from '../clarifications';

const state = {
  eye: 'SHARINGAN',
  ok: false,
  code: 'E_NEEDS_CLARIFICATION',
  md: '',
  toolVersion: '1.0.0',
  ts: '2025-01-01T00:00:00Z',
  data: {
    score: 0.82,
    is_code_related: true,
    questions_md: '### Clarifying Questions\n- What is the target repo?\n- Desired deadline?',
  },
};

describe('extractClarifications', () => {
  it('returns structured questions', () => {
    const clarified = extractClarifications(state as never);
    expect(clarified.questions).toHaveLength(2);
    expect(clarified.questions[0].text).toContain('target repo');
    expect(clarified.ambiguityScore).toBeCloseTo(0.82);
    expect(clarified.isCodeRelated).toBe(true);
  });
});
