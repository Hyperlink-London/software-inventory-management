"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { notifyTeammates } from "@/lib/notifications";

export type CheckoutInput = {
  item_id: string;
  quantity: number;
  expected_return_date: string;
};

export async function checkoutItem(input: CheckoutInput) {
  const supabase = await createClient(cookies());
  
  // Use RPC function to checkout item - automatically handles user ID and quantity updates
  const { data: checkout, error: checkoutError } = await supabase.rpc("checkout_item", {
    p_item_id: input.item_id,
    p_quantity: input.quantity,
    p_expected_return_date: input.expected_return_date || null,
  });

  if (checkoutError) {
    throw new Error(`Failed to checkout item: ${checkoutError.message}`);
  }

  const result = checkout[0] || checkout;

  // Notify teammates (inbox + push) - fire and forget
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("supabase_uid", user.id)
        .single();
      const actorName = (profile as any)?.full_name || (profile as any)?.username || "A teammate";
      const { data: item } = await supabase
        .from("items")
        .select("item_name")
        .eq("id", input.item_id)
        .single();
      const itemName = (item as any)?.item_name ?? "an item";
      await notifyTeammates({
        type: "team_checkout",
        title: "Team checkout",
        body: `${actorName} checked out "${itemName}"`,
        metadata: { item_id: input.item_id, checkout_id: result?.id ?? null },
      });
    }
  } catch {
    // Non-fatal
  }

  revalidatePath("/");

  return result;
}

