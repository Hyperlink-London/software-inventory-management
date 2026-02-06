/**
 * Notification service - synced between web and app.
 * Inserts into notification_messages (inbox) and sends Expo push to teammates.
 */

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export type NotificationType = "team_checkout" | "team_item_added";

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
