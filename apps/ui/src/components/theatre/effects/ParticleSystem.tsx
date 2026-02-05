"use client";

/**
 * ParticleSystem - Ambient and burst particle effects
 *
 * Each Eye has signature particle styles that enhance their
 * stage presence. Particles are used for:
 * - Ambient atmosphere around active Eye
 * - Celebration bursts on milestones
 * - Trail effects during transitions
 */

import { memo, useMemo, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { EyeId } from "@third-eye/constants";

export type ParticleType = "ambient" | "burst" | "trail";

export interface ParticleConfig {
  /** Eye identifier for signature style */
  eye?: string;
  /** Type of particle effect */
  type?: ParticleType;
  /** Effect intensity (0-1) */
  intensity?: number;
  /** Custom color override */
  color?: string;
  /** Whether particles are active */
  isActive?: boolean;
}

export interface ParticleSystemProps extends ParticleConfig {
  /** Additional CSS classes */
  className?: string;
}

/**
 * Eye-specific particle configurations
 */
const EYE_PARTICLE_STYLES: Record<
  string,
  {
    shape: "circle" | "star" | "diamond" | "line" | "ring";
    color: string;
    count: number;
    size: { min: number; max: number };
    speed: { min: number; max: number };
    spread: number;
  }
> = {
  [EyeId.OVERSEER]: {
    shape: "line",
    color: "#d4af37",
    count: 8,
    size: { min: 2, max: 4 },
    speed: { min: 2, max: 4 },
    spread: 360,
  },
  [EyeId.SHARINGAN]: {
    shape: "line",
    color: "#dc143c",
    count: 6,
    size: { min: 1, max: 3 },
    speed: { min: 3, max: 5 },
    spread: 120,
  },
  [EyeId.KYUUBI]: {
    shape: "diamond",
    color: "#ff6b00",
    count: 12,
    size: { min: 3, max: 6 },
    speed: { min: 4, max: 8 },
    spread: 180,
  },
  [EyeId.JOGAN]: {
    shape: "diamond",
    color: "#00ffff",
    count: 8,
    size: { min: 2, max: 4 },
    speed: { min: 2, max: 4 },
    spread: 360,
  },
  [EyeId.RINNEGAN]: {
    shape: "ring",
    color: "#9b59b6",
    count: 5,
    size: { min: 4, max: 8 },
    speed: { min: 1, max: 3 },
    spread: 360,
  },
  [EyeId.MANGEKYO]: {
    shape: "star",
    color: "#ff1493",
    count: 6,
    size: { min: 3, max: 5 },
    speed: { min: 2, max: 4 },
    spread: 60,
  },
  [EyeId.TENSEIGAN]: {
    shape: "circle",
    color: "#4b0082",
    count: 10,
    size: { min: 2, max: 5 },
    speed: { min: 1, max: 3 },
    spread: 360,
  },
  [EyeId.BYAKUGAN]: {
    shape: "line",
    color: "#50c878",
    count: 8,
    size: { min: 2, max: 4 },
    speed: { min: 3, max: 5 },
    spread: 90,
  },
};

const DEFAULT_STYLE = {
  shape: "circle" as const,
  color: "#6b7280",
  count: 6,
  size: { min: 2, max: 4 },
  speed: { min: 2, max: 4 },
  spread: 360,
};

interface Particle {
  id: string;
  x: number;
  y: number;
  size: number;
  angle: number;
  speed: number;
  opacity: number;
  delay: number;
}

/**
 * Generate random particles based on configuration
 */
function generateParticles(
  count: number,
  style: typeof DEFAULT_STYLE,
  type: ParticleType,
): Particle[] {
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const angle =
      (Math.random() * style.spread - style.spread / 2) * (Math.PI / 180);
    const size =
      style.size.min + Math.random() * (style.size.max - style.size.min);
    const speed =
      style.speed.min + Math.random() * (style.speed.max - style.speed.min);

    particles.push({
      id: `particle-${i}-${Date.now()}`,
      x: type === "burst" ? 50 : Math.random() * 100,
      y: type === "burst" ? 50 : Math.random() * 100,
      size,
      angle,
      speed,
      opacity: 0.3 + Math.random() * 0.7,
      delay: type === "ambient" ? Math.random() * 2 : i * 0.05,
    });
  }

  return particles;
}

