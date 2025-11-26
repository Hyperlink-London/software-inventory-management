"use client";
import { createClient } from "@/utils/supabase/client";

export default function GitHubSignInButton() {
  async function handleLogin() {
    const supabase = createClient();
    
    console.log("Starting GitHub OAuth...");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        scopes: "read:org read:user user:email",
        redirectTo: `${window.location.origin}/auth/callback`,
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
      className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[200px]"
    >
      <span>Sign in with GitHub</span>
    </button>
  );
}
