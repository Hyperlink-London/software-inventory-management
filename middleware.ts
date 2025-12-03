import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)).*)",
  ],
};

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData ?? null;

  const pathname = req.nextUrl.pathname;
  console.log("🌐 Middleware running on:", pathname); // ✅ log the route

  const publicPaths = ["/login", "/auth/callback"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  if (!claims && !isPublic) {
    console.log("🔒 No claims, redirecting to login");
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (claims) {
    console.log("✅ Claims found:", claims.claims); // ✅ log the claims object
    const supabaseUid = claims.claims?.sub ?? null;

    if (supabaseUid) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("supabase_uid", supabaseUid)
        .maybeSingle();

      console.log("📌 Existing profile:", profile); // ✅ log existing profile

      // if (!profile) {
      //   const username =
      //     claims.claims?.user_metadata?.user_name ??
      //     claims.claims?.user_metadata?.preferred_username ??
      //     `user_${supabaseUid.slice(0, 6)}`;

      //   console.log("➕ Inserting new profile for:", username); // ✅ log insertion

      //   await supabase.from("profiles").insert({
      //     supabase_uid: supabaseUid,
      //     username,
      //     admin: false,
      //     deleted_at: null,
      //   });
      // }
    }
  }

  return res;
}
