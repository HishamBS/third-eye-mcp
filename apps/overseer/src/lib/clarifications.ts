import type { ClarificationContext, ClarificationQuestion, EyeState } from '../types/pipeline';

function normaliseQuestionLine(line: string, index: number): ClarificationQuestion {
  const clean = line.replace(/^[-*\d.\s]+/, '').trim();
  return {
    id: `q-${index}`,
    text: clean,
  };
}

export function extractClarifications(eye: EyeState | undefined): ClarificationContext {
  if (!eye) {
    return { questions: [] };
  }

  const data = eye.data ?? {};
  const questionsMd = typeof data.questions_md === 'string' ? data.questions_md : '';
  const score = typeof data.score === 'number' ? data.score : undefined;
  const isCodeRelated = typeof data.is_code_related === 'boolean' ? data.is_code_related : undefined;

  const lines = questionsMd
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.toLowerCase().startsWith('###'));

  const questions = lines.map(normaliseQuestionLine);

  return {
    questions,
    ambiguityScore: score,
    isCodeRelated,
  };
}
