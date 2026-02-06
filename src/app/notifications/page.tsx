import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Inbox, Package, ShoppingCart } from "lucide-react";
import { NotificationInbox } from "@/components/NotificationInbox";

export default async function NotificationsPage() {
  const supabase = await createClient(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("supabase_uid", user.id)
    .is("deleted_at", null)
    .single();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
            <Inbox className="h-9 w-9" />
            Notifications
          </h1>
          <p className="text-muted-foreground mt-1">
            All your team activity and reminders
          </p>
        </div>
      </div>

      <NotificationInbox profileId={profile?.id ?? null} />
    </div>
  );
}
