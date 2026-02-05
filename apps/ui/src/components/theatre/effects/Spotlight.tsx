"use client";

/**
 * Spotlight - Theatrical lighting effect for the stage
 *
 * Creates a dramatic spotlight effect that follows the active Eye
 * on stage. The spotlight color and intensity adapt to the
 * current performer's signature color.
 */

import { memo, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { SpotlightIntensity } from "@third-eye/types";

export interface SpotlightProps {
  /** Target position for spotlight center */
  targetPosition?: { x: number; y: number };
  /** Eye's signature color (hex or CSS color) */
  color?: string;
  /** Spotlight intensity level */
  intensity?: SpotlightIntensity;
  /** Whether the spotlight is active */
  isActive?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Intensity to opacity/scale mapping
 */
const INTENSITY_CONFIG: Record<
  SpotlightIntensity,
  { opacity: number; scale: number; blur: number }
> = {
  dim: { opacity: 0.3, scale: 0.8, blur: 40 },
  normal: { opacity: 0.6, scale: 1, blur: 30 },
  bright: { opacity: 0.8, scale: 1.1, blur: 25 },
  dramatic: { opacity: 1, scale: 1.2, blur: 20 },
};

/**
 * Default spotlight configuration
 */
const DEFAULT_COLOR = "#d4af37"; // Theatre gold
const DEFAULT_POSITION = { x: 50, y: 50 };

function SpotlightComponent({
  targetPosition = DEFAULT_POSITION,
  color = DEFAULT_COLOR,
  intensity = "normal",
  isActive = true,
  className,
}: SpotlightProps) {
  const prefersReducedMotion = useReducedMotion();
  const config = INTENSITY_CONFIG[intensity];

  // Parse color to RGB for gradient
  const rgbColor = useMemo(() => {
    // Handle hex colors
    if (color.startsWith("#")) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `${r}, ${g}, ${b}`;
    }
    // Handle rgb/rgba colors
    const match = color.match(/\d+/g);
    if (match && match.length >= 3) {
      return `${match[0]}, ${match[1]}, ${match[2]}`;
    }
    // Fallback to gold
    return "212, 175, 55";
  }, [color]);

  // Generate gradient background
  const gradient = useMemo(() => {
    return `radial-gradient(ellipse at center,
      rgba(${rgbColor}, ${config.opacity * 0.6}) 0%,
      rgba(${rgbColor}, ${config.opacity * 0.3}) 30%,
      rgba(${rgbColor}, ${config.opacity * 0.1}) 50%,
      transparent 70%
    )`;
  }, [rgbColor, config.opacity]);

  // Animation variants
  const variants = {
    inactive: {
      opacity: 0,
      scale: 0.5,
    },
    active: {
      opacity: config.opacity,
      scale: config.scale,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.5,
        ease: "easeOut",
      },
    },
    breathing: {
      scale: [config.scale, config.scale * 1.02, config.scale],
      opacity: [config.opacity, config.opacity * 1.1, config.opacity],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
      aria-hidden="true"
    >
      {/* Main spotlight */}
      <motion.div
        className="absolute"
        style={{
          width: "60%",
          height: "60%",
          left: `${targetPosition.x}%`,
          top: `${targetPosition.y}%`,
          transform: "translate(-50%, -50%)",
          background: gradient,
          filter: `blur(${config.blur}px)`,
        }}
        initial="inactive"
        animate={
          isActive
            ? prefersReducedMotion
              ? "active"
              : "breathing"
            : "inactive"
        }
        variants={variants}
      />

      {/* Secondary ambient glow */}
      <motion.div
        className="absolute"
        style={{
          width: "80%",
          height: "80%",
          left: `${targetPosition.x}%`,
          top: `${targetPosition.y}%`,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(ellipse at center,
            rgba(255, 215, 0, ${config.opacity * 0.1}) 0%,
            transparent 60%
          )`,
          filter: "blur(50px)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isActive ? config.opacity * 0.5 : 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.8 }}
      />

      {/* Outer vignette (always present for theatre feel) */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center,
            transparent 30%,
            rgba(0, 0, 0, 0.3) 70%,
            rgba(0, 0, 0, 0.6) 100%
          )`,
        }}
      />
    </div>
  );
}

export const Spotlight = memo(SpotlightComponent);
Spotlight.displayName = "Spotlight";
