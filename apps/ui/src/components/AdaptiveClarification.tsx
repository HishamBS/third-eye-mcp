import { useState } from 'react';
import { AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    if (ambiguityScore < 30) return 'text-emerald-400';
    if (ambiguityScore < 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBgColor = () => {
    if (ambiguityScore < 30) return 'bg-emerald-500';
    if (ambiguityScore < 60) return 'bg-yellow-500';
    return 'bg-red-500';
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
          <h3 className="text-lg font-semibold text-white">Ambiguity Detection</h3>
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
            <span className="text-slate-400">Ambiguity Score</span>
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
          <div className="mt-2 flex justify-between text-xs text-slate-500">
            <span>Clear (0-29)</span>
            <span>Needs Input (30-59)</span>
            <span>Rejected (60-100)</span>
          </div>
        </div>

        {/* Ambiguous Terms */}
        {ambiguousTerms.length > 0 && (
          <div className="mb-4">
            <h4 className="mb-2 text-sm font-medium text-slate-300">Ambiguous Terms Found</h4>
            <div className="flex flex-wrap gap-2">
              {ambiguousTerms.map((term, idx) => (
                <span
                  key={idx}
                  className="rounded-full bg-yellow-500/20 px-3 py-1 text-xs text-yellow-300 border border-yellow-500/30"
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
            <h4 className="mb-2 text-sm font-medium text-slate-300">Missing Context</h4>
            <ul className="space-y-1 text-sm text-slate-400">
              {missingContext.map((context, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-red-400">•</span>
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
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <HelpCircle className="h-5 w-5 text-brand-accent" />
              Clarifying Questions
            </h3>
            <span className="text-sm text-slate-400">
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
                    ? 'bg-emerald-500'
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
                <p className="text-sm font-medium text-slate-300">
                  Question {currentQuestionIndex + 1} of {clarifyingQuestions.length}
                </p>
                <p className="mt-2 text-base text-white">{clarifyingQuestions[currentQuestionIndex]}</p>
              </div>

              <textarea
                value={currentAnswer}
                onChange={(e) => handleAnswerChange(currentQuestionIndex, e.target.value)}
                placeholder="Type your answer here..."
                className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                rows={4}
              />

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                  className="rounded-full border border-brand-outline/50 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-brand-accent hover:text-brand-accent disabled:opacity-30 disabled:hover:border-brand-outline/50 disabled:hover:text-slate-300"
                >
                  ← Previous
                </button>

                {currentQuestionIndex < clarifyingQuestions.length - 1 ? (
                  <button
                    onClick={handleNext}
                    disabled={!currentAnswer.trim()}
                    className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary disabled:opacity-50"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={!isAllAnswered}
                    className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
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
              className="text-sm text-slate-400 transition hover:text-slate-200"
            >
              Skip clarification and continue anyway
            </button>
          </div>
        </div>
      )}

      {/* Auto-proceed message for low scores */}
      {ambiguityScore < 30 && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-emerald-300">Input is clear!</p>
              <p className="mt-1 text-sm text-emerald-400/80">
                No clarification needed. Proceeding to next Eye automatically.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
