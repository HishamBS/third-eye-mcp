import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { submitClarifications } from '../lib/api';
import type { ClarificationQuestion } from '../types/pipeline';

export interface ClarificationsPanelProps {
  sessionId: string;
  apiKey: string;
  questions: ClarificationQuestion[];
  onSubmitted?: () => void;
  loading?: boolean;
  ambiguityScore?: number;
}

export function ClarificationsPanel({ sessionId, apiKey, questions, onSubmitted, loading = false, ambiguityScore }: ClarificationsPanelProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disabled = loading || submitting || !questions.length || !sessionId || !apiKey;

  const compiledMarkdown = useMemo(() => {
    return questions
      .map((question, index) => `### Q${index + 1}\n${question.text}\n\n**Answer:** ${answers[question.id] ?? ''}`)
      .join('\n\n');
  }, [questions, answers]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled) return;
    try {
      if (!sessionId || !apiKey) {
        setError('Session or API key missing.');
        return;
      }
      setSubmitting(true);
      setError(null);
      await submitClarifications({
        sessionId,
        apiKey,
        answersMd: compiledMarkdown,
        context: { ambiguity_score: ambiguityScore },
      });
      setAnswers({});
      onSubmitted?.();
    } catch (err) {
      console.error(err);
      setError('Failed to send clarifications');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-brand-outline/40 bg-brand-paperElev/70 p-6 text-sm text-slate-200">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Adaptive Clarification</p>
          <h3 className="text-lg font-semibold text-white">Answer the Sharingan</h3>
        </div>
        {typeof ambiguityScore === 'number' && (
          <span className="rounded-full border border-brand-outline/50 px-3 py-1 text-xs text-brand-accent">
            Ambiguity {Math.round(ambiguityScore * 100)}%
          </span>
        )}
      </header>

      {!questions.length ? (
        <p className="mt-4 text-sm text-slate-400">No clarifications required. Sharingan marked this request as clear.</p>
      ) : (
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          {questions.map((question, index) => (
            <label key={question.id} className="block space-y-2">
              <span className="text-sm font-medium text-slate-200">Q{index + 1}. {question.text}</span>
              <textarea
                required
                minLength={3}
                rows={2}
                className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper p-3 text-sm text-slate-100 shadow-inner shadow-black/20 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                value={answers[question.id] ?? ''}
                onChange={(event) => setAnswers((prev) => ({ ...prev, [question.id]: event.target.value }))}
              />
            </label>
          ))}

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">Responses forward to Prompt Helper for rewrite.</p>
            <button
              type="submit"
              disabled={disabled}
              className="inline-flex items-center gap-2 rounded-full bg-brand-accent px-4 py-2 text-xs font-semibold text-brand-ink transition hover:bg-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit answers'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export default ClarificationsPanel;
