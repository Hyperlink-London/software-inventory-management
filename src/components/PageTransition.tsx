"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = React.useState(children);
  const [isAnimating, setIsAnimating] = React.useState(false);

  React.useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => {
      setDisplayChildren(children);
      // Small delay before showing to ensure smooth transition
      setTimeout(() => {
        setIsAnimating(false);
      }, 50);
    }, 200);

    return () => clearTimeout(timer);
  }, [pathname]);

  React.useEffect(() => {
    if (!isAnimating) {
      setDisplayChildren(children);
    }
  }, [children, isAnimating]);

  return (
    <div
      className={cn(
        "transition-all duration-500 ease-out",
        isAnimating
          ? "opacity-0 translate-y-6"
          : "opacity-100 translate-y-0 page-enter"
      )}
    >
      {displayChildren}
    </div>
  );
}

