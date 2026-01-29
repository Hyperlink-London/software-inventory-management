import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const redirectTo = searchParams.get("redirect_to") || "/";

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
          });
        },
      },
    }
  );

  // OAuth provider returned an error
  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${error}`, request.url));
  }

  // No code provided
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", request.url));
  }

  // Exchange code for session - this will set cookies via setAll callback
  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, request.url)
    );
  }

  if (!data?.session) {
    return NextResponse.redirect(new URL("/login?error=no_session", request.url));
  }

  const session = data.session;
  const user = data.user;

  // Try to get GitHub token - prefer provider_token, but check if we can use access_token
  const githubToken = session.provider_token || 
    (session.user?.app_metadata?.provider === 'github' ? session.access_token : null);

  if (githubToken && user?.id) {
    try {
      // Fetch user's teams from GitHub API
      const githubOrg = process.env.GITHUB_ORG_NAME;
      
      if (githubOrg) {
        const teamsResponse = await fetch("https://api.github.com/user/teams", {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        });

        if (teamsResponse.ok) {
          const teams = await teamsResponse.json();
          
          // Filter teams for the specified organization
          const orgTeams = teams
            .filter((team: any) => team.organization?.login?.toLowerCase() === githubOrg.toLowerCase())
            .map((team: any) => team.slug);

          // Update or create profile with teams
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("supabase_uid", user.id)
            .maybeSingle();

          // Extract full name from user metadata
          const fullName = 
            user.user_metadata?.full_name ||
            user.user_metadata?.display_name ||
            user.user_metadata?.name ||
            user.user_metadata?.user_name ||
            user.user_metadata?.preferred_username ||
            user.email?.split("@")[0] ||
            `user_${user.id.slice(0, 6)}`;

          if (existingProfile) {
            // Update existing profile with teams and full name
            await supabase
              .from("profiles")
              .update({ teams: orgTeams, full_name: fullName })
              .eq("id", existingProfile.id);
          } else {
            // Profile will be created elsewhere, but we can try to create it here if needed
            const username = user.user_metadata?.user_name || 
                            user.user_metadata?.preferred_username || 
                            user.email?.split("@")[0] || 
                            `user_${user.id.slice(0, 6)}`;
            
            await supabase
              .from("profiles")
              .insert({
                supabase_uid: user.id,
                username,
                full_name: fullName,
                email: user.email,
                teams: orgTeams,
                admin: false,
              });
          }
        }
      }
    } catch {
      // Don't fail the auth flow if team fetch fails
    }
  }

  // Update profile with full_name for all users (not just GitHub)
  if (user?.id) {
    try {
      // Extract full name from user metadata
      const fullName = 
        user.user_metadata?.full_name ||
        user.user_metadata?.display_name ||
        user.user_metadata?.name ||
        user.user_metadata?.user_name ||
        user.user_metadata?.preferred_username ||
        user.email?.split("@")[0] ||
        `user_${user.id.slice(0, 6)}`;

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("supabase_uid", user.id)
        .maybeSingle();

      if (existingProfile) {
        // Update full_name if it's different or null
        if (existingProfile.full_name !== fullName) {
          await supabase
            .from("profiles")
            .update({ full_name: fullName })
            .eq("id", existingProfile.id);
        }
      } else {
        // Create profile if it doesn't exist (for non-GitHub logins)
        const username = user.user_metadata?.user_name || 
                        user.user_metadata?.preferred_username || 
                        user.email?.split("@")[0] || 
                        `user_${user.id.slice(0, 6)}`;
        
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            supabase_uid: user.id,
            username,
            full_name: fullName,
            email: user.email,
            admin: false,
          });
        
        if (insertError) {
          // If the error is about the column not existing, try without full_name
          if (insertError.message?.includes("column") && insertError.message?.includes("full_name")) {
            // Try inserting without full_name
            await supabase
              .from("profiles")
              .insert({
                supabase_uid: user.id,
                username,
                email: user.email,
                admin: false,
              });
          }
        }
      }
    } catch {
      // Don't fail the auth flow if profile update fails
    }
  }

  return response;
}
