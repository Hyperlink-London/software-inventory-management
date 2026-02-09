/**
 * Notification service - synced between web and app.
 * Inserts into notification_messages (inbox) and sends Expo push to teammates.
 */

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export type NotificationType = "team_checkout" | "team_item_added" | "overdue" | "due_tomorrow";

export async function notifyTeammates(options: {
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = await createClient(cookies());

  // Get current user's profile ID
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return;

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("supabase_uid", user.id)
    .is("deleted_at", null)
    .single();

  const senderProfileId = myProfile?.id;
  if (!senderProfileId) return;

  // Get teammate profile IDs
  const { data: teammateIds, error: rpcError } = await supabase.rpc(
    "get_teammate_profile_ids"
  );

  if (rpcError || !teammateIds || teammateIds.length === 0) return;

  const ids = Array.isArray(teammateIds) ? teammateIds : [teammateIds];

  // Insert notification for each teammate
  const rows = ids.map((recipientId: string) => ({
    recipient_profile_id: recipientId,
    sender_profile_id: senderProfileId,
    type: options.type,
    title: options.title,
    body: options.body,
    metadata: options.metadata || {},
  }));

  await supabase.from("notification_messages").insert(rows);

  // Send push to teammates' devices
  const { data: tokens } = await supabase.rpc("get_teammate_push_tokens");
  const tokenList = (Array.isArray(tokens) ? tokens : [tokens]).filter(
    (t): t is string => typeof t === "string" && t.length > 0
  );

  if (tokenList.length > 0) {
    const messages = tokenList.map((to) => ({
      to,
      title: options.title,
      body: options.body,
      ...(options.metadata && { data: options.metadata }),
    }));

    try {
      await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messages),
      });
    } catch {
      // Non-fatal; notifications are in DB
    }
  }
}

/**
 * Ensure overdue and due-tomorrow notifications exist for the user's checkouts.
 * Called on page load (checkouts, dashboard). Deduplicates by checkout_id + type.
 */
export async function ensureOverdueNotifications(profileId: string | null): Promise<void> {
  if (!profileId) return;

  const supabase = await createClient(cookies());

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const { data: checkouts } = await supabase
    .from("itemsignouts")
    .select(`
      id,
      item_id,
      expected_return_date,
      items!inner(item_name, deleted_at)
    `)
    .eq("recipient_id", profileId)
    .is("returned_date", null)
    .not("expected_return_date", "is", null)
    .is("deleted_at", null);

  const validCheckouts = (checkouts || []).filter((c: any) => {
    const item = Array.isArray(c.items) ? c.items[0] : c.items;
    return item && !item.deleted_at;
  });

  const toInsert: { type: "overdue" | "due_tomorrow"; checkout: any }[] = [];

  for (const c of validCheckouts) {
    const expected = c.expected_return_date;
    const item = Array.isArray(c.items) ? c.items[0] : c.items;
    const itemName = item?.item_name ?? "Item";

    if (expected < todayStr) {
      const { data: existing } = await supabase
        .from("notification_messages")
        .select("id")
        .eq("recipient_profile_id", profileId)
        .eq("type", "overdue")
        .eq("metadata->>checkout_id", c.id)
        .limit(1);

      if (!existing || existing.length === 0) {
        toInsert.push({ type: "overdue", checkout: { ...c, item_name: itemName } });
      }
    } else if (expected === tomorrowStr) {
      const { data: existing } = await supabase
        .from("notification_messages")
        .select("id")
        .eq("recipient_profile_id", profileId)
        .eq("type", "due_tomorrow")
        .eq("metadata->>checkout_id", c.id)
        .limit(1);

      if (!existing || existing.length === 0) {
        toInsert.push({ type: "due_tomorrow", checkout: { ...c, item_name: itemName } });
      }
    }
  }

  if (toInsert.length === 0) return;

  const rows = toInsert.map(({ type, checkout }) => ({
    recipient_profile_id: profileId,
    sender_profile_id: null,
    type,
    title: type === "overdue" ? "Overdue" : "Due tomorrow",
    body:
      type === "overdue"
        ? `"${checkout.item_name}" was due back and is now overdue.`
        : `"${checkout.item_name}" is due back tomorrow.`,
    metadata: { checkout_id: checkout.id, item_id: checkout.item_id },
  }));

  await supabase.from("notification_messages").insert(rows);
}
