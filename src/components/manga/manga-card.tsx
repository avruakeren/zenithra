"use client";

import Link from "next/link";
import Image from "next/image";
import { GlassBadge } from "@/components/ui/glass-badge";
import { Manga } from "@/lib/types";
import { Eye } from "lucide-react";

interface MangaCardProps {
  manga: Manga;
  layout?: "grid" | "list" | "rank";
  showRank?: boolean;
}

export function MangaCard({ manga, layout = "grid", showRank = false }: MangaCardProps) {
  const typeBadge = manga.type === "manhwa" ? "Manhwa" : manga.type === "manhua" ? "Manhua" : "Manga";

  if (layout === "rank") {
    return (
      <Link href={`/manga/${manga.slug}`} className="block">
        <div className="glass rounded-2xl p-2.5 w-28 shrink-0 transition-all duration-300 hover:scale-105 active:scale-95">
          <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-2">
            <Image
              src={manga.thumbnail}
              alt={manga.title}
              fill
              className="object-cover"
              sizes="112px"
            />
            {showRank && manga.rank && (
              <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-purple-600/90 backdrop-blur-sm flex items-center justify-center text-xs font-bold text-white">
                {manga.rank}
              </div>
            )}
          </div>
          <h3 className="text-xs font-medium line-clamp-2 leading-tight mb-1">{manga.title}</h3>
          <p className="text-[10px] text-text-muted">{manga.latestChapter}</p>
        </div>
      </Link>
    );
  }

  if (layout === "list") {
    return (
      <Link href={`/manga/${manga.slug}`} className="block">
        <div className="glass rounded-2xl p-3 flex gap-3 transition-all duration-300 hover:bg-white/[0.04] active:scale-[0.98]">
          <div className="relative w-16 h-22 rounded-lg overflow-hidden shrink-0">
            <Image
              src={manga.thumbnail}
              alt={manga.title}
              fill
              className="object-cover"
              sizes="64px"
            />
          </div>
          <div className="flex-1 min-w-0 py-0.5">
            <h3 className="text-sm font-medium line-clamp-1 mb-1">{manga.title}</h3>
            <p className="text-xs text-text-muted mb-2">{manga.genre}</p>
            <div className="flex items-center gap-2">
              <GlassBadge variant="accent">{manga.latestChapter}</GlassBadge>
              {manga.views && (
                <span className="text-[10px] text-text-dim flex items-center gap-1">
                  <Eye size={10} /> {manga.views}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/manga/${manga.slug}`} className="block">
      <div className="transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]">
        <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-2 glass">
          <Image
            src={manga.thumbnail}
            alt={manga.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 33vw, 200px"
          />
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-6">
            <GlassBadge variant="accent" className="text-[9px]">
              {manga.latestChapter}
            </GlassBadge>
          </div>
        </div>
        <h3 className="text-xs font-medium line-clamp-2 leading-tight mb-0.5">{manga.title}</h3>
        <p className="text-[10px] text-text-muted line-clamp-1">{manga.genre || typeBadge}</p>
      </div>
    </Link>
  );
}
