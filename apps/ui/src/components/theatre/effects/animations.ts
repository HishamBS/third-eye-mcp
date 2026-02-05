/**
 * Theatre Animations - Framer Motion Variants
 *
 * Defines all animation variants for the theatrical Monitor experience.
 * These variants create the dramatic stage presence of the Eyes.
 */

import type { Variants, Transition } from "framer-motion";

// ===========================================
// CURTAIN ANIMATIONS
// ===========================================

export const curtainVariants: Variants = {
  closed: {
    clipPath: "inset(0 50% 0 50%)",
    opacity: 1,
  },
  opening: {
    clipPath: "inset(0 0% 0 0%)",
    opacity: 1,
    transition: {
      duration: 1.2,
      ease: [0.4, 0, 0.2, 1], // Custom easing for dramatic effect
    },
  },
  open: {
    clipPath: "inset(0 0% 0 0%)",
    opacity: 1,
  },
  closing: {
    clipPath: "inset(0 50% 0 50%)",
    opacity: 1,
    transition: {
      duration: 1.0,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

// ===========================================
// CHARACTER ENTRANCE ANIMATIONS
// ===========================================

export const entranceFromLeft: Variants = {
  initial: {
    x: -200,
    opacity: 0,
    scale: 0.8,
  },
  animate: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
  exit: {
    x: -200,
    opacity: 0,
    scale: 0.8,
    transition: {
      duration: 0.4,
      ease: "easeIn",
    },
  },
};

export const entranceFromRight: Variants = {
  initial: {
    x: 200,
    opacity: 0,
    scale: 0.8,
  },
  animate: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
  exit: {
    x: 200,
    opacity: 0,
    scale: 0.8,
    transition: {
      duration: 0.4,
      ease: "easeIn",
    },
  },
};

export const entranceFromAbove: Variants = {
  initial: {
    y: -100,
    opacity: 0,
    scale: 1.2,
  },
  animate: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.8,
      ease: "easeOut",
    },
  },
  exit: {
    y: -100,
    opacity: 0,
    scale: 1.2,
    transition: {
      duration: 0.5,
      ease: "easeIn",
    },
  },
};

export const entranceFromBelow: Variants = {
  initial: {
    y: 100,
    opacity: 0,
    scale: 0.8,
  },
  animate: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
  exit: {
    y: 100,
    opacity: 0,
    scale: 0.8,
    transition: {
      duration: 0.4,
      ease: "easeIn",
    },
  },
};

/**
 * Get entrance variants based on direction
 */
export function getEntranceVariants(
  direction: "left" | "right" | "above" | "below",
): Variants {
  switch (direction) {
    case "left":
      return entranceFromLeft;
    case "right":
      return entranceFromRight;
    case "above":
      return entranceFromAbove;
    case "below":
      return entranceFromBelow;
  }
}

// ===========================================
// SPOTLIGHT ANIMATIONS
// ===========================================

export const spotlightVariants: Variants = {
  idle: {
    scale: 1,
    opacity: 0.6,
  },
  active: {
    scale: [1, 1.02, 1],
    opacity: [0.8, 1, 0.8],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
  dramatic: {
    scale: 1.1,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
  dim: {
    scale: 0.9,
    opacity: 0.4,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

// ===========================================
// DIALOGUE ANIMATIONS
// ===========================================

export const dialogueVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.98,
    transition: {
      duration: 0.3,
      ease: "easeIn",
    },
  },
};

export const dialogueBubbleVariants: Variants = {
  idle: {
    boxShadow: "0 0 0 rgba(255, 255, 255, 0)",
  },
  speaking: {
    boxShadow: [
      "0 0 10px rgba(255, 255, 255, 0.1)",
      "0 0 20px rgba(255, 255, 255, 0.2)",
      "0 0 10px rgba(255, 255, 255, 0.1)",
    ],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// ===========================================
// CHARACTER STATE ANIMATIONS
// ===========================================

export const characterStateVariants: Variants = {
  offstage: {
    opacity: 0,
    scale: 0,
  },
  entering: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
  active: {
    opacity: 1,
    scale: 1,
    y: [0, -5, 0],
    transition: {
      y: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  },
  speaking: {
    opacity: 1,
    scale: [1, 1.02, 1],
    transition: {
      scale: {
        duration: 0.8,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  },
  thinking: {
    opacity: 1,
    scale: 1,
    rotate: [0, 2, -2, 0],
    transition: {
      rotate: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  },
  exiting: {
    opacity: 0,
    scale: 0.8,
    transition: {
      duration: 0.4,
      ease: "easeIn",
    },
  },
  celebrating: {
    opacity: 1,
    scale: [1, 1.1, 1],
    rotate: [0, 5, -5, 0],
    transition: {
      duration: 0.5,
      repeat: 2,
      ease: "easeInOut",
    },
  },
};

// ===========================================
// CELEBRATION ANIMATIONS
// ===========================================

export const celebrationVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.8,
  },
  celebrate: {
    opacity: 1,
    scale: [0.8, 1.1, 1],
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    scale: 1.2,
    transition: {
      duration: 0.4,
      ease: "easeIn",
    },
  },
};

export const celebrationTextVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.2,
      duration: 0.4,
    },
  },
};

export const confettiVariants: Variants = {
  initial: {
    opacity: 0,
    y: 0,
    rotate: 0,
  },
  animate: {
    opacity: [0, 1, 1, 0],
    y: [0, -50, -30, 100],
    rotate: [0, 180, 360, 720],
    transition: {
      duration: 2,
      ease: "easeOut",
    },
  },
};

// ===========================================
// ACT TRANSITION ANIMATIONS
// ===========================================

export const actTransitionVariants: Variants = {
  exit: {
    opacity: 0,
    x: -50,
    transition: {
      duration: 0.3,
      ease: "easeIn",
    },
  },
  enter: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.5,
      delay: 0.2,
      ease: "easeOut",
    },
  },
};

export const actBannerVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.9,
    y: 20,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -20,
    transition: {
      duration: 0.4,
      ease: "easeIn",
    },
  },
};

