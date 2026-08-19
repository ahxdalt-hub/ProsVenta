"use client";

import { motion } from "framer-motion";

interface AuthCardProps {
  children: React.ReactNode;
}

export default function AuthCard({ children }: AuthCardProps) {
  return (
    <div className="w-full max-w-[440px] mx-auto">
      <motion.div
        className="rounded-2xl border border-slate-200 bg-white/90 backdrop-blur-xl shadow-xl shadow-slate-200/50 p-8 sm:p-10"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}