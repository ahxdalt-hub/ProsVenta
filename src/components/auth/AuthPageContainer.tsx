"use client";

import { motion } from "framer-motion";
import { useReducedMotion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

export function AuthPageContainer({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="min-h-screen"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}