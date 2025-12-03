"use server";

import { createClient } from "@/utils/supabase/server";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { encodedRedirect } from "@/utils/utils";

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const redirectTo = formData.get("redirect_to")?.toString();

  const supabase = await createClient(cookies());

  if (!email || !password) {
    return encodedRedirect("error", "/login", "Email and password are required");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/login", error.message);
  }

  // Verify session was created
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (!user) {
    return encodedRedirect("error", "/login", "Failed to create session");
  }

  // Redirect to the original destination or dashboard
  const targetUrl = redirectTo || "/";
  return redirect(`${targetUrl}?refresh=true`);
};

export const signOutAction = async () => {
  const supabase = await createClient(cookies());
  await supabase.auth.signOut();
  return redirect("/login");
};

export const signInWithGitHubAction = async (formData: FormData) => {
  const supabase = await createClient(cookies());
  const origin = (await headers()).get("origin");

  const redirectTo = formData.get("redirect_to")?.toString() || "/";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${origin}/auth/callback?redirect_to=${encodeURIComponent(redirectTo)}`,
      scopes: "read:org read:user user:email",
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    return encodedRedirect("error", "/login", error.message);
  }

  return redirect(data.url);
};

export const signInWithGoogleAction = async (formData: FormData) => {
  const supabase = await createClient(cookies());
  const origin = (await headers()).get("origin");

  const redirectTo = formData.get("redirect_to")?.toString() || "/";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?redirect_to=${encodeURIComponent(redirectTo)}`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    return encodedRedirect("error", "/login", error.message);
  }

  return redirect(data.url);
};

export const signInWithLinkedInAction = async (formData: FormData) => {
  const supabase = await createClient(cookies());
  const origin = (await headers()).get("origin");

  const redirectTo = formData.get("redirect_to")?.toString() || "/";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "linkedin_oidc",
    options: {
      redirectTo: `${origin}/auth/callback?redirect_to=${encodeURIComponent(redirectTo)}`,
    },
  });

  if (error) {
    return encodedRedirect("error", "/login", error.message);
  }

  return redirect(data.url);
};

