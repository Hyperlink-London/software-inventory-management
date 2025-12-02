import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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
  if (session?.user?.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("supabase_uid", session.user.id)
      .is("deleted_at", null)
      .single();
    
    username = profile?.username || null;
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

      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No items found in inventory.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Image</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.image_URL ? (
                        <div className="relative h-16 w-16 overflow-hidden rounded-md border border-border">
                          <img
                            src={item.image_URL}
                            alt={item.item_name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                          <span className="text-xs">No image</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{item.item_name}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {item.tags.length > 0 ? (
                          item.tags.map((tag) => (
                            <Badge key={tag.id} variant="secondary">
                              {tag.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">No tags</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.notes || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}