import { createClient } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/db/collaboration";
import { Card, CardHeader } from "@/components/ui/Card";
import { NotificationsList } from "@/components/collaboration/NotificationsList";
import { markAllNotificationsReadAction } from "@/features/collaboration/actions/collaboration";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const notifications = await getNotifications(50);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="dashboard-enter flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">
            {unreadCount > 0
              ? `${unreadCount} unread ${unreadCount === 1 ? "notification" : "notifications"}`
              : "You're all caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <form action={async () => { await markAllNotificationsReadAction(); }}>
            <Button type="submit" variant="secondary" size="sm">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              Mark all as read
            </Button>
          </form>
        )}
      </div>

      {/* Notifications list */}
      <div className="dashboard-enter" style={{ animationDelay: "60ms" }}>
        <Card>
          <CardHeader
            title="All Notifications"
            description={`${notifications.length} total notifications`}
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
            }
          />
          <div className="p-6 pt-4">
            {notifications.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 text-slate-400 mb-3">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                </div>
                <p className="text-sm font-medium text-slate-900">No notifications yet</p>
                <p className="mt-1 text-xs text-slate-400">
                  You&apos;ll be notified when you&apos;re mentioned, assigned, or when team members take action.
                </p>
              </div>
            ) : (
              <NotificationsList notifications={notifications} />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
