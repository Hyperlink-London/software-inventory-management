"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function checkInItem(checkoutId: string) {
  const supabase = await createClient(cookies());
  
  // Use RPC function to check in item - automatically handles user ID verification and quantity updates
  const { data: result, error: checkinError } = await supabase.rpc("checkin_item", {
    p_checkout_id: checkoutId,
  });

  if (checkinError) {
    throw new Error(`Failed to check in item: ${checkinError.message}`);
  }

  // Revalidate the dashboard page
  revalidatePath("/");

  const resultData = result[0] || result;
  return { 
    success: resultData.success, 
    returned_date: resultData.returned_date 
  };
}

