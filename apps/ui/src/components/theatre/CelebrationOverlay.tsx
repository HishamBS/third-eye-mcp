"use client";

/**
 * CelebrationOverlay - Victory moment
 *
 * Dramatic celebration for milestones:
 * - Minor: Subtle acknowledgment
 * - Major: Particles and glow
 * - Finale: Full theatrical celebration
 */

import { memo, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Trophy, Sparkles, CheckCircle2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CelebrationType } from "@third-eye/types";
import { celebrationVariants, confettiVariants } from "./effects/animations";

export interface CelebrationOverlayProps {
  /** Type of celebration */
  type: CelebrationType;
  /** Celebration message */
  message: string;
  /** Auto-dismiss duration in ms (0 = no auto-dismiss) */
  autoDismissMs?: number;
  /** Callback when dismissed */
  onDismiss?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Confetti particle
 */
function ConfettiParticle({ index, color }: { index: number; color: string }) {
  const angle = (index / 12) * 360;
  const distance = 80 + Math.random() * 60;

  return (
    <motion.div
      className="absolute left-1/2 top-1/2 h-3 w-3"
      style={{
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? "50%" : "0",
        transform: `rotate(${Math.random() * 360}deg)`,
      }}
      initial={{
        x: 0,
        y: 0,
        opacity: 1,
        scale: 1,
      }}
      animate={{
        x: Math.cos((angle * Math.PI) / 180) * distance,
        y: Math.sin((angle * Math.PI) / 180) * distance + 50,
        opacity: [1, 1, 0],
        scale: [1, 1.2, 0.5],
        rotate: Math.random() * 720,
      }}
      transition={{
        duration: 1.5,
        ease: "easeOut",
        delay: Math.random() * 0.2,
      }}
    />
  );
}

/**
 * Configuration per celebration type
 */
const CELEBRATION_CONFIG = {
  minor: {
    icon: CheckCircle2,
    colors: ["#10B981", "#059669"],
    duration: 2000,
    particleCount: 0,
    ringScale: 1.2,
    bgOpacity: 0.3,
  },
  major: {
    icon: Star,
    colors: ["#d4af37", "#f59e0b", "#eab308"],
    duration: 3000,
    particleCount: 8,
    ringScale: 1.5,
    bgOpacity: 0.5,
  },
  finale: {
    icon: Trophy,
    colors: ["#d4af37", "#f59e0b", "#10B981", "#a855f7", "#ec4899"],
    duration: 5000,
    particleCount: 16,
    ringScale: 2,
    bgOpacity: 0.7,
  },
};

function CelebrationOverlayComponent({
  type,
  message,
  autoDismissMs,
  onDismiss,
  className,
}: CelebrationOverlayProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(true);

  const config = CELEBRATION_CONFIG[type];
  const Icon = config.icon;

  // Auto-dismiss logic
  useEffect(() => {
    const dismissTime = autoDismissMs ?? config.duration;
    if (dismissTime > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, dismissTime);
      return () => clearTimeout(timer);
    }
  }, [autoDismissMs, config.duration]);

  // Notify parent when dismissed
  useEffect(() => {
    if (!isVisible) {
      const timer = setTimeout(() => {
        onDismiss?.();
      }, 300); // Wait for exit animation
      return () => clearTimeout(timer);
    }
  }, [isVisible, onDismiss]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
  }, []);

  // Simplified rendering for reduced motion
  if (prefersReducedMotion) {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className={cn(
              "fixed inset-0 z-50 flex items-center justify-center bg-black/50",
              className,
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
          >
            <div className="rounded-xl bg-neutral-900 p-8 text-center shadow-2xl">
              <Icon className="mx-auto mb-4 h-12 w-12 text-amber-400" />
              <p className="text-xl font-semibold text-white">{message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center",
            className,
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleDismiss}
        >
          {/* Background overlay */}
          <motion.div
            className="absolute inset-0 bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: config.bgOpacity }}
            exit={{ opacity: 0 }}
          />

          {/* Radial glow */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at center, ${config.colors[0]}30 0%, transparent 60%)`,
            }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 2, opacity: 1 }}
            exit={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.8 }}
          />

          {/* Main celebration content */}
          <motion.div
            className="relative flex flex-col items-center"
            variants={celebrationVariants}
            initial="initial"
            animate="celebrate"
            exit="exit"
          >
            {/* Confetti particles */}
            {config.particleCount > 0 && (
              <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: config.particleCount }).map((_, i) => (
                  <ConfettiParticle
                    key={i}
                    index={i}
                    color={config.colors[i % config.colors.length]}
                  />
                ))}
              </div>
            )}

            {/* Expanding rings */}
            {type !== "minor" && (
              <>
                <motion.div
                  className="absolute h-32 w-32 rounded-full border-2"
                  style={{ borderColor: config.colors[0] }}
                  initial={{ scale: 0.5, opacity: 1 }}
                  animate={{
                    scale: config.ringScale,
                    opacity: 0,
                  }}
                  transition={{ duration: 1, delay: 0.2 }}
                />
                <motion.div
                  className="absolute h-32 w-32 rounded-full border-2"
                  style={{ borderColor: config.colors[1] || config.colors[0] }}
                  initial={{ scale: 0.5, opacity: 1 }}
                  animate={{
                    scale: config.ringScale * 1.3,
                    opacity: 0,
                  }}
                  transition={{ duration: 1, delay: 0.4 }}
                />
              </>
            )}

            {/* Icon container */}
            <motion.div
              className="relative flex h-24 w-24 items-center justify-center rounded-full"
              style={{
                background: `linear-gradient(135deg, ${config.colors[0]}40, ${config.colors[1] || config.colors[0]}20)`,
                boxShadow: `0 0 30px ${config.colors[0]}60, 0 0 60px ${config.colors[0]}30`,
              }}
              animate={{
                boxShadow: [
                  `0 0 30px ${config.colors[0]}60, 0 0 60px ${config.colors[0]}30`,
                  `0 0 50px ${config.colors[0]}80, 0 0 80px ${config.colors[0]}40`,
                  `0 0 30px ${config.colors[0]}60, 0 0 60px ${config.colors[0]}30`,
                ],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Icon className="h-12 w-12" style={{ color: config.colors[0] }} />

              {/* Sparkle effects for finale */}
              {type === "finale" && (
                <>
                  <motion.div
                    className="absolute -right-2 -top-2"
                    animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Sparkles className="h-6 w-6 text-amber-400" />
                  </motion.div>
                  <motion.div
                    className="absolute -bottom-2 -left-2"
                    animate={{ rotate: -360, scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  >
                    <Sparkles className="h-5 w-5 text-emerald-400" />
                  </motion.div>
                </>
              )}
            </motion.div>

            {/* Message */}
            <motion.div
              className="mt-6 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <p
                className="text-2xl font-bold text-white"
                style={{
                  textShadow: `0 0 20px ${config.colors[0]}80`,
                  fontFamily: "var(--font-display, serif)",
                }}
              >
                {message}
              </p>

              {type === "finale" && (
                <motion.p
                  className="mt-2 text-sm text-neutral-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  Click anywhere to continue
                </motion.p>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const CelebrationOverlay = memo(CelebrationOverlayComponent);
CelebrationOverlay.displayName = "CelebrationOverlay";
