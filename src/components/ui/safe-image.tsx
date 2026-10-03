"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

// Keep in sync with the allowlist in next.config.ts. Anything not listed here
// is NOT passed to next/image (which would throw at render time) — it renders
// as a plain <img> instead, so a new CDN host cannot crash the page.
const KNOWN_HOSTS = [
  "thumbnail.komiku.to",
  "thumbnail.komiku.org",
  "komiku.org",
  "komiku.to",
];

function isKnownHost(host: string): boolean {
  if (KNOWN_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return true;
  if (host === "media-amazon.com" || host.endsWith(".media-amazon.com")) return true;
  if (host === "gstatic.com" || host.endsWith(".gstatic.com")) return true;
  return false;
}

export function isNextImageSafe(src: string): boolean {
  try {
    return isKnownHost(new URL(src, "https://komiku.org").hostname);
  } catch {
    return false;
  }
}

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
}

export function SafeImage({
  src,
  alt,
  className,
  sizes,
  fill,
  width,
  height,
  priority,
}: SafeImageProps) {
  if (isNextImageSafe(src)) {
    if (fill) {
      return (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={className}
        />
      );
    }
    return (
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        priority={priority}
        className={className}
      />
    );
  }

  // Unknown host: render a plain <img> so the page never crashes. The
  // element box matches next/image so layout stays identical.
  if (fill) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={cn("absolute inset-0 h-full w-full", className)}
      />
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      width={width}
      height={height}
      className={className}
    />
  );
}
