import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ProfileRow = {
  full_name?: string | null;
  username?: string | null;
  teams?: string[] | null;
  created_at?: string | null;
};

function getDisplayName(user: { email?: string | null; user_metadata?: any }, profile: ProfileRow | null) {
  return (
    profile?.full_name ||
    profile?.username ||
    user.user_metadata?.full_name ||
    user.user_metadata?.display_name ||
    user.user_metadata?.name ||
    user.user_metadata?.user_name ||
    user.user_metadata?.preferred_username ||
    user.email?.split("@")[0] ||
    "Unknown"
  );
}

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

export default async function ProfilePage() {
  const supabase = await createClient(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let profile: ProfileRow | null = null;
  let teams: string[] = [];

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, username, teams, created_at")
    .eq("supabase_uid", user.id)
    .is("deleted_at", null)
    .single();

  if (error?.message?.includes("column") && error.message.includes("teams")) {
    const { data: dataWithoutTeams } = await supabase
      .from("profiles")
      .select("full_name, username, created_at")
      .eq("supabase_uid", user.id)
      .is("deleted_at", null)
      .single();
    profile = dataWithoutTeams || null;
    teams = [];
  } else {
    profile = data || null;
    teams = (data?.teams as string[]) || [];
  }

  const displayName = getDisplayName(user, profile);
  const email = user.email ?? "Not available";
  const createdAt = formatDate(profile?.created_at);
  const sortedTeams = [...teams].filter(Boolean).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Your account details and team membership.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="text-base font-medium">{displayName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="text-base font-medium">{email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Profile created</p>
              <p className="text-base font-medium">{createdAt}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">User ID</p>
              <p className="text-xs sm:text-sm font-mono break-all">
                {user.id}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Teams</p>
            {sortedTeams.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {sortedTeams.map((team) => (
                  <Badge key={team} variant="secondary">
                    {team}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No teams assigned yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
