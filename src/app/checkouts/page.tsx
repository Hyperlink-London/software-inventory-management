import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default async function CheckoutsPage() {
  const supabase = await createClient(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch user profile ID and teams
  let userProfileId = null;
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
        // If teams column doesn't exist, try without it
        if (profileError.message?.includes("column") && profileError.message?.includes("teams")) {
          const { data: profileWithoutTeams } = await supabase
            .from("profiles")
            .select("id")
            .eq("supabase_uid", user.id)
            .is("deleted_at", null)
            .single();
          userProfileId = profileWithoutTeams?.id || null;
          userTeams = [];
        }
      } else {
        userProfileId = profile?.id || null;
        userTeams = (profile?.teams as string[]) || [];
      }
    } catch {
      // Profile fetch failed
    }
  }

  // Fetch checkouts
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
            <h1 className="text-4xl font-bold tracking-tight">Checkouts</h1>
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
          <CheckoutTable checkouts={checkouts} currentUserId={userProfileId} userTeams={userTeams} />
        </CardContent>
      </Card>
    </div>
  );
}

