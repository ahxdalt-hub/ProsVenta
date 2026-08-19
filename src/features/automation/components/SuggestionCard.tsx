"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AutomationIcon } from "./icons";
import type { AutomationSuggestion } from "../types";
import { dismissSuggestionAction, createFromSuggestionAction } from "../actions";

interface SuggestionCardProps {
  suggestion: AutomationSuggestion;
}

export function SuggestionCard({ suggestion }: SuggestionCardProps) {
  const router = useRouter();

  async function runAction(action: () => Promise<{ error: string | null }>) {
    const result = await action();
    if (!result.error) router.refresh();
  }

  return (
    <Card hover className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-50 text-violet-600 shrink-0">
            <AutomationIcon name="suggestion" size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 truncate">{suggestion.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{suggestion.confidence}% confidence</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => runAction(() => createFromSuggestionAction(suggestion.id))}
          >
            Create
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => runAction(() => dismissSuggestionAction(suggestion.id))}
            aria-label={`Dismiss ${suggestion.title}`}
          >
            <AutomationIcon name="x" size={14} />
          </Button>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-500">{suggestion.description}</p>
    </Card>
  );
}