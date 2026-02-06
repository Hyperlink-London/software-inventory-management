"use client";

import * as React from "react";
import Link from "next/link";
import { Package, ShoppingCart, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type NotificationMessage,
} from "@/actions/notifications/action";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, React.ReactNode> = {
  team_checkout: <ShoppingCart className="h-4 w-4" />,
  team_item_added: <Package className="h-4 w-4" />,
};

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

type NotificationInboxProps = {
  profileId: string | null;
  compact?: boolean;
  limit?: number;
  onMarkRead?: () => void;
};

export function NotificationInbox({
  profileId,
  compact = false,
  limit = 100,
  onMarkRead: onMarkReadCallback,
}: NotificationInboxProps) {
  const [notifications, setNotifications] = React.useState<NotificationMessage[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [markingAll, setMarkingAll] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!profileId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { notifications: list, unreadCount: count } = await fetchNotifications({
      profileId,
      limit,
    });
    setNotifications(list);
    setUnreadCount(count);
    setLoading(false);
  }, [profileId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleMarkRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    onMarkReadCallback?.();
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    await markAllNotificationsAsRead();
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    );
    setUnreadCount(0);
    setMarkingAll(false);
  };

  if (!profileId) {
    return compact ? (
      <div className="py-6 text-center text-muted-foreground text-sm">Sign in to view notifications.</div>
    ) : (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Sign in to view notifications.
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return compact ? (
      <div className="py-6 text-center text-muted-foreground text-sm">Loading...</div>
    ) : (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Loading notifications...
        </CardContent>
      </Card>
    );
  }

  const content = (
    notifications.length === 0 ? (
      <div
        className={
          compact
            ? "py-6 text-center text-muted-foreground text-sm"
            : "py-12 text-center text-muted-foreground flex flex-col items-center gap-2"
        }
      >
        {!compact && <Bell className="h-12 w-12 opacity-50" />}
        <p>No notifications yet</p>
        {!compact && (
          <p className="text-sm">
            When teammates check out items or add new ones, you&apos;ll see them here.
          </p>
        )}
      </div>
    ) : (
      <div className="divide-y divide-border">
        {notifications.map((n) => (
          <NotificationRow
            key={n.id}
            notification={n}
            onMarkRead={() => handleMarkRead(n.id)}
            compact={compact}
          />
        ))}
      </div>
    )
  );

  if (compact) {
    return <div className="p-2">{content}</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Inbox</CardTitle>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={markingAll}
          >
            Mark all as read
          </Button>
        )}
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}

function NotificationRow({
  notification,
  onMarkRead,
  compact = false,
}: {
  notification: NotificationMessage;
  onMarkRead: () => void;
  compact?: boolean;
}) {
  const isUnread = !notification.read_at;
  const icon = typeIcons[notification.type] ?? <Bell className="h-4 w-4" />;
  const itemId = (notification.metadata?.item_id as string) | undefined;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg transition-colors",
        compact ? "py-2 px-1" : "py-4 px-2 -mx-2",
        isUnread && "bg-muted/50"
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={cn("text-sm font-medium", isUnread && "font-semibold")}>
              {notification.title}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">{notification.body}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatTimeAgo(notification.created_at)}
            </p>
          </div>
          {isUnread && (
            <Button variant="ghost" size="sm" onClick={onMarkRead} className="shrink-0">
              Mark read
            </Button>
          )}
        </div>
        {itemId && (
          <Link
            href={`/items/${itemId}`}
            className="inline-block mt-2 text-xs text-primary hover:underline"
          >
            View item →
          </Link>
        )}
      </div>
    </div>
  );
}
