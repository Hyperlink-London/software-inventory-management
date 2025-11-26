import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";

export default async function Dashboard() {
  const supabase = await createClient(cookies());
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Middleware already handles auth redirects, so we can trust we have a session here
  return (
    <div className="p-6 space-y-5">
      <h1 className="text-3xl font-bold">
        {session ? `Welcome, ${session.user.user_metadata?.user_name || session.user.email}!` : 'Dashboard'}
      </h1>
      
      {session && (
        <p className="text-gray-600">
          Signed in as: {session.user.email}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/items" className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900">
          View Items
        </Link>

        <Link href="/add_edit" className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900">
          Add New Item
        </Link>
        
        {!session && (
          <Link href="/login" className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900">
            Sign In
          </Link>
        )}
      </div>
    </div>
  );
}
