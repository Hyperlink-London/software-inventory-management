'use client';
import { supabase } from "@/lib/supabaseClient";

export default function GitHubSignInButton() {
  async function handleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        scopes: "read:org user:email read:user",
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      alert(error.message);
    }
  }

  return (
    <button
      onClick={handleLogin}
      className="px-4 py-2 bg-zinc-900 text-white rounded hover:opacity-90"
    >
      Sign in with GitHub
    </button>
  );
}
