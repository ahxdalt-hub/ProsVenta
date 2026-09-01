// ============================================================================
// Prosventa AI — Main Surface
// ============================================================================
// Premium assistant workspace for the Prosventa dashboard.
//
// Design principles:
//   • Native Prosventa product feature — brand logo, typography, colors,
//     radii, shadows and motion curves come straight from the design system.
//   • Clean floating surface — no dark backdrop, no blur overlays. The
//     surrounding dashboard stays stable and interactive.
//   • Header → independently scrollable conversation → stable input.
//   • Honest intelligence — every response is computed by the assistant
//     engine over the signed-in user's real, RLS-scoped workspace data.
//     Nothing is faked; failures render a calm retry state.
//
// Responsive: docked panel on laptop/desktop, full-height surface on mobile.
// Lazy-loaded by DashboardShell so it never blocks the main UI.
// ============================================================================

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { BrandIcon } from "@/components/branding/BrandIcon";
import { cn } from "@/lib/utils";
import { listItem, staggerContainer, transitions } from "@/lib/motion";
import type { AIMessage, AIAssistantInput, AIQuickAction } from "../types";
import { getActiveAssistantProvider } from "../engine";
import { getAssistantWorkspaceContext } from "../actions";
import type { AssistantProspectSnapshot } from "../actions";
import {
  SparkleIcon,
  TargetIcon,
  TrendIcon,
  ClockIcon,
  WarningIcon,
  MiniCloseIcon,
  MinusIcon,
  MaximizeIcon,
  ArrowUpIcon,
  RotateIcon,
} from "./icons";
import {
  MessageContent,
  SummaryCard,
  RecommendationCard,
  RiskListCard,
  TimelineCard,
  QuickActionsRow,
} from "./cards";

// ============================================================================
// Suggested prompts — every prompt maps to a real intent the assistant
// engine supports today. Nothing here pretends to do more than it does.
// ============================================================================

const SUGGESTED_PROMPTS = [
  { prompt: "Which prospect should I contact today?", Icon: TargetIcon },
  { prompt: "Show my highest-priority prospects", Icon: TrendIcon },
  { prompt: "What should I do next?", Icon: SparkleIcon },
  { prompt: "Which leads are going cold?", Icon: ClockIcon },
  { prompt: "Highlight pipeline risks", Icon: WarningIcon },
] as const;

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

// ============================================================================
// Empty State — intentional onboarding
// ============================================================================

function EmptyState({ onPrompt }: { onPrompt: (prompt: string) => void }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-10 text-center">
      <BrandLogo size="lg" iconSize={24} strokeWidth={2.2} shadow />

      <h3 className="mt-5 text-[17px] font-semibold tracking-tight text-slate-900">
        Prosventa AI
      </h3>
      <p className="mt-1 text-sm text-slate-500">Your intelligent sales assistant.</p>
      <p className="mt-1.5 max-w-[270px] text-xs leading-relaxed text-slate-400">
        Ask about your prospects, pipeline health, follow-ups, or what to focus on next.
      </p>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="mt-7 w-full max-w-[310px] space-y-2"
      >
        {SUGGESTED_PROMPTS.map(({ prompt, Icon }) => (
          <motion.div key={prompt} variants={listItem}>
            <button
              onClick={() => onPrompt(prompt)}
              className="card-hover group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="flex-1 text-[13px] font-medium text-slate-600 transition-colors group-hover:text-slate-900">
                {prompt}
              </span>
              <span
                aria-hidden
                className="text-sm text-slate-300 transition-colors group-hover:text-blue-500"
              >
                →
              </span>
            </button>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

// ============================================================================
// Thinking Indicator — subtle activity, no generic spinner
// ============================================================================

function ThinkingIndicator({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : transitions.base}
      className="flex items-start gap-2.5"
    >
      <BrandLogo size="sm" iconSize={13} strokeWidth={2.2} className="shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-700">Prosventa AI</p>
        <div className="mt-1 inline-flex items-center gap-2 rounded-xl rounded-tl-sm border border-slate-200/80 bg-white px-3.5 py-2.5 shadow-xs">
          <span className="flex items-center gap-1" aria-hidden>
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-blue-500"
                animate={reduced ? undefined : { opacity: [0.25, 1, 0.25], scale: [0.85, 1, 0.85] }}
                transition={
                  reduced
                    ? undefined
                    : { repeat: Infinity, duration: 1.1, delay: i * 0.18, ease: "easeInOut" }
                }
                style={reduced ? { opacity: 0.6 } : undefined}
              />
            ))}
          </span>
          <span className="text-xs text-slate-400">Thinking…</span>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Messages
// ============================================================================

interface UserBubbleProps {
  message: AIMessage;
  reduced: boolean;
}

function UserBubble({ message, reduced }: UserBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : transitions.slow}
      className="flex justify-end"
    >
      <div className="max-w-[85%] rounded-xl rounded-br-sm bg-navy-900 px-3.5 py-2.5 shadow-xs">
        <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-white">
          {message.content}
        </p>
      </div>
    </motion.div>
  );
}

