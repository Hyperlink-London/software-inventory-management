"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

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

  // Revalidate the dashboard page
  revalidatePath("/");

  return checkout[0] || checkout;
}

