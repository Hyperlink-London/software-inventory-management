"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export type NotificationMessage = {
  id: string;
  recipient_profile_id: string;
  sender_profile_id: string | null;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
  sender_name?: string | null;
};

export async function fetchNotifications(params: {
  profileId: string | null;
  limit?: number;
  offset?: number;
}): Promise<{ notifications: NotificationMessage[]; unreadCount: number }> {
  const supabase = await createClient(cookies());

  if (!params.profileId) {
    return { notifications: [], unreadCount: 0 };
  }

  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  const { data: notifications, error } = await supabase
    .from("notification_messages")
    .select(
      `
      id,
      recipient_profile_id,
      sender_profile_id,
      type,
      title,
      body,
      metadata,
      read_at,
      created_at
    `
    )
    .eq("recipient_profile_id", params.profileId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return { notifications: [], unreadCount: 0 };
  }

  const { count: unreadCount } = await supabase
    .from("notification_messages")
    .select("id", { count: "exact", head: true })
    .eq("recipient_profile_id", params.profileId)
    .is("read_at", null);

  // Fetch sender names for display
  const senderIds = [
    ...new Set(
      (notifications || [])
        .map((n) => n.sender_profile_id)
        .filter(Boolean) as string[]
    ),
  ];

  let senderNames: Record<string, string> = {};
  if (senderIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .in("id", senderIds)
      .is("deleted_at", null);

    if (profiles) {
      senderNames = Object.fromEntries(
        profiles.map((p: { id: string; full_name: string | null; username: string }) => [
          p.id,
          p.full_name || p.username || "Someone",
        ])
      );
    }
  }

  const result: NotificationMessage[] = (notifications || []).map((n: any) => ({
    id: n.id,
    recipient_profile_id: n.recipient_profile_id,
    sender_profile_id: n.sender_profile_id,
    type: n.type,
    title: n.title,
    body: n.body,
    metadata: (n.metadata as Record<string, unknown>) || {},
    read_at: n.read_at,
    created_at: n.created_at,
    sender_name: n.sender_profile_id ? senderNames[n.sender_profile_id] : null,
  }));

  return {
    notifications: result,
    unreadCount: unreadCount ?? 0,
  };
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const supabase = await createClient(cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("supabase_uid", user.id)
    .single();

  if (!profile?.id) return;

  await supabase
    .from("notification_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("recipient_profile_id", profile.id);

  revalidatePath("/notifications");
  revalidatePath("/");
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const supabase = await createClient(cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("supabase_uid", user.id)
    .single();

  if (!profile?.id) return;

  await supabase
    .from("notification_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_profile_id", profile.id)
    .is("read_at", null);

  revalidatePath("/notifications");
  revalidatePath("/");
}
