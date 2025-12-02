"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/LogoutButton";
import { useUser } from "@/contexts/UserContext";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const { user } = useUser();
  const [username, setUsername] = React.useState<string | null>(null);
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    async function fetchUsername() {
      if (!user?.id) {
        setUsername(null);
        return;
      }

      const supabase = createClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("supabase_uid", user.id)
        .is("deleted_at", null)
        .single();

      setUsername(profile?.username || null);
    }

    fetchUsername();
  }, [user?.id]);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-500 ease-in-out",
        isScrolled
          ? "py-2"
          : "py-3 border-b border-border"
      )}
    >
      <div
        className={cn(
          "mx-auto transition-all duration-500 ease-in-out",
          isScrolled
            ? "max-w-3xl px-8 py-3 rounded-full bg-background/95 backdrop-blur-md border border-border shadow-lg"
            : "w-full max-w-6xl px-4 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        )}
      >
        <div
          className={cn(
            "flex items-center transition-all duration-500",
            "justify-between gap-3"
          )}
        >
          <Link
            href="/"
            className="text-lg font-semibold text-foreground hover:opacity-80 transition-opacity"
          >
            Hyperlink Inventory
          </Link>
          <nav className="flex items-center gap-3 flex-1 justify-center">
            <Button variant="ghost" size="sm" asChild className={isScrolled ? "h-9 px-4" : ""}>
              <Link href="/">Dashboard</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className={isScrolled ? "h-9 px-4" : ""}>
              <Link href="/items">Inventory</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className={isScrolled ? "h-9 px-4" : ""}>
              <Link href="/checkouts">Checkouts</Link>
            </Button>
          </nav>
          {username && (
            <div className="group relative flex items-center">
              <span
                className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-accent"
              >
                {username}
              </span>
              <div className="absolute right-0 top-full mt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="bg-popover border rounded-md shadow-md p-1">
                  <LogoutButton />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
