"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/LogoutButton";

export default function Navbar() {
  return (
    <header className="w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold text-foreground hover:opacity-80 transition-opacity">
          Hyperlink Inventory
        </Link>
        <nav className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/">Dashboard</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/items">Inventory</Link>
          </Button>
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}


