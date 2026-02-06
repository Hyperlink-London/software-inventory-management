"use client";

import * as React from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createClient } from "@/utils/supabase/client";
import { NotificationInbox } from "@/components/NotificationInbox";

export function NotificationBell() {
  const [profileId, setProfileId] = React.useState<string | null>(null);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [open, setOpen] = React.useState(false);

  const refreshCount = React.useCallback(async () => {
    if (!profileId) return;
    const supabase = createClient();
    const { count } = await supabase
      .from("notification_messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_profile_id", profileId)
      .is("read_at", null);
    setUnreadCount(count ?? 0);
  }, [profileId]);

  React.useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("supabase_uid", user.id)
        .is("deleted_at", null)
        .single();

      if (profile?.id) {
        setProfileId(profile.id);
        const { count } = await supabase
          .from("notification_messages")
          .select("id", { count: "exact", head: true })
          .eq("recipient_profile_id", profile.id)
          .is("read_at", null);
        setUnreadCount(count ?? 0);
      }
    }
    init();
  }, []);

  React.useEffect(() => {
    if (!profileId) return;

    const supabase = createClient();
    const channel = supabase
      .channel("notification_messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notification_messages",
          filter: `recipient_profile_id=eq.${profileId}`,
        },
        () => setUnreadCount((c) => c + 1)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) refreshCount();
  };

  if (!profileId) return null;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold">Notifications</span>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/notifications" onClick={() => setOpen(false)}>
              View all
            </Link>
          </Button>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          <NotificationInbox
            profileId={profileId}
            compact
            limit={10}
            onMarkRead={refreshCount}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
