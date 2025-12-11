import { createClient } from "@/utils/supabase/server";
import DebugInfo from "@/components/DebugInfo";
import { cookies } from "next/headers";

export default async function DebugPage() {
  // Log cookies for debugging
  const supabase = await createClient(cookies());
  const cookieStore = await cookies();
  const supabase = await createClient(cookies());
  const allCookies = cookieStore.getAll();
  console.log("Debug page - Cookies:", {
    count: allCookies.length,
    names: allCookies.map(c => c.name),
    supabaseCookies: allCookies.filter(c => 
      c.name.includes("supabase") || 
      c.name.includes("sb-") || 
      c.name.includes("auth")
    ).map(c => ({ name: c.name, hasValue: !!c.value, valueLength: c.value?.length }))
  });
  
  // Use getUser() for consistency with middleware and to get fresh session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // Get session separately for detailed session info
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  console.log("Debug page - Session check:", {
    hasUser: !!user,
    hasSession: !!session,
    userError: userError?.message,
    sessionError: sessionError?.message,
    userId: user?.id,
    sessionUserId: session?.user?.id,
  });

  // Try to get claims, but handle if it's not available or errors
  let claims = null;
  try {
    const { data: claimsData } = await supabase.auth.getClaims();
    claims = claimsData ?? null;
  } catch (error) {
    // getClaims() might not be available or might error
    console.warn("Could not fetch claims:", error);
  }

  // Fetch profile from database
  let profile = null;
  let profileError = null;
  if (user?.id) {
    try {
      const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("supabase_uid", user.id)
        .is("deleted_at", null)
        .maybeSingle();
      profile = profileData;
      profileError = profileErr;
    } catch (error) {
      profileError = error as any;
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Debug Information</h1>
      
      {(userError || sessionError) && (
        <section className="border border-red-300 dark:border-red-800 rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
          <h2 className="text-xl font-semibold mb-3 text-red-700 dark:text-red-400">Errors</h2>
          {userError && (
            <p className="text-red-600 dark:text-red-400">
              <strong>User Error:</strong> {userError.message}
            </p>
          )}
          {sessionError && (
            <p className="text-red-600 dark:text-red-400">
              <strong>Session Error:</strong> {sessionError.message}
            </p>
          )}
        </section>
      )}
      
      <div className="space-y-4">
        <section className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-3">User Information</h2>
          {user || session?.user ? (
            <div className="space-y-2">
              <p>
                <strong>Full Name:</strong>{" "}
                {user?.user_metadata?.full_name ||
                  user?.user_metadata?.display_name ||
                  user?.user_metadata?.name ||
                  session?.user?.user_metadata?.full_name ||
                  session?.user?.user_metadata?.display_name ||
                  session?.user?.user_metadata?.name ||
                  "Not set"}
              </p>
              <p>
                <strong>Username:</strong>{" "}
                {user?.user_metadata?.user_name ||
                  user?.user_metadata?.preferred_username ||
                  session?.user?.user_metadata?.user_name ||
                  session?.user?.user_metadata?.preferred_username ||
                  (user?.email || session?.user?.email)?.split("@")[0] ||
                  "Not set"}
              </p>
              <p>
                <strong>Email:</strong> {user?.email || session?.user?.email || "N/A"}
              </p>
              <p>
                <strong>User ID:</strong> {user?.id || session?.user?.id || "N/A"}
              </p>
              <p>
                <strong>Created At:</strong>{" "}
                {user?.created_at
                  ? new Date(user.created_at).toLocaleString()
                  : session?.user?.created_at
                  ? new Date(session.user.created_at).toLocaleString()
                  : "N/A"}
              </p>
              <p>
                <strong>User Source:</strong> {user ? "getUser()" : "getSession()"}
              </p>
            </div>
          ) : (
            <p className="text-zinc-500">Not signed in</p>
          )}
        </section>

        <section className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-3">Session Details</h2>
          {session ? (
            <div className="space-y-2">
              <p>
                <strong>Access Token:</strong>{" "}
                {session.access_token ? `${session.access_token.substring(0, 20)}...` : "N/A"}
              </p>
              <p>
                <strong>Expires At:</strong>{" "}
                {session.expires_at
                  ? new Date(session.expires_at * 1000).toLocaleString()
                  : "N/A"}
              </p>
              <p>
                <strong>Token Type:</strong> {session.token_type || "N/A"}
              </p>
            </div>
          ) : (
            <p className="text-zinc-500">No active session</p>
          )}
        </section>

        <section className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-3">User Metadata (from Auth)</h2>
          {user?.user_metadata || session?.user?.user_metadata ? (
            <pre className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(user?.user_metadata || session?.user?.user_metadata, null, 2)}
            </pre>
          ) : (
            <p className="text-zinc-500">No metadata available</p>
          )}
        </section>

        <section className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-3">Profile from Database</h2>
          {profileError ? (
            <div className="space-y-2">
              <p className="text-red-600 dark:text-red-400">
                <strong>Error:</strong> {profileError.message || "Failed to fetch profile"}
              </p>
            </div>
          ) : profile ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <p>
                  <strong>Profile ID:</strong> {profile.id}
                </p>
                <p>
                  <strong>Username:</strong> {profile.username || "N/A"}
                </p>
                <p>
                  <strong>Full Name:</strong> {profile.full_name || "N/A"}
                </p>
                <p>
                  <strong>Email:</strong> {profile.email || "N/A"}
                </p>
                <p>
                  <strong>Admin:</strong> {profile.admin ? "Yes" : "No"}
                </p>
                <p>
                  <strong>Teams:</strong> {profile.teams ? JSON.stringify(profile.teams) : "N/A"}
                </p>
                <p>
                  <strong>Created At:</strong>{" "}
                  {profile.created_at ? new Date(profile.created_at).toLocaleString() : "N/A"}
                </p>
              </div>
              <div>
                <p className="font-semibold mb-2">Full Profile Object:</p>
                <pre className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded overflow-auto text-sm">
                  {JSON.stringify(profile, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <p className="text-zinc-500">No profile found in database</p>
          )}
        </section>

        <section className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-3">Claims</h2>
          {claims ? (
            <pre className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(claims, null, 2)}
            </pre>
          ) : (
            <p className="text-zinc-500">No claims available</p>
          )}
        </section>

        <section className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-3">Full User Object (from getUser)</h2>
          {user ? (
            <pre className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(user, null, 2)}
            </pre>
          ) : (
            <p className="text-zinc-500">No user data from getUser()</p>
          )}
        </section>

        {session?.user && (
          <section className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-3">Full User Object (from getSession)</h2>
            <pre className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(session.user, null, 2)}
            </pre>
          </section>
        )}

        <section className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-3">Full Session Object</h2>
          {session ? (
            <pre className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(session, null, 2)}
            </pre>
          ) : (
            <p className="text-zinc-500">No session data available</p>
          )}
        </section>

        <section className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-3">Cookie Information</h2>
          <div className="space-y-2">
            <p>
              <strong>Total Cookies:</strong> {allCookies.length}
            </p>
            <p>
              <strong>Supabase Auth Cookies:</strong>
            </p>
            <pre className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(
                allCookies
                  .filter(c => 
                    c.name.includes("supabase") || 
                    c.name.includes("sb-") || 
                    c.name.includes("auth")
                  )
                  .map(c => ({ 
                    name: c.name, 
                    hasValue: !!c.value, 
                    valueLength: c.value?.length,
                  })),
                null,
                2
              )}
            </pre>
          </div>
        </section>
      </div>

      <DebugInfo />
    </div>
  );
}

