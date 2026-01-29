import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient(cookies());

  // Sign out from Supabase - this clears the session
  await supabase.auth.signOut({ scope: "global" });

  // Redirect to login page
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"), {
    status: 302,
  });
}

export async function GET() {
  const supabase = await createClient(cookies());

  // Sign out from Supabase - this clears the session
  await supabase.auth.signOut({ scope: "global" });

  // Redirect to login page
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"), {
    status: 302,
  });
}
