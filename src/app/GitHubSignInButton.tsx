"use client";
import { createClient } from "@/utils/supabase/client";
import { Github } from "lucide-react";

export default function GitHubSignInButton() {
  async function handleLogin() {
    const supabase = createClient();
    // Get redirect_to from URL params if present
    const urlParams = new URLSearchParams(window.location.search);
    const redirectTo = urlParams.get("redirect_to") || "/";
    
    console.log("Starting GitHub OAuth...");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        scopes: "read:org read:user user:email",
        redirectTo: `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent(redirectTo)}`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error("Login error:", error);
      alert(error.message);
    } else {
      console.log("OAuth initiated successfully");
    }
  }

  return (
    <button
      onClick={handleLogin}
      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-base font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#24292F] h-10 px-6 py-2 bg-[#24292F] hover:bg-[#1f2327] text-white shadow-lg"
    >
      <Github className="h-5 w-5" />
      <span>Sign in with GitHub</span>
    </button>
  );
}
