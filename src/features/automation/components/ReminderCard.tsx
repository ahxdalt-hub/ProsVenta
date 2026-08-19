"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AutomationIcon } from "./icons";
import { REMINDER_LABELS } from "../types";
import type { Reminder } from "../types";
import { completeReminderAction, dismissReminderAction } from "../actions";

interface ReminderCardProps {
  reminder: Reminder;
}

export function ReminderCard({ reminder }: ReminderCardProps) {
  const router = useRouter();
  const label = REMINDER_LABELS[reminder.reminder_type] ?? "Reminder";
  const scheduled = new Date(reminder.scheduled_for);
  const isOverdue = scheduled.getTime() < Date.now() && !reminder.is_completed;

  async function runAction(action: () => Promise<{ error: string | null }>) {
    const result = await action();
    if (!result.error) router.refresh();
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-3 hover:border-slate-300 transition-colors duration-150">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${
            isOverdue ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-600"
          }`}
        >
          <AutomationIcon name="clock" size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">{reminder.title}</p>
          <p className="text-xs text-slate-400 truncate">
            {label} · {scheduled.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isOverdue && <Badge variant="danger">Overdue</Badge>}
        {!reminder.is_completed && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => runAction(() => completeReminderAction(reminder.id))}
          >
            Done
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => runAction(() => dismissReminderAction(reminder.id))}
          aria-label={`Dismiss ${reminder.title}`}
        >
          <AutomationIcon name="x" size={14} />
        </Button>
      </div>
    </div>
  );
}