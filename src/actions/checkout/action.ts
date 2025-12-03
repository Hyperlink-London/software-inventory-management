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
  
  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to checkout items");
  }

  // Get user profile ID
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("supabase_uid", user.id)
    .is("deleted_at", null)
    .single();

  if (profileError || !profile) {
    throw new Error("User profile not found");
  }

  // Verify item exists and has enough quantity
  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("id, quantity")
    .eq("id", input.item_id)
    .is("deleted_at", null)
    .single();

  if (itemError || !item) {
    throw new Error("Item not found");
  }

  if (item.quantity < input.quantity) {
    throw new Error(`Insufficient quantity. Only ${item.quantity} available.`);
  }

  // Create checkout record
  const { data: checkout, error: checkoutError } = await supabase
    .from("itemsignouts")
    .insert({
      item_id: input.item_id,
      recipient_id: profile.id,
      quantity: input.quantity,
      sign_out_date: new Date().toISOString().split("T")[0],
      expected_return_date: input.expected_return_date,
    })
    .select()
    .single();

  if (checkoutError) {
    throw new Error(`Failed to checkout item: ${checkoutError.message}`);
  }

  // Update item quantity
  const { error: updateError } = await supabase
    .from("items")
    .update({ quantity: item.quantity - input.quantity })
    .eq("id", input.item_id);

  if (updateError) {
    // Rollback checkout if quantity update fails
    const { error: rollbackError } = await supabase
      .from("itemsignouts")
      .delete()
      .eq("id", checkout.id);
    
    if (rollbackError) {
      // Log the rollback failure - this is a critical data integrity issue
      console.error(
        `CRITICAL: Failed to rollback checkout after quantity update failure. ` +
        `Checkout ID: ${checkout.id}, Rollback error: ${rollbackError.message}`
      );
      throw new Error(
        `Failed to update item quantity: ${updateError.message}. ` +
        `Additionally, failed to rollback checkout record (ID: ${checkout.id}). ` +
        `Database may be in inconsistent state. Please contact support.`
      );
    }
    
    throw new Error(`Failed to update item quantity: ${updateError.message}`);
  }

  // Revalidate the dashboard page
  revalidatePath("/");

  return checkout;
}

