import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { InventoryTable } from "@/components/InventoryTable";
import { CheckoutTable } from "@/components/CheckoutTable";
import { CollapsibleCheckoutCard } from "@/components/CollapsibleCheckoutCard";
import { AddItemButton } from "@/components/AddItemButton";

type ItemWithTags = {
  id: string;
  item_name: string;
  quantity: number;
  notes: string | null;
  image_URL: string | null;
  tags: Array<{
    id: string;
    name: string;
  }>;
};

export default async function Dashboard() {
  const supabase = await createClient(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch user profile from profiles table
  let username = null;
  let userProfileId = null;
  let userTeams: string[] = [];
  if (user?.id) {
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, teams")
        .eq("supabase_uid", user.id)
        .is("deleted_at", null)
        .single();
      
      if (profileError) {
        console.error("Error fetching profile:", profileError);
        // If teams column doesn't exist, try without it
        if (profileError.message?.includes("column") && profileError.message?.includes("teams")) {
          const { data: profileWithoutTeams } = await supabase
            .from("profiles")
            .select("id, username")
            .eq("supabase_uid", user.id)
            .is("deleted_at", null)
            .single();
          username = profileWithoutTeams?.username || null;
          userProfileId = profileWithoutTeams?.id || null;
          userTeams = [];
          console.warn("⚠️ Teams column not found. Please run migration: migrations/add_teams_to_profiles.sql");
        }
      } else {
        username = profile?.username || null;
        userProfileId = profile?.id || null;
        userTeams = (profile?.teams as string[]) || [];
      }
    } catch (error) {
      console.error("Error in profile fetch:", error);
    }
  }

  // Fetch items with their tags
  let items: ItemWithTags[] = [];
  if (user) {
    const { data: itemsData, error: itemsError } = await supabase
      .from("items")
      .select(`
        id,
        item_name,
        quantity,
        notes,
        image_URL,
        itemtags(
          tags(
            id,
            name
          )
        )
      `)
      .is("deleted_at", null)
      .order("item_name", { ascending: true });

    if (!itemsError && itemsData) {
      // Transform the data to flatten tags
      items = itemsData.map((item: any) => ({
        id: item.id,
        item_name: item.item_name,
        quantity: item.quantity,
        notes: item.notes,
        image_URL: item.image_URL,
        tags: (item.itemtags || [])
          .filter((it: any) => it.tags && !it.tags.deleted_at && !it.deleted_at)
          .map((it: any) => ({
            id: it.tags.id,
            name: it.tags.name,
          })),
      }));
    }
  }

  // Fetch checkouts
type CheckoutItem = {
  id: string;
  item_id: string;
  item_name: string;
  image_URL: string | null;
  quantity: number;
  sign_out_date: string;
  expected_return_date: string | null;
  returned_date: string | null;
  recipient_full_name: string;
  recipient_id: string;
  recipient_teams?: string[];
};

  let checkouts: CheckoutItem[] = [];
  if (user) {
    // Try to fetch with teams first
    let checkoutsData: any[] | null = null;
    let checkoutsError: any = null;
    
    const { data, error } = await supabase
      .from("itemsignouts")
      .select(`
        id,
        item_id,
        quantity,
        sign_out_date,
        expected_return_date,
        returned_date,
        recipient_id,
        items!inner(
          item_name,
          image_URL
        ),
        profiles(
          full_name,
          username,
          teams
        )
      `)
      .is("deleted_at", null)
      .order("sign_out_date", { ascending: false });

    checkoutsData = data;
    checkoutsError = error;

    // If error is about teams column, try without it
    if (checkoutsError && checkoutsError.message?.includes("column") && checkoutsError.message?.includes("teams")) {
      console.warn("⚠️ Teams column not found in profiles. Fetching checkouts without teams. Please run migration: migrations/add_teams_to_profiles.sql");
      const { data: dataWithoutTeams, error: errorWithoutTeams } = await supabase
        .from("itemsignouts")
        .select(`
          id,
          item_id,
          quantity,
          sign_out_date,
          expected_return_date,
          returned_date,
          recipient_id,
          items!inner(
            item_name,
            image_URL
          ),
          profiles(
            full_name,
            username
          )
        `)
        .is("deleted_at", null)
        .order("sign_out_date", { ascending: false });
      
      checkoutsData = dataWithoutTeams;
      checkoutsError = errorWithoutTeams;
    }

    if (!checkoutsError && checkoutsData) {
      checkouts = checkoutsData.map((checkout: any) => ({
        id: checkout.id,
        item_id: checkout.item_id,
        item_name: checkout.items?.item_name || "Unknown Item",
        image_URL: checkout.items?.image_URL || null,
        quantity: checkout.quantity,
        sign_out_date: checkout.sign_out_date,
        expected_return_date: checkout.expected_return_date,
        returned_date: checkout.returned_date,
        recipient_full_name: checkout.profiles?.full_name || checkout.profiles?.username || "Unknown",
        recipient_id: checkout.recipient_id,
        recipient_teams: checkout.profiles?.teams || [],
      }));
    }
  }

  // Middleware already handles auth redirects, so we can trust we have a user here
  return (
    <div className="space-y-6 w-full">
      <div className="space-y-2 text-center sm:text-left">
        <h1 className="text-4xl font-bold tracking-tight">
          Dashboard
        </h1>
      </div>

      <CollapsibleCheckoutCard checkouts={checkouts} currentUserId={userProfileId} userTeams={userTeams} />

      <Card className="w-full">
        <CardHeader className="py-3 px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <CardTitle className="text-base sm:text-lg">Inventory</CardTitle>
              <AddItemButton />
            </div>
            {items.length > 0 && (
              <Link href="/items" className="w-full sm:w-auto">
                <Button variant="outline" size="sm" className="h-9 sm:h-8 w-full sm:w-auto text-sm">
                  <ExternalLink className="mr-2 h-3 w-3" />
                  View All
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No items found in inventory.
            </div>
          ) : (
            <InventoryTable items={items} stickyControls maxHeight="600px" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}