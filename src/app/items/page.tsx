import Link from "next/link";

export default function ItemsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Items</h1>
      <p className="text-zinc-600 dark:text-zinc-400">Placeholder for table of all items.</p>
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Coming soon: items table</p>
      </div>
      <Link href="/add_edit" className="inline-block rounded-md bg-zinc-900 text-white px-4 py-2 text-sm dark:bg-zinc-100 dark:text-zinc-900">Add Item</Link>
    </div>
  );
}


