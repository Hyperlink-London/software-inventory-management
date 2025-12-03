"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function checkInItem(checkoutId: string) {
  const supabase = await createClient(cookies());
  
  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to check in items");
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

  // Get checkout record
  const { data: checkout, error: checkoutError } = await supabase
    .from("itemsignouts")
    .select("id, item_id, quantity, returned_date, recipient_id")
    .eq("id", checkoutId)
    .is("deleted_at", null)
    .single();

  if (checkoutError || !checkout) {
    throw new Error("Checkout record not found");
  }

  // Verify the checkout belongs to the current user
  if (checkout.recipient_id !== profile.id) {
    throw new Error("You can only check in your own items");
  }

  // Check if already returned
  if (checkout.returned_date) {
    throw new Error("This item has already been checked in");
  }

  // Get current date
  const returnedDate = new Date().toISOString().split("T")[0];

  // Update checkout record with returned date
  const { error: updateError } = await supabase
    .from("itemsignouts")
    .update({ returned_date: returnedDate })
    .eq("id", checkoutId);

  if (updateError) {
    throw new Error(`Failed to check in item: ${updateError.message}`);
  }

  // Get current item quantity
  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("quantity")
    .eq("id", checkout.item_id)
    .is("deleted_at", null)
    .single();

  if (itemError || !item) {
    throw new Error("Item not found");
  }

  // Update item quantity (add back the checked out quantity)
  const { error: quantityError } = await supabase
    .from("items")
    .update({ quantity: item.quantity + checkout.quantity })
    .eq("id", checkout.item_id);

  if (quantityError) {
    // Rollback checkout update if quantity update fails
    const { error: rollbackError } = await supabase
      .from("itemsignouts")
      .update({ returned_date: null })
      .eq("id", checkoutId);
    
    if (rollbackError) {
      // Log the rollback failure - this is a critical data integrity issue
      console.error(
        `CRITICAL: Failed to rollback checkout after quantity update failure. ` +
        `Checkout ID: ${checkoutId}, Rollback error: ${rollbackError.message}`
      );
      throw new Error(
        `Failed to update item quantity: ${quantityError.message}. ` +
        `Additionally, failed to rollback checkout record (ID: ${checkoutId}). ` +
        `Database may be in inconsistent state. Please contact support.`
      );
    }
    
    throw new Error(`Failed to update item quantity: ${quantityError.message}`);
  }

  // Revalidate the dashboard page
  revalidatePath("/");

  return { success: true, returned_date: returnedDate };
}

