import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { ItemDetail } from "@/components/ItemDetail";

interface ItemDetailPageProps {
  params: { id: string };
}

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
  recipient_teams?: string[];
};

export default async function ItemDetailPage({ params }: ItemDetailPageProps) {
  const supabase = await createClient(cookies());
  const { id } = await params;

  // Fetch current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
        console.error("Error fetching profile:", profileError);
        // If teams column doesn't exist, try without it
        if (
          profileError.message?.includes("column") &&
          profileError.message?.includes("teams")
        ) {
          const { data: profileWithoutTeams } = await supabase
            .from("profiles")
            .select("id")
            .eq("supabase_uid", user.id)
            .is("deleted_at", null)
            .single();
          userProfileId = profileWithoutTeams?.id || null;
          userTeams = [];
          console.warn(
            "⚠️ Teams column not found. Please run migration: migrations/add_teams_to_profiles.sql",
          );
        }
      } else {
        userProfileId = (profile?.id as string) || null;
        userTeams = (profile?.teams as string[]) || [];
      }
    } catch (error) {
      console.error("Error in profile fetch:", error);
    }
  }

  // Fetch item details
  const { data, error } = await supabase
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
            name,
            deleted_at
          ),
          deleted_at
        )
      `,
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Item not found</h1>
        <p className="text-muted-foreground">
          We couldn&apos;t find an item with the specified ID.
        </p>
      </div>
    );
  }

  const item: ItemWithTags = {
    id: data.id,
    item_name: data.item_name,
    quantity: data.quantity,
    notes: data.notes,
    image_URL: data.image_URL,
    created_by: data.created_by,
    tags: (data.itemtags || [])
      .filter((it: any) => it.tags && !it.tags.deleted_at && !it.deleted_at)
      .map((it: any) => ({
        id: it.tags.id as string,
        name: it.tags.name as string,
      })),
  };

  // Fetch checkouts for this item
  let checkouts: CheckoutItem[] = [];
  if (user) {
    let checkoutsData: any[] | null = null;
    let checkoutsError: any = null;

    const { data: checkoutDataWithTeams, error: checkoutErrorWithTeams } =
      await supabase
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
          username,
          teams
        )
      `,
        )
        .eq("item_id", id)
        .is("deleted_at", null)
        .order("sign_out_date", { ascending: false });

    checkoutsData = checkoutDataWithTeams;
    checkoutsError = checkoutErrorWithTeams;

    // If error is about teams column, try without it
    if (
      checkoutsError &&
      checkoutsError.message?.includes("column") &&
      checkoutsError.message?.includes("teams")
    ) {
      console.warn(
        "⚠️ Teams column not found in profiles. Fetching checkouts without teams. Please run migration: migrations/add_teams_to_profiles.sql",
      );
      const {
        data: checkoutDataWithoutTeams,
        error: checkoutErrorWithoutTeams,
      } = await supabase
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
            username
          )
        `,
        )
        .eq("item_id", id)
        .is("deleted_at", null)
        .order("sign_out_date", { ascending: false });

      checkoutsData = checkoutDataWithoutTeams;
      checkoutsError = checkoutErrorWithoutTeams;
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
        recipient_username: checkout.profiles?.username || "Unknown",
        recipient_id: checkout.recipient_id,
        recipient_teams: checkout.profiles?.teams || [],
      }));
    }
  }

  return (
    <ItemDetail
      item={item}
      checkouts={checkouts}
      currentUserId={userProfileId}
      userTeams={userTeams}
    />
  );
}
