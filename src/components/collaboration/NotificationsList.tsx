"use client";

import { useState, useTransition } from "react";
import { NotificationCard } from "./NotificationCard";
import { markNotificationReadAction } from "@/features/collaboration/actions/collaboration";
import type { Notification } from "@/types/database";

interface NotificationsListProps {
  notifications: Notification[];
}

export function NotificationsList({ notifications }: NotificationsListProps) {
  const [items, setItems] = useState(notifications);
  const [isPending, startTransition] = useTransition();

  const handleMarkRead = (id: string) => {
    startTransition(async () => {
      await markNotificationReadAction(id);
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    });
  };

  return (
    <div className="divide-y divide-slate-50">
      {items.map((notification) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          onMarkRead={handleMarkRead}
        />
      ))}
    </div>
  );
}