/**
 * Render particle shape SVG
 */
function ParticleShape({
  shape,
  size,
  color,
}: {
  shape: string;
  size: number;
  color: string;
}) {
  switch (shape) {
    case "star":
      return (
        <svg width={size * 2} height={size * 2} viewBox="0 0 24 24">
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill={color}
          />
        </svg>
      );
    case "diamond":
      return (
        <svg width={size * 2} height={size * 2} viewBox="0 0 24 24">
          <path d="M12 2L22 12L12 22L2 12L12 2Z" fill={color} />
        </svg>
      );
    case "line":
      return (
        <div
          style={{
            width: size * 3,
            height: 2,
            backgroundColor: color,
            borderRadius: 1,
          }}
        />
      );
    case "ring":
      return (
        <div
          style={{
            width: size * 2,
            height: size * 2,
            border: `2px solid ${color}`,
            borderRadius: "50%",
          }}
        />
      );
    default: // circle
      return (
        <div
          style={{
            width: size * 2,
            height: size * 2,
            backgroundColor: color,
            borderRadius: "50%",
          }}
        />
      );
  }
}

function ParticleSystemComponent({
  eye,
  type = "ambient",
  intensity = 0.5,
  color,
  isActive = true,
  className,
}: ParticleSystemProps) {
  const prefersReducedMotion = useReducedMotion();
  const [particles, setParticles] = useState<Particle[]>([]);

  // Get style for eye or use default
  const style = useMemo(() => {
    const baseStyle = eye
      ? (EYE_PARTICLE_STYLES[eye] ?? DEFAULT_STYLE)
      : DEFAULT_STYLE;
    return {
      ...baseStyle,
      color: color ?? baseStyle.color,
      count: Math.round(baseStyle.count * intensity),
    };
  }, [eye, color, intensity]);

  // Generate initial particles
  useEffect(() => {
    if (!isActive || prefersReducedMotion) {
      setParticles([]);
      return;
    }

    setParticles(generateParticles(style.count, style, type));

    // For ambient type, regenerate particles periodically
    if (type === "ambient") {
      const interval = setInterval(() => {
        setParticles(generateParticles(style.count, style, type));
      }, 4000);

      return () => clearInterval(interval);
    }
  }, [isActive, style, type, prefersReducedMotion]);

  // Burst effect - one-time animation
  const triggerBurst = useCallback(() => {
    if (type !== "burst" || prefersReducedMotion) return;
    setParticles(generateParticles(style.count * 2, style, type));
  }, [type, style, prefersReducedMotion]);

  // Don't render if reduced motion or inactive
  if (prefersReducedMotion || !isActive) {
    return null;
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
      aria-hidden="true"
    >
      <AnimatePresence mode="popLayout">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              transform: "translate(-50%, -50%)",
            }}
            initial={{
              opacity: 0,
              scale: 0,
              x: 0,
              y: 0,
            }}
            animate={{
              opacity: [0, particle.opacity, 0],
              scale: [0, 1, 0.5],
              x:
                type === "burst"
                  ? Math.cos(particle.angle) * particle.speed * 50
                  : Math.sin(Date.now() / 1000 + particle.delay) * 10,
              y:
                type === "burst"
                  ? Math.sin(particle.angle) * particle.speed * 50 - 20
                  : type === "ambient"
                    ? -particle.speed * 30
                    : 0,
            }}
            exit={{
              opacity: 0,
              scale: 0,
            }}
            transition={{
              duration: type === "burst" ? 1 : 3,
              delay: particle.delay,
              ease: type === "burst" ? "easeOut" : "linear",
              repeat: type === "ambient" ? Infinity : 0,
            }}
          >
            <ParticleShape
              shape={style.shape}
              size={particle.size}
              color={style.color}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export const ParticleSystem = memo(ParticleSystemComponent);
ParticleSystem.displayName = "ParticleSystem";

/**
 * Hook to trigger burst effect imperatively
 */
export function useParticleBurst() {
  const [burstKey, setBurstKey] = useState(0);

  const triggerBurst = useCallback(() => {
    setBurstKey((k) => k + 1);
  }, []);

  return { burstKey, triggerBurst };
}
