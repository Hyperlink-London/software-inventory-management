"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { LogoutButton } from "@/components/LogoutButton";

export default function Navbar() {
  const { user } = useAuth();
  return (
    <header className="w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-black/70 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Software Inventory
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {user &&
            <LogoutButton></LogoutButton>
          }
          <Link href="/items" className="text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white">
            Items
          </Link>
          <Link href="/add_edit" className="text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white">
            Add Item
          </Link>
        </nav>
      </div>
    </header>
  );
}