// ===========================================
// MARQUEE ANIMATIONS
// ===========================================

export const marqueeVariants: Variants = {
  initial: {
    opacity: 0,
    y: -20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

export const marqueeLightsVariants: Variants = {
  animate: {
    backgroundPosition: ["0% 0%", "100% 0%"],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

// ===========================================
// WING ANIMATIONS
// ===========================================

export const wingCharacterVariants: Variants = {
  waiting: {
    opacity: 0.4,
    scale: 0.8,
    filter: "grayscale(50%)",
  },
  next: {
    opacity: 0.7,
    scale: 0.9,
    filter: "grayscale(20%)",
    transition: {
      duration: 0.3,
    },
  },
  completed: {
    opacity: 0.6,
    scale: 0.8,
    filter: "grayscale(0%)",
  },
};

// ===========================================
// GLOW ANIMATIONS
// ===========================================

export const glowPulseVariants: Variants = {
  idle: {
    boxShadow: "0 0 0px rgba(255, 255, 255, 0)",
  },
  pulse: {
    boxShadow: [
      "0 0 5px var(--glow-color)",
      "0 0 15px var(--glow-color)",
      "0 0 5px var(--glow-color)",
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// ===========================================
// TIMELINE ANIMATIONS
// ===========================================

export const timelineExpandVariants: Variants = {
  collapsed: {
    height: 80,
    transition: {
      duration: 0.3,
      ease: "easeInOut",
    },
  },
  expanded: {
    height: "auto",
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

export const timelineEventVariants: Variants = {
  initial: {
    opacity: 0,
    x: -10,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.2,
    },
  },
  exit: {
    opacity: 0,
    x: 10,
    transition: {
      duration: 0.15,
    },
  },
};

// ===========================================
// REDUCED MOTION VARIANTS
// ===========================================

/**
 * Create reduced motion variants from full variants
 * Removes animations while keeping final states
 */
export function createReducedMotionVariants(variants: Variants): Variants {
  const reduced: Variants = {};

  for (const key in variants) {
    const variant = variants[key];
    if (typeof variant === "object" && variant !== null) {
      // Keep only opacity for basic state indication
      reduced[key] = {
        opacity: "opacity" in variant ? variant.opacity : 1,
      };
    }
  }

  return reduced;
}

// ===========================================
// SPRING TRANSITIONS
// ===========================================

export const springTransition: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 25,
};

export const gentleSpringTransition: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 30,
};

export const bouncySpringTransition: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 15,
};
