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

  // Notify teammates (inbox + push) - fire and forget
  try {
    const { notifyTeammates } = await import("@/lib/notifications");
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("supabase_uid", user.id)
        .single();
      const actorName = (profile as any)?.full_name || (profile as any)?.username || "A teammate";
      const itemName = (item as any)?.item_name ?? input.name ?? "an item";
      await notifyTeammates({
        type: "team_item_added",
        title: "New item added",
        body: `${actorName} added "${itemName}" to the inventory`,
        metadata: { item_id: item.id },
      });
    }
  } catch {
    // Non-fatal
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
    // Get the item to retrieve its image URL before RPC clears it
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
        await supabase.rpc("delete_image_from_storage", {
          p_image_url: itemData.image_URL,
        });
      } catch {
        // Continue with item deletion even if image deletion fails
      }
    }

    const { data: result, error: rpcError } = await supabase.rpc("delete_item", {
      p_item_id: id,
    });

    if (rpcError) {
      throw new Error(`Failed to delete item: ${rpcError.message}`);
    }

    const row = Array.isArray(result) ? result[0] : result;
    if (!row?.success) {
      throw new Error(row?.message ?? "Failed to delete item");
    }

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

/**
 * Delete a tag (soft-delete). Only succeeds if the current user is an admin
 * (profile.teams includes "admin"). Uses RPC delete_tag in the database.
 */
export async function deleteTag(tagId: string) {
  const supabase = await createClient(cookies());
  const { data, error } = await supabase.rpc("delete_tag", {
    p_tag_id: tagId,
  });

  if (error) {
    throw new Error(error.message || "Failed to delete tag");
  }

  const row = Array.isArray(data) ? data[0] : data;
  const success = (row as { success?: boolean })?.success === true;
  const message = (row as { message?: string })?.message;

  if (!success) {
    throw new Error(message || "Failed to delete tag");
  }
}


