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

