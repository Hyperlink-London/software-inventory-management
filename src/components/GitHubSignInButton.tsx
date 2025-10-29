"use client";

import { useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export default function GitHubSignInButton() {
  const handleSignIn = useCallback(async () => {
    const supabase = createClient();
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}` : undefined;
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo,
      },
    });
  }, []);

  return (
    <button
      type="button"
      onClick={handleSignIn}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[200px]"
    >
      <span>Sign in with GitHub</span>
    </button>
  );
}


