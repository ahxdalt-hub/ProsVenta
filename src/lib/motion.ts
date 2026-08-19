import type { Transition, Variants } from "framer-motion";

/**
 * Global motion configuration
 * Consistent easing curves and durations across the entire application.
 * Maximum duration: 250ms — everything must maintain 60 FPS.
 * Use only transform + opacity for GPU-accelerated animations.
 */

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;
export const EASE_SPRING = [0.34, 1.56, 0.64, 1] as const;

export const DURATION = {
  instant: 0,
  fast: 0.12,
  base: 0.18,
  slow: 0.25,
} as const;

export const transitions = {
  instant: { duration: DURATION.instant, ease: EASE_OUT },
  fast: { duration: DURATION.fast, ease: EASE_OUT },
  base: { duration: DURATION.base, ease: EASE_OUT },
  slow: { duration: DURATION.slow, ease: EASE_OUT },
  spring: { duration: DURATION.base, ease: EASE_SPRING },
} satisfies Record<string, Transition>;

/**
 * Reusable animation variants
 * All animations use only transform + opacity for 60 FPS performance.
 */

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: transitions.base,
  },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.slow,
  },
};

export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.base,
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitions.spring,
  },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitions.slow,
  },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitions.slow,
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.03,
    },
  },
};

export const staggerContainerFast: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.015,
      delayChildren: 0.02,
    },
  },
};

export const staggerContainerSlow: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.base,
  },
};

export const listItemFast: Variants = {
  hidden: { opacity: 0, y: 3 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.fast,
  },
};

/**
 * Scroll reveal variants
 */

export const scrollReveal: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.slow,
  },
};

export const scrollRevealLeft: Variants = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitions.slow,
  },
};

export const scrollRevealRight: Variants = {
  hidden: { opacity: 0, x: 12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitions.slow,
  },
};

/**
 * Modal / overlay variants
 */

export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitions.fast },
  exit: { opacity: 0, transition: transitions.fast },
};

export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: 6 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: transitions.spring,
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 6,
    transition: transitions.fast,
  },
};

/**
 * Reduced motion override
 * Respects the user's system preference for reduced motion.
 */
export const reducedMotion = {
  transition: { duration: 0, ease: "linear" as const },
};