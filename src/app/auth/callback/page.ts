import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AuthCallback({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string; error_description?: string }>;
}) {
  const supabase = await createClient(cookies());
  const params = await searchParams;

  console.log("Auth callback received:", {
    code: !!params.code,
    error: params.error,
    error_description: params.error_description,
  });

  // OAuth provider returned an error
  if (params.error) {
    console.error("OAuth error:", params.error, params.error_description);
    redirect(`/login?error=${params.error}`);
  }

  // No code provided
  if (!params.code) {
    console.error("No OAuth code received");
    redirect("/login?error=no_code");
  }

  // Exchange code for session
  const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);

  if (error) {
    console.error("Session exchange failed:", error);
    redirect("/login?error=session_exchange_failed");
  }

  if (!data?.session) {
    console.error("No session created");
    redirect("/login?error=no_session");
  }

  // ✅ Session successfully created, middleware will handle profile + claims
  redirect("/"); // your dashboard/root page
}
