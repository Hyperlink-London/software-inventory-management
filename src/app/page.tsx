import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Dashboard</h1>
      <p className="text-zinc-600 dark:text-zinc-400">Placeholder dashboard page.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/items" className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900">
          View Items
        </Link>
        <Link href="/add_edit" className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900">
          Add New Item
        </Link>
      </div>
    </div>
  );
}