interface AssistantMessageProps {
  message: AIMessage;
  reduced: boolean;
  onAction: (action: AIQuickAction) => void;
  onRetry?: () => void;
}

function AssistantMessage({ message, reduced, onAction, onRetry }: AssistantMessageProps) {
  const time = formatTime(message.timestamp);
  const isError = message.type === "error";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : transitions.slow}
      className="flex items-start gap-2.5"
    >
      <BrandLogo size="sm" iconSize={13} strokeWidth={2.2} className="shrink-0" />

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-baseline gap-2">
          <p className="text-xs font-semibold text-slate-700">Prosventa AI</p>
          {time && <p className="text-[10px] text-slate-400">{time}</p>}
        </div>

        {isError ? (
          <div className="rounded-xl rounded-tl-sm border border-red-100 bg-red-50/60 px-3.5 py-3">
            <div className="flex items-start gap-2.5">
              <WarningIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-relaxed text-slate-700">{message.content}</p>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="btn-press mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:border-red-300 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <RotateIcon className="h-3 w-3" />
                    Try again
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {message.content && (
              <div className="rounded-xl rounded-tl-sm border border-slate-200/80 bg-white px-3.5 py-3 shadow-xs">
                <MessageContent content={message.content} />
              </div>
            )}

            {message.summary && <SummaryCard summary={message.summary} />}
            {message.suggestions && message.suggestions.length > 0 && (
              <RecommendationCard suggestions={message.suggestions} onAction={onAction} />
            )}
            {message.risks && message.risks.length > 0 && <RiskListCard risks={message.risks} />}
            {message.timeline && <TimelineCard timeline={message.timeline} />}

            {message.actions && message.actions.length > 0 && (
              <QuickActionsRow actions={message.actions} onAction={onAction} />
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Main Assistant Surface
// ============================================================================

interface AIAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional caller-provided context (e.g. a selected prospect). */
  input?: AIAssistantInput;
  onAction?: (action: AIQuickAction) => void;
}

export function AIAssistant({ open, onOpenChange, input, onAction }: AIAssistantProps) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [query, setQuery] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [lastFailedQuery, setLastFailedQuery] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // In-flight workspace snapshot — awaited by the send path so answers are
  // always grounded in real data, even if the user types immediately.
  const contextPromiseRef = useRef<Promise<AssistantProspectSnapshot> | null>(null);
  const workspaceRef = useRef<AssistantProspectSnapshot | undefined>(undefined);

  const provider = useMemo(() => getActiveAssistantProvider(), []);
  const reduce = useReducedMotion();

  // ------------------------------------------------------------------
  // Workspace context (real, RLS-scoped prospect snapshot)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!open || isMinimized) return;
    const request = getAssistantWorkspaceContext()
      .then((snapshot) => {
        workspaceRef.current = snapshot;
        return snapshot;
      })
      .catch(() => {
        // Non-fatal: the engine responds gracefully without a snapshot.
        workspaceRef.current = undefined;
        return [] as AssistantProspectSnapshot;
      });
    contextPromiseRef.current = request;
  }, [open, isMinimized]);

  // ------------------------------------------------------------------
  // Auto-scroll conversation (never scrolls the dashboard)
  // ------------------------------------------------------------------
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [messages, isThinking, reduce]);

  // ------------------------------------------------------------------
  // Focus input shortly after the entrance animation settles
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!open || isMinimized) return;
    const t = setTimeout(() => inputRef.current?.focus(), reduce ? 50 : 280);
    return () => clearTimeout(t);
  }, [open, isMinimized, reduce]);

  // ------------------------------------------------------------------
  // Escape closes the assistant
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!open || isMinimized) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, isMinimized, onOpenChange]);

  // ------------------------------------------------------------------
  // Send flow
  // ------------------------------------------------------------------
  const handleSend = useCallback(
    async (text?: string) => {
      const value = (text ?? query).trim();
      if (!value || isThinking) return;

      const userMessage: AIMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        type: "text",
        content: value,
        timestamp: new Date().toISOString(),
        prospectId: input?.prospect?.id ?? null,
      };
      setMessages((prev) => [...prev, userMessage]);
      setQuery("");
      setLastFailedQuery(null);
      setIsThinking(true);

      try {
        // Make sure the workspace snapshot has landed before answering.
        let prospects = workspaceRef.current;
        if (!prospects && contextPromiseRef.current) {
          prospects = await contextPromiseRef.current;
        }

        // Brief, consistent thinking beat — responses never flash instantly,
        // but the wait stays well under a second.
        await new Promise((resolve) => setTimeout(resolve, reduce ? 80 : 480 + Math.random() * 220));

        const response = await provider.respond({
          query: value,
          prospect: input?.prospect ?? null,
          prospects: input?.prospects ?? prospects,
          notes: input?.notes,
          context: {
            messages,
            lastProspectId: input?.prospect?.id ?? null,
            lastProspectName: input?.prospect?.companyName ?? null,
            lastIntent: null,
            lastQuery: value,
          },
        });
        setMessages((prev) => [...prev, response.message]);
      } catch {
        setLastFailedQuery(value);
        const errorMessage: AIMessage = {
          id: `error-${Date.now()}`,
          role: "assistant",
          type: "error",
          content: "Something went wrong while processing that request.",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsThinking(false);
      }
    },
    [query, isThinking, input, messages, provider, reduce]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleAction = useCallback(
    (action: AIQuickAction) => {
      onAction?.(action);
    },
    [onAction]
  );

  const handlePrompt = useCallback((prompt: string) => handleSend(prompt), [handleSend]);

  const handleRetry = useCallback(() => {
    if (lastFailedQuery) handleSend(lastFailedQuery);
  }, [lastFailedQuery, handleSend]);

  const handleClear = useCallback(() => {
    setMessages([]);
    setLastFailedQuery(null);
  }, []);

  const canSend = query.trim().length > 0 && !isThinking;

  // ------------------------------------------------------------------
  // Surface switcher — one shared AnimatePresence so open/close and
  // minimize/restore all get smooth enter AND exit transitions.
  // ------------------------------------------------------------------
  if (!open) {
    return (
      <AnimatePresence mode="wait">
        <motion.button
          key="assistant-launcher"
          initial={{ opacity: 0, scale: 0.92, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={reduce ? { duration: 0 } : transitions.spring}
          onClick={() => onOpenChange(true)}
          className="btn-press fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-full bg-navy-900 py-2 pl-2 pr-4 text-white shadow-xl transition-colors hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:bottom-6 sm:right-6"
          aria-label="Open Prosventa AI assistant"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
            <BrandIcon size={15} strokeWidth={2.2} />
          </span>
          <span className="text-sm font-semibold tracking-tight">Prosventa AI</span>
        </motion.button>
      </AnimatePresence>
    );
  }

  // ------------------------------------------------------------------
  // Minimized pill
  // ------------------------------------------------------------------
  if (isMinimized) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="assistant-pill"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={reduce ? { duration: 0 } : transitions.slow}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white py-1.5 pl-3 pr-1.5 shadow-xl sm:bottom-6 sm:right-6"
        >
          <BrandLogo size="sm" iconSize={13} strokeWidth={2.2} />
          <span className="mr-1 text-xs font-semibold tracking-tight text-slate-800">
            Prosventa AI
          </span>
          <button
            onClick={() => setIsMinimized(false)}
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Restore Prosventa AI assistant"
          >
            <MaximizeIcon className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Close Prosventa AI assistant"
          >
            <MiniCloseIcon className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ------------------------------------------------------------------
  // Assistant surface — fullscreen on mobile, docked panel on sm+
  // ------------------------------------------------------------------
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="assistant-panel"
        initial={{ opacity: 0, y: 14, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.985 }}
        transition={reduce ? { duration: 0 } : transitions.slow}
        className={cn(
          "fixed z-50 flex flex-col overflow-hidden bg-white shadow-2xl",
          // Mobile — full-width / full-height experience
          "inset-0 rounded-none",
          // Laptop / desktop — comfortable docked panel
          "sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(640px,calc(100dvh_-_3rem))] sm:w-[420px] sm:rounded-2xl sm:border sm:border-slate-200"
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        role="dialog"
        aria-label="Prosventa AI assistant"
        aria-busy={isThinking}
      >
        {/* ------------------------------------------------ Header */}
        <header className="shrink-0 border-b border-slate-100 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" strokeWidth={2.2} />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold leading-tight tracking-tight text-slate-900">
                Prosventa AI
              </h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] leading-tight text-slate-400">
                <span
                  aria-hidden
                  className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                />
                Sales intelligence assistant
              </p>
            </div>
            <div className="flex items-center gap-0.5">
              {messages.length > 0 && (
                <button
                  onClick={handleClear}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  aria-label="Start a new conversation"
                  title="New conversation"
                >
                  <RotateIcon className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setIsMinimized(true)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="Minimize Prosventa AI assistant"
              >
                <MinusIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="Close Prosventa AI assistant"
              >
                <MiniCloseIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* ---------------------------------------- Scrollable conversation */}
        <div
          ref={scrollRef}
          className="ps-scroll flex-1 space-y-5 overflow-y-auto bg-slate-50/60 px-4 py-5"
          aria-live="polite"
        >
          {messages.length === 0 ? (
            <EmptyState onPrompt={handlePrompt} />
          ) : (
            <>
              {messages.map((message) =>
                message.role === "user" ? (
                  <UserBubble key={message.id} message={message} reduced={!!reduce} />
                ) : (
                  <AssistantMessage
                    key={message.id}
                    message={message}
                    reduced={!!reduce}
                    onAction={handleAction}
                    onRetry={message.type === "error" && lastFailedQuery ? handleRetry : undefined}
                  />
                )
              )}
              {isThinking && <ThinkingIndicator reduced={!!reduce} />}
            </>
          )}
        </div>

        {/* --------------------------------------------------- Input area */}
        <div className="shrink-0 border-t border-slate-100 bg-white px-3 pb-3 pt-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Prosventa AI…"
              disabled={isThinking}
              className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-[13px] text-slate-900 placeholder:text-slate-400 transition-all duration-150 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
              aria-label="Ask Prosventa AI"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!canSend}
              className="btn-press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-white transition-colors hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send message"
            >
              <ArrowUpIcon className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-2 text-center text-[10px] text-slate-400">
            Answers are generated from your Prosventa workspace.
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}