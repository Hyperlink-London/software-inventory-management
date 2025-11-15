'use client';
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        // User is logged in
        console.log("User session:", data.session);
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    }

    handleCallback();
  }, [router]);

  return <p>Processing login…</p>;
}
