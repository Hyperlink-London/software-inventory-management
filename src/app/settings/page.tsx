import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsPageClient } from "./SettingsPageClient";

type ProfileRow = {
  id: string;
  full_name?: string | null;
  username?: string | null;
  teams?: string[] | null;
  created_at?: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not available";
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDisplayName(
  user: { user_metadata?: any; email?: string | null },
  profile: ProfileRow | null
) {
  return (
    profile?.full_name ||
    profile?.username ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.user_name ||
    user?.user_metadata?.preferred_username ||
    user?.email?.split("@")[0] ||
    "Unknown"
  );
}

export default async function SettingsPage() {
  const supabase = await createClient(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let profile: ProfileRow | null = null;
  let teams: string[] = [];

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, username, teams, created_at")
    .eq("supabase_uid", user.id)
    .is("deleted_at", null)
    .single();

  if (profileError?.message?.includes("column") && profileError.message.includes("teams")) {
    const { data: dataWithoutTeams } = await supabase
      .from("profiles")
      .select("id, full_name, username, created_at")
      .eq("supabase_uid", user.id)
      .is("deleted_at", null)
      .single();
    profile = dataWithoutTeams || null;
    teams = [];
  } else {
    profile = profileData || null;
    teams = (profileData?.teams as string[]) || [];
  }

  if (!profile) {
    redirect("/login");
  }

  const isAdmin = teams?.includes("admin") ?? false;

  const [{ count: itemsAddedCount }, { count: checkoutsCount }] = await Promise.all([
    supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("created_by", profile.id)
      .is("deleted_at", null),
    supabase
      .from("itemsignouts")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", profile.id)
      .is("deleted_at", null),
  ]);

  let tags: { id: string; name: string }[] = [];
  if (isAdmin) {
    const { data: tagsData } = await supabase
      .from("tags")
      .select("id, name")
      .is("deleted_at", null)
      .order("name");
    tags = (tagsData || []).map((t) => ({ id: t.id, name: t.name }));
  }

  const displayName = getDisplayName(user, profile);
  const joinedAt = formatDate(profile.created_at);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Your account info and app preferences.
        </p>
      </div>

      {/* Profile & stats for all users */}
      <Card>
        <CardHeader>
          <CardTitle>Your account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="text-base font-medium">{displayName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Username</p>
              <p className="text-base font-medium">{profile.username ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Profile ID</p>
              <p className="text-xs font-mono break-all text-muted-foreground">{profile.id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Joined</p>
              <p className="text-base font-medium">{joinedAt}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Items added</p>
              <p className="text-base font-medium">{itemsAddedCount ?? 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Items checked out</p>
              <p className="text-base font-medium">{checkoutsCount ?? 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin: Delete tags */}
      {isAdmin && (
        <SettingsPageClient initialTags={tags} />
      )}
    </div>
  );
}
