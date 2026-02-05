"use client";

/**
 * EyeCharacter - Eye avatar with aura and stage presence
 *
 * Renders an Eye character on stage with:
 * - Glowing orb with Eye-specific pattern
 * - Signature color aura with particles
 * - Name badge below
 * - State-specific animations
 */

import { memo, useMemo } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { EyeCharacterState, EyePersonaConfig } from "@third-eye/types";
import { ParticleSystem } from "./effects";
import {
  characterStateVariants,
  getEntranceVariants,
} from "./effects/animations";

export type EyeCharacterSize = "small" | "medium" | "large";
export type EyeCharacterPosition = "left-wing" | "center" | "right-wing";

export interface EyeCharacterProps {
  /** Eye persona configuration */
  persona: EyePersonaConfig;
  /** Current character state */
  state: EyeCharacterState;
  /** Display size */
  size?: EyeCharacterSize;
  /** Stage position */
  position?: EyeCharacterPosition;
  /** Whether to show particles */
  showParticles?: boolean;
  /** Whether to show name badge */
  showName?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

/**
 * Size configuration
 */
const SIZE_CONFIG: Record<
  EyeCharacterSize,
  {
    avatar: string;
    symbol: string;
    name: string;
    glow: number;
  }
> = {
  small: {
    avatar: "h-12 w-12",
    symbol: "text-lg",
    name: "text-xs",
    glow: 8,
  },
  medium: {
    avatar: "h-20 w-20",
    symbol: "text-2xl",
    name: "text-sm",
    glow: 12,
  },
  large: {
    avatar: "h-32 w-32",
    symbol: "text-4xl",
    name: "text-base",
    glow: 20,
  },
};

/**
 * Position-based opacity and scale
 */
const POSITION_CONFIG: Record<
  EyeCharacterPosition,
  {
    opacity: number;
    scale: number;
    grayscale: number;
  }
> = {
  "left-wing": {
    opacity: 0.5,
    scale: 0.8,
    grayscale: 0.5,
  },
  center: {
    opacity: 1,
    scale: 1,
    grayscale: 0,
  },
  "right-wing": {
    opacity: 0.6,
    scale: 0.85,
    grayscale: 0,
  },
};

function EyeCharacterComponent({
  persona,
  state,
  size = "medium",
  position = "center",
  showParticles = true,
  showName = true,
  className,
  onClick,
}: EyeCharacterProps) {
  const prefersReducedMotion = useReducedMotion();
  const sizeConfig = SIZE_CONFIG[size];
  const positionConfig = POSITION_CONFIG[position];

  // Get entrance variants based on persona's entrance direction
  const entranceVariants = useMemo(
    () => getEntranceVariants(persona.entranceDirection),
    [persona.entranceDirection],
  );

  // Compute animation variant based on state
  const currentVariant = useMemo(() => {
    if (state === "offstage") return "offstage";
    if (state === "entering") return "entering";
    if (state === "exiting") return "exiting";
    return state;
  }, [state]);

  // Glow shadow style
  const glowStyle = useMemo(() => {
    if (state === "offstage" || position !== "center") {
      return {};
    }
    return {
      boxShadow: `0 0 ${sizeConfig.glow}px ${persona.color.glow},
                  0 0 ${sizeConfig.glow * 2}px ${persona.color.glow}`,
    };
  }, [state, position, sizeConfig.glow, persona.color.glow]);

  // Don't render if offstage (unless entering)
  if (state === "offstage") {
    return null;
  }

  return (
    <motion.div
      className={cn(
        "relative flex flex-col items-center gap-2",
        onClick && "cursor-pointer",
        className,
      )}
      variants={
        state === "entering" ? entranceVariants : characterStateVariants
      }
      initial={state === "entering" ? "initial" : undefined}
      animate={currentVariant}
      exit="exiting"
      style={{
        opacity: positionConfig.opacity,
        scale: positionConfig.scale,
        filter: `grayscale(${positionConfig.grayscale})`,
      }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Particles (behind avatar) */}
      {showParticles && position === "center" && (
        <div className="absolute inset-0 -z-10">
          <ParticleSystem
            eye={persona.id}
            type="ambient"
            intensity={
              state === "speaking" || state === "celebrating" ? 0.8 : 0.4
            }
            isActive={state !== "offstage" && state !== "exiting"}
          />
        </div>
      )}

      {/* Avatar orb */}
      <motion.div
        className={cn(
          "relative flex items-center justify-center rounded-full",
          sizeConfig.avatar,
        )}
        style={{
          backgroundColor: `${persona.color.primary}20`,
          border: `2px solid ${persona.color.primary}60`,
          ...glowStyle,
        }}
        animate={
          state === "speaking" && !prefersReducedMotion
            ? {
                scale: [1, 1.05, 1],
                transition: { duration: 0.8, repeat: Infinity },
              }
            : state === "thinking" && !prefersReducedMotion
              ? {
                  rotate: [0, 5, -5, 0],
                  transition: { duration: 2, repeat: Infinity },
                }
              : {}
        }
      >
        {/* Inner glow */}
        <div
          className="absolute inset-2 rounded-full"
          style={{
            background: `radial-gradient(circle at 30% 30%,
              ${persona.color.primary}40 0%,
              transparent 70%)`,
          }}
        />

        {/* Symbol */}
        <span
          className={cn(sizeConfig.symbol, "relative z-10 font-bold")}
          style={{ color: persona.color.primary }}
        >
          {persona.symbol}
        </span>

        {/* Outer ring animation */}
        {position === "center" &&
          state !== "offstage" &&
          !prefersReducedMotion && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                border: `1px solid ${persona.color.primary}`,
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          )}
      </motion.div>

      {/* Name badge */}
      {showName && (
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <span
            className={cn(sizeConfig.name, "font-medium tracking-wide")}
            style={{ color: persona.color.primary }}
          >
            {persona.name}
          </span>
          {position === "center" && (
            <span
              className="text-xs text-neutral-400"
              style={{ fontFamily: "var(--font-narrative, serif)" }}
            >
              {persona.role}
            </span>
          )}
        </motion.div>
      )}

      {/* Status indicator for wing positions */}
      {position === "right-wing" && (
        <div
          className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-500"
          title="Completed"
        />
      )}
    </motion.div>
  );
}

export const EyeCharacter = memo(EyeCharacterComponent);
EyeCharacter.displayName = "EyeCharacter";
