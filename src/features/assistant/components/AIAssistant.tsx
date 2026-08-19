// ============================================================================
// Prosventa AI Sales Assistant — Main Panel
// Stage 3 — Phase 8: AI-Powered Sales Workspace
// ============================================================================
// Collapsible AI Assistant panel with chat interface, empty state,
// loading states, and smart quick actions. Lazy-loaded and non-blocking.
// ============================================================================

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { AIMessage, AIQuickAction, AIAssistantInput } from "../types";
import { getActiveAssistantProvider } from "../engine";
import {
  SparkleIcon,
  SendIcon,
  MiniCloseIcon,
  MinusIcon,
  MaximizeIcon,
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
// Suggestion Prompts
// ============================================================================

const SUGGESTED_PROMPTS = [
  "Summarize this prospect",
  "What should I do next?",
  "Highlight risks",
  "Which prospect should I contact today?",
  "Show me high priority companies",
  "Which leads are getting cold?",
];

// ============================================================================
// Empty State
// ============================================================================

function EmptyState({ onPrompt }: { onPrompt: (prompt: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600">
        <SparkleIcon className="w-5 h-5" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">AI Sales Assistant</h3>
      <p className="mt-1.5 text-xs text-slate-400 max-w-[220px] leading-relaxed">
        Ask anything about your pipeline...
      </p>

      <div className="mt-5 w-full space-y-1.5">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onPrompt(prompt)}
            className="w-full text-left rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-xs text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Typing Indicator
// ============================================================================

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5">
      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 shrink-0">
        <SparkleIcon className="w-3.5 h-3.5" />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-white border border-slate-100 px-3.5 py-2.5 shadow-sm">
        <div className="flex items-center gap-1">
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-blue-400"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
          />
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-blue-400"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.2, delay: 0.2, ease: "easeInOut" }}
          />
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-blue-400"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.2, delay: 0.4, ease: "easeInOut" }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Message Bubble
// ============================================================================

interface MessageBubbleProps {
  message: AIMessage;
  onAction: (action: AIQuickAction) => void;
}

function MessageBubble({ message, onAction }: MessageBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-navy-900 text-white px-3.5 py-2.5 shadow-sm">
          <p className="text-xs leading-relaxed">{message.content}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-start gap-2.5"
    >
      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 shrink-0">
        <SparkleIcon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="rounded-2xl rounded-tl-sm bg-white border border-slate-100 px-3.5 py-2.5 shadow-sm">
          <MessageContent content={message.content} />
        </div>

        {message.summary && <SummaryCard summary={message.summary} />}
        {message.suggestions && message.suggestions.length > 0 && (
          <RecommendationCard suggestions={message.suggestions} onAction={onAction} />
        )}
        {message.risks && message.risks.length > 0 && (
          <RiskListCard risks={message.risks} />
        )}
        {message.timeline && <TimelineCard timeline={message.timeline} />}

        {message.actions && message.actions.length > 0 && (
          <QuickActionsRow actions={message.actions} onAction={onAction} />
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Main Assistant Panel
// ============================================================================

interface AIAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  input?: AIAssistantInput;
  onAction?: (action: AIQuickAction) => void;
}

export function AIAssistant({ open, onOpenChange, input, onAction }: AIAssistantProps) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [query, setQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDockedTop, setIsDockedTop] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragMoved = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const provider = useMemo(() => getActiveAssistantProvider(), []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (open && !isMinimized) {
      const t = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [open, isMinimized]);

  // Reset unread when opened
  useEffect(() => {
    if (open) setHasUnread(false);
  }, [open]);

  const handleSend = useCallback(
    async (text?: string) => {
      const value = (text ?? query).trim();
      if (!value || isTyping) return;

      // Add user message
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
      setIsTyping(true);

      // Simulate async processing for smooth UX
      await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 400));

      try {
        const response = await provider.respond({
          query: value,
          prospect: input?.prospect,
          prospects: input?.prospects,
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
        const errorMessage: AIMessage = {
          id: `error-${Date.now()}`,
          role: "assistant",
          type: "error",
          content: "I encountered an issue processing that request. Please try again.",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsTyping(false);
      }
    },
    [query, isTyping, input, messages, provider]
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
      if (onAction) {
        onAction(action);
      }
    },
    [onAction]
  );

  const handlePrompt = useCallback(
    (prompt: string) => {
      handleSend(prompt);
    },
    [handleSend]
  );

  const handleClear = useCallback(() => {
    setMessages([]);
  }, []);

  // Pointer down handler - starts drag
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    dragMoved.current = 0;
    setDragOffset({ x: 0, y: 0 });
  }, []);

  // Pointer move handler - tracks drag
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    dragMoved.current = Math.max(dragMoved.current, Math.abs(dx) + Math.abs(dy));
    setDragOffset({ x: dx, y: dy });
  }, [isDragging]);

  // Pointer up handler - snaps to dock
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false);

    // If drag distance is small, treat as click
    if (dragMoved.current < 10) {
      setDragOffset({ x: 0, y: 0 });
      return;
    }

    // Determine which dock based on release Y position
    const viewportHeight = window.innerHeight;
    const threshold = viewportHeight / 2;
    const releaseY = e.clientY;

    // Snap to upper or bottom dock based on release Y
    setIsDockedTop(releaseY < threshold);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  // Floating action button (when closed)
  if (!open) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        onClick={() => onOpenChange(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-navy-900 text-white px-4 py-3 shadow-xl hover:bg-navy-800 hover:shadow-2xl transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none"
        aria-label="Open AI Assistant"
      >
        <SparkleIcon className="w-5 h-5" />
        <span className="text-sm font-semibold">AI Assistant</span>
        {hasUnread && (
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
        )}
      </motion.button>
    );
  }

  // Minimized pill (when open but minimized)
  if (isMinimized) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-navy-900 text-white pl-3 pr-2 py-2 shadow-xl"
      >
        <SparkleIcon className="w-4 h-4" />
        <span className="text-xs font-semibold">AI Assistant</span>
        <button
          onClick={() => setIsMinimized(false)}
          className="p-1.5 rounded-full hover:bg-navy-700 transition-colors"
          aria-label="Maximize AI Assistant"
        >
          <MaximizeIcon className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onOpenChange(false)}
          className="p-1.5 rounded-full hover:bg-navy-700 transition-colors"
          aria-label="Close AI Assistant"
        >
          <MiniCloseIcon className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    );
  }

  // Determine dock position - always right side, top or bottom
  const dockPosition = isDockedTop
    ? "top-6"
    : "bottom-6";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.98 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed ${dockPosition} right-6 z-50 flex flex-col w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-3rem)] rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden ${isDragging ? "cursor-grabbing" : ""}`}
      style={{
        transform: isDragging ? `translate(${dragOffset.x}px, ${dragOffset.y}px)` : undefined,
        transition: isDragging ? "none" : "top 0.3s cubic-bezier(0.16, 1, 0.3, 1), bottom 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      role="dialog"
      aria-label="AI Sales Assistant"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        if (isDragging) {
          handlePointerUp({ clientX: dragStart.current.x, clientY: dragStart.current.y } as React.PointerEvent);
        }
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-navy-900 text-white shrink-0 cursor-grab select-none">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <SparkleIcon className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold leading-tight">AI Sales Assistant</h3>
            <p className="text-[10px] text-blue-200/80 leading-tight">Prosventa Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg hover:bg-navy-700 transition-colors text-xs text-blue-200"
            aria-label="Clear conversation"
            title="Clear conversation"
          >
            Clear
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-lg hover:bg-navy-700 transition-colors"
            aria-label="Minimize AI Assistant"
          >
            <MinusIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-lg hover:bg-navy-700 transition-colors"
            aria-label="Close AI Assistant"
          >
            <MiniCloseIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50/50">
        {messages.length === 0 ? (
          <EmptyState onPrompt={handlePrompt} />
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} onAction={handleAction} />
            ))}
            {isTyping && <TypingIndicator />}
          </>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-slate-100 bg-white p-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your pipeline..."
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all duration-150"
            aria-label="Ask AI Assistant"
          />
          <button
            onClick={() => handleSend()}
            disabled={!query.trim() || isTyping}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-navy-900 text-white hover:bg-navy-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            aria-label="Send message"
          >
            <SendIcon className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-2 text-[10px] text-slate-400 text-center">
          AI-powered insights · Ask about prospects, risks, and next steps
        </p>
      </div>
    </motion.div>
  );
}