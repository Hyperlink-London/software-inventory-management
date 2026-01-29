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

const PAGE_SIZE = 10;

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

type DashboardProps = {
  searchParams: Promise<{ page?: string; checkoutPage?: string; checkoutStatus?: string; checkoutView?: string }>;
};

type CheckoutView = "yours" | "everyone" | "returned";

export default async function Dashboard({ searchParams }: DashboardProps) {
  const supabase = await createClient(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const resolved = await searchParams;
  const page = Math.max(1, parseInt(resolved.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const checkoutPage = Math.max(1, parseInt(resolved.checkoutPage ?? "1", 10) || 1);
  const checkoutFrom = (checkoutPage - 1) * PAGE_SIZE;
  const checkoutTo = checkoutFrom + PAGE_SIZE - 1;
  const checkoutView: CheckoutView =
    resolved.checkoutView === "yours" || resolved.checkoutView === "everyone" || resolved.checkoutView === "returned"
      ? resolved.checkoutView
      : resolved.checkoutStatus === "returned"
        ? "returned"
        : "yours";

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
          console.warn(
            "⚠️ Teams column not found. Please run migration: migrations/add_teams_to_profiles.sql",
          );
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
  let checkoutTotalCount = 0;
  if (user) {
    let checkoutsData: any[] | null = null;
    let checkoutsError: any = null;
    let count: number | null = null;

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
      if (checkoutView === "yours" && userProfileId) {
        query = query.eq("recipient_id", userProfileId).is("returned_date", null);
      } else if (checkoutView === "everyone") {
        query = query.is("returned_date", null);
      } else if (checkoutView === "returned") {
        query = query.not("returned_date", "is", null);
      }
      return query;
    };

    let checkoutQueryWithTeams = applyCheckoutViewFilter(
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
        profiles(
          full_name,
          username,
          teams
        )
      `,
          { count: "exact" },
        )
    )
      .order(checkoutView === "returned" ? "returned_date" : "sign_out_date", { ascending: false })
      .range(checkoutFrom, checkoutTo);

    const { data, error, count: countWithTeams } = await checkoutQueryWithTeams;

    checkoutsData = data;
    checkoutsError = error;
    count = countWithTeams ?? null;

    // If error is about teams column, try without it
    if (
      checkoutsError &&
      checkoutsError.message?.includes("column") &&
      checkoutsError.message?.includes("teams")
    ) {
      console.warn(
        "⚠️ Teams column not found in profiles. Fetching checkouts without teams. Please run migration: migrations/add_teams_to_profiles.sql",
      );
      let checkoutQueryWithoutTeams = applyCheckoutViewFilter(
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
          profiles(
            full_name,
            username
          )
        `,
            { count: "exact" },
          )
      )
        .order(checkoutView === "returned" ? "returned_date" : "sign_out_date", { ascending: false })
        .range(checkoutFrom, checkoutTo);

      const { data: dataWithoutTeams, error: errorWithoutTeams, count: countWithoutTeams } =
        await checkoutQueryWithoutTeams;

      checkoutsData = dataWithoutTeams;
      checkoutsError = errorWithoutTeams;
      count = countWithoutTeams ?? null;
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
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
      </div>

      <CollapsibleCheckoutCard
        checkouts={checkouts}
        currentUserId={userProfileId}
        userTeams={userTeams}
        totalCount={checkoutTotalCount}
        currentPage={checkoutPage}
        pageSize={PAGE_SIZE}
        basePath="/"
        pageParam="checkoutPage"
        initialViewMode={checkoutView}
        viewParam="checkoutView"
        returnViewSearchParams="checkoutView=returned"
      />

      <Card className="w-full">
        <CardHeader className="py-3 px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <CardTitle className="text-base sm:text-lg">Inventory</CardTitle>
              <AddItemButton />
            </div>
            {totalCount > 0 && (
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
          {totalCount === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No items found in inventory.
            </div>
          ) : (
            <InventoryTable
              items={items}
              stickyControls
              maxHeight="600px"
              totalCount={totalCount}
              currentPage={page}
              pageSize={PAGE_SIZE}
              basePath="/"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
