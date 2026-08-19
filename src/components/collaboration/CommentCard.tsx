"use client";

import { memo, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { CommentWithAuthor } from "@/lib/db/collaboration";

interface CommentCardProps {
  comment: CommentWithAuthor;
  currentUserId: string;
  onReply: (parentId: string, content: string) => Promise<{ error: string | null }>;
  onDelete?: (commentId: string) => void;
  depth?: number;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string | null | undefined): string {
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-amber-100 text-amber-700",
    "bg-purple-100 text-purple-700",
    "bg-pink-100 text-pink-700",
    "bg-indigo-100 text-indigo-700",
    "bg-teal-100 text-teal-700",
    "bg-orange-100 text-orange-700",
  ];
  const hash = (name ?? "").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

function formatTimestamp(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Render comment content with @mention highlighting
function renderContent(content: string): React.ReactNode {
  const parts = content.split(/(@[A-Za-z0-9_.]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@") && part.length > 1) {
      return (
        <span
          key={i}
          className="font-semibold text-blue-600 bg-blue-50 rounded px-0.5 cursor-pointer hover:bg-blue-100 transition-colors"
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export const CommentCard = memo(function CommentCard({
  comment,
  currentUserId,
  onReply,
  onDelete,
  depth = 0,
}: CommentCardProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthor = comment.author_id === currentUserId;
  const authorName = comment.author?.full_name ?? "Unknown";
  const initials = getInitials(comment.author?.full_name);

  const handleReply = async () => {
    if (!replyContent.trim()) return;
    setIsSubmitting(true);
    setError(null);
    const result = await onReply(comment.id, replyContent);
    if (result.error) {
      setError(result.error);
    } else {
      setReplyContent("");
      setIsReplying(false);
    }
    setIsSubmitting(false);
  };

  return (
    <div className={cn(depth > 0 && "ml-8")}>
      <div className="flex gap-3">
        {/* Avatar */}
        <div className={cn("flex items-center justify-center w-8 h-8 rounded-full shrink-0", getAvatarColor(comment.author?.full_name ?? "?"))}>
          {comment.author?.avatar_url ? (
            <img src={comment.author.avatar_url} alt={authorName} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-xs font-semibold">{initials}</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 py-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-900">{authorName}</span>
              {isAuthor && <span className="text-xs text-slate-400">(You)</span>}
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-400">{formatTimestamp(comment.created_at)}</span>
            </div>
            <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap break-words">
              {renderContent(comment.content)}
            </p>
          </div>

          {/* Actions */}
          <div className="mt-1.5 flex items-center gap-3">
            <button
              onClick={() => setIsReplying(!isReplying)}
              className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors duration-150"
            >
              Reply
            </button>
            {isAuthor && onDelete && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-xs font-medium text-slate-400 hover:text-red-600 transition-colors duration-150"
              >
                Delete
              </button>
            )}
          </div>

          {/* Reply form */}
          {isReplying && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.15 }}
              className="mt-2"
            >
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={`Reply to ${authorName}... Use @ to mention teammates`}
                rows={2}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-all duration-150 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-slate-300"
                aria-label={`Reply to ${authorName}`}
              />
              {error && (
                <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>
              )}
              <div className="mt-1.5 flex items-center justify-end gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsReplying(false);
                    setReplyContent("");
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleReply}
                  loading={isSubmitting}
                  disabled={!replyContent.trim()}
                >
                  Reply
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              onReply={onReply}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
});