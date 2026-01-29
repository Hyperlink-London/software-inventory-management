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
  notes: string | null;
  image_URL: string | null;
  created_by: string | null;
  tags: Array<{
    id: string;
    name: string;
  }>;
};

const PAGE_SIZE = 10;

type ItemsPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function ItemsPage({ searchParams }: ItemsPageProps) {
  const supabase = await createClient(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const resolved = await searchParams;
  const page = Math.max(1, parseInt(resolved.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Fetch items with their tags (paginated) and total count
  let items: ItemWithTags[] = [];
  let totalCount = 0;
  if (user) {
    const { data: itemsData, error: itemsError, count } = await supabase
      .from("items")
      .select(
        `
        id,
        item_name,
        quantity,
        notes,
        image_URL,
        created_by,
        itemtags(
          tags(
            id,
            name
          )
        )
      `,
        { count: "exact" },
      )
      .is("deleted_at", null)
      .order("item_name", { ascending: true })
      .range(from, to);

    if (!itemsError && itemsData) {
      totalCount = count ?? 0;
      items = itemsData.map((item: any) => ({
        id: item.id,
        item_name: item.item_name,
        quantity: item.quantity,
        notes: item.notes,
        image_URL: item.image_URL,
        created_by: item.created_by,
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
          {totalCount === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No items found in inventory.
            </div>
          ) : (
            <InventoryTable
              items={items}
              totalCount={totalCount}
              currentPage={page}
              pageSize={PAGE_SIZE}
              basePath="/items"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
