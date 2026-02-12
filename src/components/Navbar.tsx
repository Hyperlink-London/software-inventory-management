"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/LogoutButton";
import { useUser } from "@/contexts/UserContext";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ChevronDown,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";

export default function Navbar() {
  const { user } = useUser();
  const [fullName, setFullName] = React.useState<string | null>(null);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    async function fetchFullName() {
      if (!user?.id) {
        setFullName(null);
        return;
      }

      // Get full name from user metadata first
      let fullName = 
        user.user_metadata?.full_name ||
        user.user_metadata?.display_name ||
        user.user_metadata?.name ||
        null;

      // If no full name from metadata, fall back to username from profiles table
      if (!fullName) {
        const supabase = createClient();
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("supabase_uid", user.id)
          .is("deleted_at", null)
          .single();

        fullName = profile?.username || 
                   user.user_metadata?.user_name ||
                   user.user_metadata?.preferred_username ||
                   user.email?.split("@")[0] ||
                   null;
      }

      setFullName(fullName);
    }

    fetchFullName();
  }, [user?.id, user?.user_metadata, user?.email]);

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
        "sticky top-0 z-50 transition-all duration-500 ease-in-out overflow-visible",
        isScrolled
          ? "py-2"
          : "py-3 border-b border-border"
      )}
    >
      <div
        className={cn(
          "mx-auto transition-all duration-500 ease-in-out",
          isScrolled
            ? "max-w-3xl px-4 sm:px-8 py-3 rounded-full bg-background/95 backdrop-blur-md border border-border shadow-lg"
            : "w-full max-w-6xl px-3 sm:px-4 bg-transparent"
        )}
      >
        <div
          className={cn(
            "flex items-center transition-all duration-500",
            "justify-between gap-2 sm:gap-3"
          )}
        >
          <Link
            href="/"
            className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg font-semibold text-foreground hover:opacity-80 transition-opacity"
          >
            <Image
              src="/hyperlink_logo.png"
              alt="Hyperlink Logo"
              width={160}
              height={40}
              className="h-8 sm:h-10 w-auto object-contain"
              priority
            />
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-3 flex-1 justify-center">
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

          {/* Mobile & Desktop User Menu */}
          {fullName && (
            <>
              {/* Desktop: Hover dropdown */}
              <div className="hidden md:block group relative flex items-center">
                <span
                  className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-accent"
                >
                  {fullName}
                </span>
                <div className="absolute right-0 top-full mt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[60]">
                  <div className="bg-popover border rounded-md shadow-md p-1 min-w-[180px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="justify-start w-full"
                    >
                      <Link href="/settings">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </Button>
                    <div className="border-t border-border my-1" />
                    <LogoutButton />
                  </div>
                </div>
              </div>

              {/* Mobile: Bell + Popover dropdown with all links */}
              <div className="flex items-center gap-1">
                <NotificationBell />
              <Popover open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden flex items-center gap-1.5 px-2 sm:px-3 h-9"
                  >
                    <span className="text-sm font-medium truncate max-w-[100px] sm:max-w-none">
                      {fullName}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  align="end" 
                  className="w-56 p-2 z-[60]"
                  sideOffset={8}
                >
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="justify-start w-full"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Link href="/">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="justify-start w-full"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Link href="/settings">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="justify-start w-full"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Link href="/items">
                        <Package className="mr-2 h-4 w-4" />
                        Inventory
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="justify-start w-full"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Link href="/checkouts">
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Checkouts
                      </Link>
                    </Button>
                    <div className="border-t border-border my-1" />
                    <div className="px-2">
                      <LogoutButton />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
