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

const CHECKOUT_PAGE_SIZE = 5;

type CheckoutView = "yours" | "everyone" | "returned";

type DashboardProps = {
  searchParams: Promise<{ checkoutPage?: string; checkoutView?: string }>;
};

export default async function Dashboard({ searchParams }: DashboardProps) {
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
        // If teams column doesn't exist, try without it
        if (
          profileError.message?.includes("column") &&
          profileError.message?.includes("teams")
        ) {
          const { data: profileWithoutTeams } = await supabase
            .from("profiles")
            .select("id, username")
            .eq("supabase_uid", user.id)
            .is("deleted_at", null)
            .single();
          username = profileWithoutTeams?.username || null;
          userProfileId = profileWithoutTeams?.id || null;
          userTeams = [];
        }
      } else {
        username = profile?.username || null;
        userProfileId = profile?.id || null;
        userTeams = (profile?.teams as string[]) || [];
      }
    } catch {
      // Profile fetch failed
    }
  }

  const resolved = await searchParams;
  const checkoutPage = Math.max(1, parseInt(resolved.checkoutPage ?? "1", 10) || 1);
  const checkoutFrom = (checkoutPage - 1) * CHECKOUT_PAGE_SIZE;
  const checkoutTo = checkoutFrom + CHECKOUT_PAGE_SIZE - 1;
  const checkoutView: CheckoutView =
    resolved.checkoutView === "yours" || resolved.checkoutView === "everyone" || resolved.checkoutView === "returned"
      ? resolved.checkoutView
      : "yours";

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

  // Fetch checkouts (paginated) filtered by view
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
  let checkoutTotalCount = 0;
  let activeCount = 0;
  let overdueCount = 0;
  if (user) {
    // Fetch all non-returned checkouts and compute overdue/active in JS (match CheckoutTable isOverdue logic)
    const now = new Date();
    const { data: nonReturnedRows } = await supabase
      .from("itemsignouts")
      .select("id, expected_return_date")
      .is("deleted_at", null)
      .is("returned_date", null);
    const total = nonReturnedRows?.length ?? 0;
    overdueCount =
      nonReturnedRows?.filter((r) => {
        const expected = r?.expected_return_date ?? (r as Record<string, unknown>)?.expectedReturnDate;
        if (expected == null) return false;
        const d = new Date(expected as string);
        return !Number.isNaN(d.getTime()) && d < now;
      }).length ?? 0;
    activeCount = Math.max(0, total - overdueCount);

    const applyCheckoutViewFilter = (q: any) => {
      let query = q.is("deleted_at", null);
      if (checkoutView === "yours" && userProfileId) {
        query = query.eq("recipient_id", userProfileId).is("returned_date", null);
      } else if (checkoutView === "everyone") {
        query = query.is("returned_date", null);
      } else if (checkoutView === "returned") {
        query = query.not("returned_date", "is", null);
      }
      return query;
    };

    let checkoutsData: any[] | null = null;
    let checkoutsError: any = null;
    let count: number | null = null;

    let q1 = applyCheckoutViewFilter(
      supabase
        .from("itemsignouts")
        .select(
          `
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
        recipient:profiles!itemsignouts_recipient_id_fkey(
          full_name,
          username,
          teams
        )
      `,
          { count: "exact" },
        )
    ).order(checkoutView === "returned" ? "returned_date" : "sign_out_date", { ascending: checkoutView === "returned" });
    if (checkoutView === "returned") q1 = q1.order("sign_out_date", { ascending: true });
    const res1 = await q1.range(checkoutFrom, checkoutTo);
    checkoutsData = res1.data;
    checkoutsError = res1.error;
    count = res1.count ?? null;

    if (checkoutsError?.message?.includes("column") && checkoutsError?.message?.includes("teams")) {
      let q2 = applyCheckoutViewFilter(
        supabase
          .from("itemsignouts")
          .select(
            `
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
          recipient:profiles!itemsignouts_recipient_id_fkey(
            full_name,
            username
          )
        `,
            { count: "exact" },
          )
      ).order(checkoutView === "returned" ? "returned_date" : "sign_out_date", { ascending: checkoutView === "returned" });
      if (checkoutView === "returned") q2 = q2.order("sign_out_date", { ascending: true });
      const res2 = await q2.range(checkoutFrom, checkoutTo);
      checkoutsData = res2.data;
      checkoutsError = res2.error;
      count = res2.count ?? null;
    }

    if (!checkoutsError && checkoutsData) {
      checkoutTotalCount = count ?? 0;
      checkouts = checkoutsData.map((checkout: any) => ({
        id: checkout.id,
        item_id: checkout.item_id,
        item_name: checkout.items?.item_name || "Unknown Item",
        image_URL: checkout.items?.image_URL || null,
        quantity: checkout.quantity,
        sign_out_date: checkout.sign_out_date,
        expected_return_date: checkout.expected_return_date,
        returned_date: checkout.returned_date,
        recipient_full_name: checkout.recipient?.full_name || checkout.recipient?.username || "Unknown",
        recipient_id: checkout.recipient_id,
        recipient_teams: checkout.recipient?.teams || [],
      }));
    }
  }

  // Middleware already handles auth redirects, so we can trust we have a user here
  return (
    <div className="space-y-6 w-full">
      <div className="space-y-2 text-center sm:text-left">
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
      </div>

      <CollapsibleCheckoutCard
        checkouts={checkouts}
        currentUserId={userProfileId}
        userTeams={userTeams}
        totalCount={checkoutTotalCount}
        currentPage={checkoutPage}
        pageSize={CHECKOUT_PAGE_SIZE}
        basePath="/"
        pageParam="checkoutPage"
        initialViewMode={checkoutView}
        viewParam="checkoutView"
        returnViewSearchParams="checkoutView=returned"
        activeCount={activeCount}
        overdueCount={overdueCount}
      />

      <Card className="w-full">
        <CardHeader className="py-3 px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <CardTitle className="text-base sm:text-lg">Inventory</CardTitle>
              <AddItemButton />
            </div>
            {items.length > 0 && (
              <Link href="/items" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 sm:h-8 w-full sm:w-auto text-sm"
                >
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
            <InventoryTable
              items={items}
              userTeams={userTeams}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
