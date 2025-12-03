import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const redirectTo = searchParams.get("redirect_to") || "/";

  console.log("Auth callback received:", {
    code: !!code,
    error,
    error_description: errorDescription,
    redirect_to: redirectTo,
  });

  // Create response that will be used for redirect
  const redirectUrl = new URL(redirectTo.includes("?") 
    ? `${redirectTo}&refresh=true` 
    : `${redirectTo}?refresh=true`, 
    request.url
  );
  const response = NextResponse.redirect(redirectUrl);

  // Create Supabase client that writes cookies to the response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
            console.log(`Setting cookie in redirect response: ${name}`, {
              hasValue: !!value,
              valueLength: value?.length,
              httpOnly: options?.httpOnly,
              secure: options?.secure,
              sameSite: options?.sameSite,
              path: options?.path,
            });
          });
        },
      },
    }
  );

  // OAuth provider returned an error
  if (error) {
    console.error("OAuth error:", error, errorDescription);
    return NextResponse.redirect(new URL(`/login?error=${error}`, request.url));
  }

  // No code provided
  if (!code) {
    console.error("No OAuth code received");
    return NextResponse.redirect(new URL("/login?error=no_code", request.url));
  }

  // Exchange code for session - this will set cookies via setAll callback
  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("Session exchange failed:", exchangeError);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, request.url)
    );
  }

  if (!data?.session) {
    console.error("No session created");
    return NextResponse.redirect(new URL("/login?error=no_session", request.url));
  }

  // Log session information
  const session = data.session;
  const user = data.user;
  console.log("Session created successfully:", {
    session: {
      access_token: session.access_token ? `${session.access_token.substring(0, 20)}...` : null,
      refresh_token: session.refresh_token ? `${session.refresh_token.substring(0, 20)}...` : null,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
      token_type: session.token_type,
      provider_token: session.provider_token ? `${session.provider_token.substring(0, 20)}...` : null,
      provider_refresh_token: session.provider_refresh_token ? "present" : null,
    },
    user: {
      id: user?.id,
      email: user?.email,
      phone: user?.phone,
      app_metadata: user?.app_metadata,
      user_metadata: user?.user_metadata,
      aud: user?.aud,
      created_at: user?.created_at,
      confirmed_at: user?.confirmed_at,
      last_sign_in_at: user?.last_sign_in_at,
      role: user?.role,
    },
  });

  // Fetch and store GitHub team membership
  console.log("Checking for provider_token:", {
    hasProviderToken: !!session.provider_token,
    providerTokenLength: session.provider_token?.length,
    hasAccessToken: !!session.access_token,
    userId: user?.id,
    provider: session.user?.app_metadata?.provider,
  });

  // Try to get GitHub token - prefer provider_token, but check if we can use access_token
  const githubToken = session.provider_token || 
    (session.user?.app_metadata?.provider === 'github' ? session.access_token : null);

  if (githubToken && user?.id) {
    try {
      // Fetch user's teams from GitHub API
      const githubOrg = process.env.GITHUB_ORG_NAME;
      console.log("GitHub org name from env:", githubOrg ? "✅ Set" : "❌ Not set");
      
      if (githubOrg) {
        console.log("Fetching teams from GitHub API...");
        const teamsResponse = await fetch("https://api.github.com/user/teams", {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        });

        console.log("GitHub API response:", {
          status: teamsResponse.status,
          statusText: teamsResponse.statusText,
          ok: teamsResponse.ok,
        });

        if (teamsResponse.ok) {
          const teams = await teamsResponse.json();
          console.log(`Received ${teams.length} total teams from GitHub:`, teams.map((t: any) => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
            org: t.organization?.login,
          })));
          
          // Filter teams for the specified organization
          const orgTeams = teams
            .filter((team: any) => team.organization?.login?.toLowerCase() === githubOrg.toLowerCase())
            .map((team: any) => team.slug);

          console.log(`Found ${orgTeams.length} teams for org ${githubOrg}:`, orgTeams);

          // Update or create profile with teams
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("supabase_uid", user.id)
            .maybeSingle();

          if (existingProfile) {
            // Update existing profile with teams
            const { error: updateError } = await supabase
              .from("profiles")
              .update({ teams: orgTeams })
              .eq("id", existingProfile.id);
            
            if (updateError) {
              console.error("Failed to update profile with teams:", updateError);
              // If the error is about the column not existing, log a helpful message
              if (updateError.message?.includes("column") && updateError.message?.includes("teams")) {
                console.error("⚠️ The 'teams' column does not exist in the profiles table. Please run the migration: migrations/add_teams_to_profiles.sql");
              }
            } else {
              console.log("✅ Updated profile with teams:", orgTeams);
            }
          } else {
            // Profile will be created elsewhere, but we can try to create it here if needed
            const username = user.user_metadata?.user_name || 
                            user.user_metadata?.preferred_username || 
                            user.email?.split("@")[0] || 
                            `user_${user.id.slice(0, 6)}`;
            
            const { error: insertError } = await supabase
              .from("profiles")
              .insert({
                supabase_uid: user.id,
                username,
                email: user.email,
                teams: orgTeams,
                admin: false,
              });
            
            if (insertError) {
              console.error("Failed to create profile with teams:", insertError);
              // If the error is about the column not existing, log a helpful message
              if (insertError.message?.includes("column") && insertError.message?.includes("teams")) {
                console.error("⚠️ The 'teams' column does not exist in the profiles table. Please run the migration: migrations/add_teams_to_profiles.sql");
              }
            } else {
              console.log("✅ Created profile with teams:", orgTeams);
            }
          }
        } else {
          const errorText = await teamsResponse.text();
          console.error("❌ Failed to fetch GitHub teams:", {
            status: teamsResponse.status,
            statusText: teamsResponse.statusText,
            error: errorText,
          });
          
          // Common error: 401 Unauthorized - token might not have the right scopes
          if (teamsResponse.status === 401) {
            console.error("⚠️ Authentication failed. Make sure 'read:org' scope is requested in OAuth.");
          }
          // Common error: 403 Forbidden - token might not have permissions
          if (teamsResponse.status === 403) {
            console.error("⚠️ Access forbidden. The token might not have 'read:org' permission or the user might not be part of the organization.");
          }
        }
      } else {
        console.warn("⚠️ GITHUB_ORG_NAME environment variable not set, skipping team fetch");
        console.warn("   Please set GITHUB_ORG_NAME in your .env.local file");
      }
    } catch (error) {
      console.error("❌ Error fetching GitHub teams:", error);
      if (error instanceof Error) {
        console.error("   Error message:", error.message);
        console.error("   Error stack:", error.stack);
      }
      // Don't fail the auth flow if team fetch fails
    }
  } else {
    if (!githubToken) {
      console.warn("⚠️ No GitHub token available in session. Teams cannot be fetched.");
      console.warn("   This might happen if:");
      console.warn("   1. The OAuth provider is not configured to return provider_token");
      console.warn("   2. The Supabase project needs to be configured to store provider tokens");
      console.warn("   3. Check Supabase Dashboard → Authentication → Providers → GitHub");
      console.warn("   4. The user needs to re-authenticate with the correct scopes");
      console.warn("   5. See TROUBLESHOOTING_TEAMS.md for more details");
    }
    if (!user?.id) {
      console.warn("⚠️ No user ID available. Cannot fetch teams.");
    }
  }

  // Log cookies that will be sent in the redirect response
  const cookiesInResponse = response.cookies.getAll();
  console.log("Cookies in redirect response:", {
    total: cookiesInResponse.length,
    authCookies: cookiesInResponse
      .filter(c => 
        c.name.includes("supabase") || 
        c.name.includes("sb-") || 
        c.name.includes("auth")
      )
      .map(c => ({ 
        name: c.name, 
        hasValue: !!c.value,
        valueLength: c.value?.length 
      }))
  });

  return response;
}

