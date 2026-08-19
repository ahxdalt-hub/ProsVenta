"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { getLoadingMessages } from "./loading-messages";

/**
 * Fullscreen loading overlay.
 * Covers the entire viewport so the dashboard can render beneath it.
 * Fades out only when both `ready` is true AND `minDuration` has elapsed.
 * Uses ONLY transform + opacity + blur for GPU-accelerated 60 FPS animation.
 * Never animates layout properties.
 */

const EASE = [0.16, 1, 0.3, 1] as const;
const FADE_OUT_MS = 250;

interface LoadingOverlayProps {
  active: boolean;
  ready: boolean;
  messages?: string[];
  minDuration?: number;
  onFadeComplete?: () => void;
}

export function LoadingOverlay({
  active,
  ready,
  messages,
  minDuration = 450,
  onFadeComplete,
}: LoadingOverlayProps) {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const showTimeRef = useRef(0);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messageList = useMemo(
    () => messages ?? getLoadingMessages("/dashboard"),
    [messages]
  );

  // Show overlay when active becomes true
  useEffect(() => {
    if (active) {
      setVisible(true);
      setExiting(false);
      setProgress(0.05);
      showTimeRef.current = performance.now();
    } else {
      setVisible(false);
      setExiting(false);
    }
  }, [active]);

  // Cycle context-aware loading messages
  useEffect(() => {
    if (!active) return;
    setMessageIndex(0);
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messageList.length);
    }, 600);
    return () => clearInterval(interval);
  }, [active, messageList.length]);

  // Drive the thin progress indicator
  useEffect(() => {
    if (!active) return;

    const tick = (now: number) => {
      const elapsed = now - showTimeRef.current;
      const duration = Math.max(minDuration, 450);
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(0.05 + eased * 0.95);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, minDuration]);

  // Fade out when `ready` is true AND minimum duration has elapsed
  useEffect(() => {
    if (!active || !ready) return;

    const elapsed = performance.now() - showTimeRef.current;
    const remaining = Math.max(minDuration - elapsed, 0);

    fadeTimerRef.current = setTimeout(() => {
      setExiting(true);
      setVisible(false);
    }, remaining);

    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [active, ready, minDuration]);

  if (reduce) return null;

  return (
    <AnimatePresence onExitComplete={onFadeComplete}>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[10000] flex items-center justify-center"
          style={{
            pointerEvents: exiting ? "none" : "auto",
            willChange: "opacity",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: FADE_OUT_MS / 1000, ease: EASE }}
          aria-hidden="true"
          role="status"
          aria-live="polite"
        >
          {/* Soft white background with subtle backdrop blur */}
          <div
            className="absolute inset-0 bg-white/95"
            style={{
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              willChange: "backdrop-filter",
            }}
          />

          {/* Ambient premium glow */}
          <div
            className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 60%)",
            }}
          />

          {/* Content */}
          <div className="relative flex flex-col items-center gap-8">
            {/* Prosventa logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
            >
              <BrandLogo size="lg" iconSize={24} strokeWidth={2.2} shadow />
            </motion.div>

            {/* Context-aware loading message */}
            <div className="flex h-6 items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={messageIndex}
                  className="text-[13px] font-medium tracking-tight text-slate-500"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: EASE }}
                >
                  {messageList[messageIndex]}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Thin premium progress indicator */}
            <div className="h-[2px] w-48 overflow-hidden rounded-full bg-slate-100">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400"
                style={{
                  transformOrigin: "left",
                  boxShadow: "0 0 8px rgba(59, 130, 246, 0.3)",
                  willChange: "transform",
                }}
                animate={{ scaleX: progress }}
                transition={{ duration: 0.1, ease: "linear" }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}