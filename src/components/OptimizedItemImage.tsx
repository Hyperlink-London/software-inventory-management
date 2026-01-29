"use client";

import * as React from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const sizeConfig = {
  xs: { w: 48, h: 48, q: 60, sizes: "48px" },
  sm: { w: 64, h: 64, q: 60, sizes: "64px" },
  md: { w: 80, h: 80, q: 60, sizes: "80px" },
  lg: { w: 96, h: 96, q: 60, sizes: "96px" },
  xl: { w: 128, h: 128, q: 65, sizes: "128px" },
} as const;

export function OptimizedItemImage({
  src,
  alt,
  size = "xs",
  className,
}: {
  src: string;
  alt: string;
  size?: keyof typeof sizeConfig;
  className?: string;
}) {
  const c = sizeConfig[size];
  return (
    <Image
      src={src}
      alt={alt}
      width={c.w}
      height={c.h}
      sizes={c.sizes}
      quality={c.q}
      className={cn("object-cover rounded-md", className)}
    />
  );
}

export function OptimizedPreviewImage({
  src,
  alt,
  containerClassName,
}: {
  src: string;
  alt: string;
  containerClassName?: string;
}) {
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => setLoading(true), [src]);
  return (
    <div
      className={cn(
        "relative w-full min-h-[50vh] flex items-center justify-center",
        containerClassName
      )}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-md">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, 768px"
        quality={75}
        className="object-contain rounded-md"
        onLoad={() => setLoading(false)}
      />
    </div>
  );
}
