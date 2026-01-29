"use client";

import { useUser } from "@/contexts/UserContext";

export default function DebugInfo() {
  const { user, session, loading } = useUser();

  return (
    <section className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-3">Client-Side Context Info</h2>
      <div className="space-y-2">
        <p>
          <strong>Loading:</strong> {loading ? "Yes" : "No"}
        </p>
        <p>
          <strong>User from Context:</strong> {user ? user.email : "Not available"}
        </p>
        <p>
          <strong>Session from Context:</strong> {session ? "Active" : "Not available"}
        </p>
        {user && (
          <div className="mt-4">
            <p className="font-semibold mb-2">User Object (Client):</p>
            <pre className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
        )}
        {session && (
          <div className="mt-4">
            <p className="font-semibold mb-2">Session Object (Client):</p>
            <pre className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </section>
  );
}




