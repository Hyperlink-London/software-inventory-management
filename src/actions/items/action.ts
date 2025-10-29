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

export async function createItem(input: ItemInput) {
  // const supabase = createClient(cookies());
  // const { data, error } = await supabase.from("items").insert(input).select("*").single();
  // if (error) throw error;
  // return data;
  return { id: "new-id", ...input } as any;
}

export async function updateItem(id: ItemId, input: Partial<ItemInput>) {
  // const supabase = createClient(cookies());
  // const { data, error } = await supabase.from("items").update(input).eq("id", id).select("*").single();
  // if (error) throw error;
  // return data;
  return { id, ...input } as any;
}

export async function deleteItem(id: ItemId) {
  // const supabase = createClient(cookies());
  // const { error } = await supabase.from("items").delete().eq("id", id);
  // if (error) throw error;
  return { id, deleted: true } as const;
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


