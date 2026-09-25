"use client";

import { useMemo } from "react";
import { Manga } from "@/lib/types";
import { MangaCard } from "./manga-card";
import { RankCardSkeleton } from "@/components/shared/skeleton";

interface MangaRankRowProps {
  title: string;
  manga: Manga[];
  loading?: boolean;
}

export function MangaRankRow({ title, manga, loading }: MangaRankRowProps) {
  const uniqueManga = useMemo(() => {
    const seen = new Set<string>();
    return manga.filter((item) => {
      if (seen.has(item.slug)) return false;
      seen.add(item.slug);
      return true;
    });
  }, [manga]);

  if (loading) {
    return (
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-3 px-1">{title}</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 reader-hidden-scrollbar">
          {Array.from({ length: 6 }).map((_, i) => (
            <RankCardSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (uniqueManga.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="text-lg font-semibold mb-3 px-1">{title}</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 reader-hidden-scrollbar">
        {uniqueManga.map((m) => (
          <MangaCard key={m.slug} manga={m} layout="rank" showRank />
        ))}
      </div>
    </section>
  );
}
