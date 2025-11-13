"use client";

import { useState, useEffect } from "react";
import {
  X,
  ArrowRight,
  ArrowLeft,
  Eye,
  GitBranch,
  Activity,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { ARIA_LABELS, ARIA_DESCRIPTIONS } from "@/constants/accessibility";
import {
  STATUS_TEXT_COLORS,
  STATUS_BG_COLORS_SUBTLE,
  STATUS_BORDER_COLORS_SUBTLE,
} from "@/constants/color-mappings";
import { TIMING } from "@/constants/timing";
import { MODAL_OVERLAY_CLASS } from "@/constants/design-tokens";

interface WelcomeStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  image?: string;
}

const WELCOME_STEPS: WelcomeStep[] = [
  {
    title: "Welcome to Third Eye MCP",
    description:
      "An intelligent oversight system that watches over your AI conversations. Think of it as having multiple expert Eyes reviewing every interaction to ensure quality, safety, and accuracy.",
    icon: <Sparkles className="h-12 w-12 text-brand-accent" />,
  },
  {
    title: "Meet the Eyes",
    description:
      "Eyes are specialized AI agents - each with unique capabilities like fact-checking, tone analysis, or security scanning. You can create custom Eyes or use our built-in collection. Find them in the Eyes page!",
    icon: <Eye className="h-12 w-12 ${STATUS_TEXT_COLORS.info}" />,
  },
  {
    title: "Build Pipelines",
    description:
      "Combine multiple Eyes into workflows called Pipelines. Drag and drop Eyes to create visual flows - like a quality control assembly line for your AI conversations. Check out the Pipelines page to get started!",
    icon: <GitBranch className="h-12 w-12 ${STATUS_TEXT_COLORS.info}" />,
  },
  {
    title: "Monitor Everything",
    description:
      "Watch your Eyes work in real-time on the Monitor page. See sessions in the Sessions page, and replay past conversations in the Replay page. All your oversight activity in one place!",
    icon: <Activity className="h-12 w-12 ${STATUS_TEXT_COLORS.success}" />,
  },
];

const STORAGE_KEY = "third-eye-welcome-seen";

export function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [neverShow, setNeverShow] = useState(false);

  // Phase 20.1: Focus trap for accessibility
  const modalRef = useFocusTrap({
    isActive: isOpen,
    onEscape: () => handleClose(),
  });

  useEffect(() => {
    // Check if user has seen the welcome modal
    const hasSeenWelcome = localStorage.getItem(STORAGE_KEY);
    if (!hasSeenWelcome) {
      // Delay opening slightly for better UX
      setTimeout(() => setIsOpen(true), TIMING.MODAL_ANIMATION_MS);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    if (neverShow) {
      localStorage.setItem(STORAGE_KEY, "true");
    }
  };

  const handleNext = () => {
    if (currentStep < WELCOME_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    setNeverShow(true);
    handleClose();
  };

  const currentStepData = WELCOME_STEPS[currentStep];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-50 flex items-center justify-center ${MODAL_OVERLAY_CLASS} backdrop-blur-sm`}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-modal-title"
          aria-describedby="welcome-modal-description"
        >
          <motion.div
            ref={modalRef}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full max-w-2xl mx-4 rounded-2xl border-2 border-brand-outline/50 bg-brand-paper shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 rounded-lg p-2 text-semantic-muted hover:text-brand-foreground hover:bg-brand-outline/20 transition-colors z-10"
              aria-label={ARIA_LABELS.CLOSE_WELCOME}
            >
              <X className="h-5 w-5" />
            </button>

            {/* Content */}
            <div className="p-8">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <motion.div
                  key={currentStep}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="rounded-full bg-gradient-to-br from-brand-accent/20 to-brand-primary/10 p-6"
                >
                  {currentStepData.icon}
                </motion.div>
              </div>

              {/* Title and Description */}
              <motion.div
                key={`content-${currentStep}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center mb-8"
              >
                <h2
                  id="welcome-modal-title"
                  className="text-2xl font-bold text-brand-foreground mb-4"
                >
                  {currentStepData.title}
                </h2>
                <p
                  id="welcome-modal-description"
                  className="text-base text-semantic-muted leading-relaxed max-w-xl mx-auto"
                >
                  {currentStepData.description}
                </p>
              </motion.div>

              {/* Progress dots */}
              <div
                className="flex justify-center gap-2 mb-8"
                role="navigation"
                aria-label={ARIA_DESCRIPTIONS.WIZARD_PROGRESS(
                  currentStep + 1,
                  WELCOME_STEPS.length,
                )}
              >
                {WELCOME_STEPS.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === currentStep
                        ? "w-8 bg-brand-accent"
                        : "w-2 bg-brand-outline hover:bg-brand-outline/80"
                    }`}
                    aria-label={ARIA_LABELS.GO_TO_STEP(index + 1)}
                    aria-current={index === currentStep ? "step" : undefined}
                  />
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handleSkip}
                  className="text-sm text-semantic-muted hover:text-brand-foreground transition-colors"
                >
                  Skip tour
                </button>

                <div className="flex items-center gap-3">
                  {currentStep > 0 && (
                    <button
                      onClick={handlePrev}
                      className="flex items-center gap-2 rounded-lg bg-brand-outline/20 px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-outline/30 transition-colors"
                      aria-label={ARIA_LABELS.PREVIOUS_STEP}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>
                  )}

                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 rounded-lg bg-brand-accent px-6 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-primary transition-colors"
                    aria-label={
                      currentStep < WELCOME_STEPS.length - 1
                        ? ARIA_LABELS.NEXT_STEP
                        : "Get started with Third Eye"
                    }
                  >
                    {currentStep < WELCOME_STEPS.length - 1
                      ? "Next"
                      : "Get Started"}
                    {currentStep < WELCOME_STEPS.length - 1 && (
                      <ArrowRight className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* "Don't show again" checkbox */}
              {currentStep === WELCOME_STEPS.length - 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6 flex items-center justify-center gap-2"
                >
                  <input
                    type="checkbox"
                    id="never-show"
                    checked={neverShow}
                    onChange={(e) => setNeverShow(e.target.checked)}
                    className="h-4 w-4 rounded border-brand-outline/50 bg-brand-ink text-brand-accent focus:ring-brand-accent focus:ring-offset-brand-ink"
                  />
                  <label
                    htmlFor="never-show"
                    className="text-sm text-semantic-muted cursor-pointer"
                  >
                    Don&apos;t show this again
                  </label>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Function to reset the welcome modal (can be called from settings)
export function resetWelcomeModal() {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
}
