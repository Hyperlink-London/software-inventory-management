import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { InventoryTable } from "@/components/InventoryTable";
import { CheckoutTable } from "@/components/CheckoutTable";
import { CollapsibleCheckoutCard } from "@/components/CollapsibleCheckoutCard";

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
    data: { session },
  } = await supabase.auth.getSession();

  // Fetch user profile from profiles table
  let username = null;
  let userProfileId = null;
  if (session?.user?.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("supabase_uid", session.user.id)
      .is("deleted_at", null)
      .single();
    
    username = profile?.username || null;
    userProfileId = profile?.id || null;
  }

  // Fetch items with their tags
  let items: ItemWithTags[] = [];
  if (session) {
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
    recipient_username: string;
    recipient_id: string;
  };

  let checkouts: CheckoutItem[] = [];
  if (session) {
    const { data: checkoutsData, error: checkoutsError } = await supabase
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
          username
        )
      `)
      .is("deleted_at", null)
      .order("sign_out_date", { ascending: false });

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
        recipient_username: checkout.profiles?.username || "Unknown",
        recipient_id: checkout.recipient_id,
      }));
    }
  }

  // Middleware already handles auth redirects, so we can trust we have a session here
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">
          Dashboard
        </h1>
        {username && (
          <p className="text-xl text-muted-foreground">
            Welcome back, <span className="font-semibold text-foreground">{username}</span>
          </p>
        )}
        {!username && session && (
          <p className="text-lg text-muted-foreground">
            Welcome, {session.user.email}
          </p>
        )}
      </div>

      <CollapsibleCheckoutCard checkouts={checkouts} currentUserId={userProfileId} />

      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Inventory</CardTitle>
            {items.length > 0 && (
              <Link href="/items">
                <Button variant="outline" size="sm" className="h-8">
                  <ExternalLink className="mr-2 h-3 w-3" />
                  View All
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No items found in inventory.
            </div>
          ) : (
            <InventoryTable items={items} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}