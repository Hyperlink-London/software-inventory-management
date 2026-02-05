"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

// Placeholder types – adjust to match your data model
export type ItemId = string;
export type ItemInput = {
  name: string;
  description?: string;
  quantity?: number;
};

export async function getItems() {
  // Wire to Supabase when schema is ready
  // const supabase = createClient(cookies());
  // const { data, error } = await supabase.from("items").select("*");
  // if (error) throw error;
  // return data;
  return [] as any[];
}

export async function getItemById(id: ItemId) {
  // const supabase = createClient(cookies());
  // const { data, error } = await supabase.from("items").select("*").eq("id", id).single();
  // if (error) throw error;
  // return data;
  return { id } as any;
}

export type CreateItemInput = {
  name: string;
  quantity: number;
  notes?: string | null;
  image_url?: string | null;
};

export async function createItem(input: CreateItemInput) {
  const supabase = await createClient(cookies());
  
  // Use RPC function to create item - automatically handles user ID
  const { data: itemData, error: itemError } = await supabase.rpc("create_item", {
    p_item_name: input.name,
    p_quantity: input.quantity,
    p_notes: input.notes || null,
    p_image_url: input.image_url || null,
  });

  if (itemError) {
    throw new Error(`Failed to create item: ${itemError.message || itemError.details || "Unknown error"}`);
  }

  if (!itemData || (Array.isArray(itemData) && itemData.length === 0)) {
    throw new Error("Failed to create item: No data returned");
  }

  // RPC returns array, get first item
  const item = Array.isArray(itemData) ? itemData[0] : itemData;
  
  if (!item || !item.id) {
    throw new Error("Failed to create item: Invalid response");
  }

  return item;
}

export async function updateItem(id: ItemId, input: Partial<ItemInput>) {
  // const supabase = createClient(cookies());
  // const { data, error } = await supabase.from("items").update(input).eq("id", id).select("*").single();
  // if (error) throw error;
  // return data;
  return { id, ...input } as any;
}

export async function deleteItem(id: ItemId) {
  const supabase = await createClient(cookies());

  try {
    // Get the item to retrieve its image URL
    const { data: itemData, error: fetchError } = await supabase
      .from("items")
      .select("image_URL")
      .eq("id", id)
      .single();

    if (fetchError) {
      throw new Error("Item not found");
    }

    // Delete image from storage if it exists using RPC (same as update flow)
    if (itemData?.image_URL) {
      try {
        const { data: deleteResult, error: deleteError } = await supabase.rpc("delete_image_from_storage", {
          p_image_url: itemData.image_URL
        });
        
        // Continue with item deletion even if image deletion fails
        void deleteError;
        void deleteResult;
      } catch {
        // Continue with item deletion even if image deletion fails
      }
    }

    // Soft delete the item and clear image URL
    const { error: deleteError } = await supabase
      .from("items")
      .update({ deleted_at: new Date().toISOString(), image_URL: null })
      .eq("id", id);

    if (deleteError) {
      throw new Error(`Failed to delete item: ${deleteError.message}`);
    }

    // Soft delete related itemtags
    const { error: tagDeleteError } = await supabase
      .from("itemtags")
      .update({ deleted_at: new Date().toISOString() })
      .eq("item_id", id)
      .is("deleted_at", null);

    // Don't fail the entire deletion if tags deletion fails
    void tagDeleteError;

    // Soft delete related itemsignouts
    const { error: signoutDeleteError } = await supabase
      .from("itemsignouts")
      .update({ deleted_at: new Date().toISOString() })
      .eq("item_id", id)
      .is("deleted_at", null);

    // Don't fail the entire deletion if signouts deletion fails
    void signoutDeleteError;
``
    return { id, deleted: true } as const;
  } catch (error) {
    throw new Error(`Failed to delete item: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function signOutItem(id: ItemId, userId?: string) {
  // Example: mark item as checked out by a user
  // const supabase = createClient(cookies());
  // const { data, error } = await supabase
  //   .from("items")
  //   .update({ checked_out_by: userId ?? null, checked_out_at: new Date().toISOString() })
  //   .eq("id", id)
  //   .select("*")
  //   .single();
  // if (error) throw error;
  // return data;
  return { id, checkedOutBy: userId ?? null } as any;
}

export type CreateTagInput = {
  name: string;
};

export async function createTag(input: CreateTagInput) {
  const supabase = await createClient(cookies());
  
  // Use RPC function to create tag - automatically handles user ID
  const { data: tagData, error: tagError } = await supabase.rpc("create_tag", {
    p_name: input.name,
  });

  if (tagError) {
    throw new Error(`Failed to create tag: ${tagError.message || tagError.details || "Unknown error"}`);
  }

  if (!tagData) {
    throw new Error("Failed to create tag: No ID returned");
  }

  // RPC now returns UUID directly, not an object
  const tagId = tagData;
  
  // Fetch the complete tag data using the returned ID
  const { data: tag, error: fetchError } = await supabase
    .from("tags")
    .select("*")
    .eq("id", tagId)
    .single();

  if (fetchError || !tag) {
    throw new Error("Failed to fetch created tag data");
  }

  return tag;
}


