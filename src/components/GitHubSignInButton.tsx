"use client"

import { supabase } from "@/lib/supabaseClient"
import { Github } from 'lucide-react';

export default function GithubSignInButton() {
  const handleGithubLogin = async () => {
    // initiate GitHub OAuth login flow
    const { error } = await supabase.auth.signInWithOAuth({ provider: "github" })
    if (error) {
      console.error("GitHub sign-in error:", error);
      
      alert("Could not start the GitHub login process. See console for details.");
    }
  }

  // html button to trigger GitHub login
  return (
    <button
        onClick={handleGithubLogin}
        className="
          inline-flex items-center justify-center gap-2
          whitespace-nowrap rounded-lg text-base font-semibold
          ring-offset-background transition-colors 
          focus-visible:outline-none focus-visible:ring-2 
          focus-visible:ring-offset-2 focus-visible:ring-[#24292F]
          h-10 px-6 py-2 
          bg-[#24292F] hover:bg-[#1f2327] 
          text-white shadow-lg
        "
    >
        <Github className="h-5 w-5" />
        Sign in with GitHub
    </button>
  )
}
