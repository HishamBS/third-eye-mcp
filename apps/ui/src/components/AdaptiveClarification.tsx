import { useState } from 'react';
import { AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { STATUS_TEXT_COLORS, STATUS_BG_COLORS, STATUS_BG_COLORS_SUBTLE, STATUS_BORDER_COLORS_SUBTLE } from '@/constants/color-mappings';

interface ClarificationQuestion {
  id: string;
  question: string;
  answer?: string;
}

interface AdaptiveClarificationProps {
  ambiguityScore: number;
  ambiguousTerms: string[];
  missingContext: string[];
  clarifyingQuestions: string[];
  onAnswerSubmit: (answers: Record<string, string>) => void;
  onSkip: () => void;
}

export function AdaptiveClarification({
  ambiguityScore,
  ambiguousTerms,
  missingContext,
  clarifyingQuestions,
  onAnswerSubmit,
  onSkip,
}: AdaptiveClarificationProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answer,
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < clarifyingQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    onAnswerSubmit(answers);
  };

  const isAllAnswered = clarifyingQuestions.every((_, idx) => answers[idx]?.trim());
  const currentAnswer = answers[currentQuestionIndex] || '';

  // Color scheme based on ambiguity score
  const getScoreColor = () => {
    if (ambiguityScore < 30) return STATUS_TEXT_COLORS.success;
    if (ambiguityScore < 60) return STATUS_TEXT_COLORS.warning;
    return STATUS_TEXT_COLORS.error;
  };

  const getScoreBgColor = () => {
    if (ambiguityScore < 30) return STATUS_BG_COLORS.success;
    if (ambiguityScore < 60) return STATUS_BG_COLORS.warning;
    return STATUS_BG_COLORS.error;
  };

  const getScoreLabel = () => {
    if (ambiguityScore < 30) return 'Clear';
    if (ambiguityScore < 60) return 'Needs Clarification';
    return 'High Ambiguity';
  };

  return (
    <div className="space-y-6">
      {/* Ambiguity Score Visualization */}
      <div className="rounded-2xl border border-brand-outline/40 bg-brand-paper/60 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-brand-foreground">Ambiguity Detection</h3>
          <div className={`flex items-center gap-2 ${getScoreColor()}`}>
            {ambiguityScore < 30 ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span className="text-sm font-medium">{getScoreLabel()}</span>
          </div>
        </div>

        {/* Score Bar */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-semantic-muted">Ambiguity Score</span>
            <span className={`font-bold ${getScoreColor()}`}>{ambiguityScore}/100</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-brand-paper">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${ambiguityScore}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full ${getScoreBgColor()} rounded-full`}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-semantic-muted">
            <span>Clear (0-29)</span>
            <span>Needs Input (30-59)</span>
            <span>Rejected (60-100)</span>
          </div>
        </div>

        {/* Ambiguous Terms */}
        {ambiguousTerms.length > 0 && (
          <div className="mb-4">
            <h4 className="mb-2 text-sm font-medium text-semantic-muted">Ambiguous Terms Found</h4>
            <div className="flex flex-wrap gap-2">
              {ambiguousTerms.map((term, idx) => (
                <span
                  key={idx}
                  className={`rounded-full ${STATUS_BG_COLORS_SUBTLE.warning} px-3 py-1 text-xs ${STATUS_TEXT_COLORS.warning} border ${STATUS_BORDER_COLORS_SUBTLE.warning}`}
                >
                  {term}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Missing Context */}
        {missingContext.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-semantic-muted">Missing Context</h4>
            <ul className="space-y-1 text-sm text-semantic-muted">
              {missingContext.map((context, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className={STATUS_TEXT_COLORS.error}>•</span>
                  <span>{context}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Clarifying Questions - Only show if score is high enough */}
      {ambiguityScore >= 30 && clarifyingQuestions.length > 0 && (
        <div className="rounded-2xl border border-brand-outline/40 bg-brand-paper/60 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-brand-foreground">
              <HelpCircle className="h-5 w-5 text-brand-accent" />
              Clarifying Questions
            </h3>
            <span className="text-sm text-semantic-muted">
              {Object.keys(answers).filter(k => answers[k]?.trim()).length} / {clarifyingQuestions.length} answered
            </span>
          </div>

          {/* Progress Indicators */}
          <div className="mb-6 flex gap-2">
            {clarifyingQuestions.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  idx === currentQuestionIndex
                    ? 'bg-brand-accent'
                    : answers[idx]?.trim()
                    ? STATUS_BG_COLORS.success
                    : 'bg-brand-outline/40'
                }`}
              />
            ))}
          </div>

          {/* Current Question */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="rounded-xl border border-brand-accent/30 bg-brand-accent/5 p-4">
                <p className="text-sm font-medium text-semantic-muted">
                  Question {currentQuestionIndex + 1} of {clarifyingQuestions.length}
                </p>
                <p className="mt-2 text-base text-brand-foreground">{clarifyingQuestions[currentQuestionIndex]}</p>
              </div>

              <textarea
                value={currentAnswer}
                onChange={(e) => handleAnswerChange(currentQuestionIndex, e.target.value)}
                placeholder="Type your answer here..."
                className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-brand-foreground placeholder-brand-outline focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                rows={4}
              />

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                  className="rounded-full border border-brand-outline/50 px-4 py-2 text-sm font-medium text-semantic-muted transition hover:border-brand-accent hover:text-brand-accent disabled:opacity-30 disabled:hover:border-brand-outline/50 disabled:hover:text-semantic-muted"
                >
                  ← Previous
                </button>

                {currentQuestionIndex < clarifyingQuestions.length - 1 ? (
                  <button
                    onClick={handleNext}
                    disabled={!currentAnswer.trim()}
                    className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-foreground transition hover:bg-brand-primary disabled:opacity-50"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={!isAllAnswered}
                    className={`rounded-full ${STATUS_BG_COLORS.success} px-5 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90 disabled:opacity-50`}
                  >
                    Submit Answers ✓
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Skip Option */}
          <div className="mt-6 border-t border-brand-outline/30 pt-4 text-center">
            <button
              onClick={onSkip}
              className="text-sm text-semantic-muted transition hover:text-semantic-muted"
            >
              Skip clarification and continue anyway
            </button>
          </div>
        </div>
      )}

      {/* Auto-proceed message for low scores */}
      {ambiguityScore < 30 && (
        <div className={`rounded-xl border ${STATUS_BORDER_COLORS_SUBTLE.success} ${STATUS_BG_COLORS_SUBTLE.success} p-4`}>
          <div className="flex items-start gap-3">
            <CheckCircle className={`h-5 w-5 ${STATUS_TEXT_COLORS.success} flex-shrink-0 mt-0.5`} />
            <div>
              <p className={`font-medium ${STATUS_TEXT_COLORS.success}`}>Input is clear!</p>
              <p className={`mt-1 text-sm ${STATUS_TEXT_COLORS.success} opacity-80`}>
                No clarification needed. Proceeding to next Eye automatically.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
