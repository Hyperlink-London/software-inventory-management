import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { InventoryTable } from "@/components/InventoryTable";

type ItemWithTags = {
  id: string;
  item_name: string;
  quantity: number;
  checked_out_quantity: number;
  notes: string | null;
  image_URL: string | null;
  created_by: string | null;
  created_by_name: string | null;
  tags: Array<{
    id: string;
    name: string;
  }>;
};

export default async function ItemsPage() {
  const supabase = await createClient(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch user teams for admin permissions
  let userTeams: string[] = [];
  if (user?.id) {
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("teams")
        .eq("supabase_uid", user.id)
        .is("deleted_at", null)
        .single();

      if (profileError) {
        if (
          profileError.message?.includes("column") &&
          profileError.message?.includes("teams")
        ) {
          userTeams = [];
        }
      } else {
        userTeams = (profile?.teams as string[]) || [];
      }
    } catch {
      // Profile teams fetch failed
    }
  }

  // Fetch items with their tags
  let items: ItemWithTags[] = [];
  if (user) {
    const { data: itemsData, error: itemsError } = await supabase
      .from("items")
      .select(
        `
        id,
        item_name,
        quantity,
        notes,
        image_URL,
        created_by,
        creator:profiles!items_created_by_fkey(
          full_name,
          username
        ),
        itemtags(
          tags(
            id,
            name
          )
        )
      `,
      )
      .is("deleted_at", null)
      .order("item_name", { ascending: true });

    // Fetch active checkouts to calculate checked out quantities
    const { data: activeCheckouts } = await supabase
      .from("itemsignouts")
      .select("item_id, quantity")
      .is("returned_date", null)
      .is("deleted_at", null);

    // Create a map of item_id -> total checked out quantity
    const checkedOutMap = new Map<string, number>();
    if (activeCheckouts) {
      for (const checkout of activeCheckouts) {
        const current = checkedOutMap.get(checkout.item_id) || 0;
        checkedOutMap.set(checkout.item_id, current + checkout.quantity);
      }
    }

    if (!itemsError && itemsData) {
      // Transform the data to flatten tags
      items = itemsData.map((item: any) => ({
        id: item.id,
        item_name: item.item_name,
        quantity: item.quantity,
        checked_out_quantity: checkedOutMap.get(item.id) || 0,
        notes: item.notes,
        image_URL: item.image_URL,
        created_by: item.created_by,
        created_by_name: item.creator?.full_name || item.creator?.username || null,
        tags: (item.itemtags || [])
          .filter((it: any) => it.tags && !it.tags.deleted_at && !it.deleted_at)
          .map((it: any) => ({
            id: it.tags.id,
            name: it.tags.name,
          })),
      }));
    }
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-4xl font-bold tracking-tight">Inventory</h1>
          </div>
          <p className="text-muted-foreground">
            View and manage all items in your inventory
          </p>
        </div>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>All Items</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No items found in inventory.
            </div>
          ) : (
            <InventoryTable items={items} userTeams={userTeams} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
