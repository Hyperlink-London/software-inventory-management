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
  recipient_username: string;
  recipient_id: string;
};

export default async function CheckoutsPage() {
  const supabase = await createClient(cookies());
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Fetch user profile ID
  let userProfileId = null;
  if (session?.user?.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("supabase_uid", session.user.id)
      .is("deleted_at", null)
      .single();
    
    userProfileId = profile?.id || null;
  }

  // Fetch checkouts
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
          <CheckoutTable checkouts={checkouts} currentUserId={userProfileId} />
        </CardContent>
      </Card>
    </div>
  );
}

