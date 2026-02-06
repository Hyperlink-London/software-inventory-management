import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { ensureOverdueNotifications } from "@/lib/notifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckoutTable } from "@/components/CheckoutTable";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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

const PAGE_SIZE = 10;

type CheckoutView = "yours" | "everyone" | "returned";

type CheckoutsPageProps = {
  searchParams: Promise<{ page?: string; view?: string }>;
};

export default async function CheckoutsPage({ searchParams }: CheckoutsPageProps) {
  const supabase = await createClient(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const resolved = await searchParams;
  const page = Math.max(1, parseInt(resolved.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const view: CheckoutView =
    resolved.view === "yours" || resolved.view === "everyone" || resolved.view === "returned"
      ? resolved.view
      : "yours";

  // Fetch user profile ID and teams
  let userProfileId: string | null = null;
  let userTeams: string[] = [];
  if (user?.id) {
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, teams")
        .eq("supabase_uid", user.id)
        .is("deleted_at", null)
        .single();

      if (profileError) {
        if (profileError.message?.includes("column") && profileError.message?.includes("teams")) {
          const { data: profileWithoutTeams } = await supabase
            .from("profiles")
            .select("id")
            .eq("supabase_uid", user.id)
            .is("deleted_at", null)
            .single();
          userProfileId = profileWithoutTeams?.id ?? null;
          userTeams = [];
        }
      } else {
        userProfileId = profile?.id ?? null;
        userTeams = (profile?.teams as string[]) ?? [];
      }
    } catch {
      // Profile fetch failed
    }
  }

  const applyViewFilter = (q: any) => {
    let query = q.is("deleted_at", null);
    if (view === "yours" && userProfileId) {
      query = query.eq("recipient_id", userProfileId).is("returned_date", null);
    } else if (view === "everyone") {
      query = query.is("returned_date", null);
    } else if (view === "returned") {
      query = query.not("returned_date", "is", null);
    }
    return query;
  };

  let activeCount = 0;
  let overdueCount = 0;

  // Fetch checkouts (paginated) filtered by view
  let checkouts: CheckoutItem[] = [];
  let totalCount = 0;
  if (user) {
    await ensureOverdueNotifications(userProfileId ?? null);

    const now = new Date().toISOString();
    const { count: nonReturnedCount } = await supabase
      .from("itemsignouts")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .is("returned_date", null);
    const { count: overdueCountRes } = await supabase
      .from("itemsignouts")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .is("returned_date", null)
      .not("expected_return_date", "is", null)
      .lt("expected_return_date", now);
    activeCount = Math.max(0, (nonReturnedCount ?? 0) - (overdueCountRes ?? 0));
    overdueCount = overdueCountRes ?? 0;

    let checkoutsData: any[] | null = null;
    let checkoutsError: any = null;
    let count: number | null = null;

    let q1 = applyViewFilter(
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
    ).order(view === "returned" ? "returned_date" : "sign_out_date", { ascending: view === "returned" });
    if (view === "returned") q1 = q1.order("sign_out_date", { ascending: true });
    const res1 = await q1.range(from, to);
    checkoutsData = res1.data;
    checkoutsError = res1.error;
    count = res1.count ?? null;

    if (checkoutsError?.message?.includes("column") && checkoutsError?.message?.includes("teams")) {
      let q2 = applyViewFilter(
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
      ).order(view === "returned" ? "returned_date" : "sign_out_date", { ascending: view === "returned" });
      if (view === "returned") q2 = q2.order("sign_out_date", { ascending: true });
      const res2 = await q2.range(from, to);
      checkoutsData = res2.data;
      checkoutsError = res2.error;
      count = res2.count ?? null;
    }

    if (!checkoutsError && checkoutsData) {
      totalCount = count ?? 0;
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
              Checkouts
              {(activeCount > 0 || overdueCount > 0) && (
                <span className="inline-flex flex-wrap items-center gap-2">
                  <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                    {activeCount} Active
                  </Badge>
                  <Badge className="bg-red-500/20 text-red-500 border-red-500/30">
                    {overdueCount} Overdue
                  </Badge>
                </span>
              )}
            </h1>
          </div>
          <p className="text-muted-foreground">
            View and manage all item checkouts
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Checkouts</CardTitle>
        </CardHeader>
        <CardContent>
          <CheckoutTable
            checkouts={checkouts}
            currentUserId={userProfileId}
            userTeams={userTeams}
            totalCount={totalCount}
            currentPage={page}
            pageSize={PAGE_SIZE}
            basePath="/checkouts"
            initialViewMode={view}
            viewParam="view"
            returnViewSearchParams="view=returned"
          />
        </CardContent>
      </Card>
    </div>
  );
}
