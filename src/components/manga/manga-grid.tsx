"use client";

import { useMemo } from "react";
import { Manga } from "@/lib/types";
import { MangaCard } from "./manga-card";
import { MangaGridSkeleton } from "@/components/shared/skeleton";

interface MangaGridProps {
  title: string;
  manga: Manga[];
  loading?: boolean;
}

export function MangaGrid({ title, manga, loading }: MangaGridProps) {
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
        <MangaGridSkeleton />
      </section>
    );
  }

  if (uniqueManga.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="text-lg font-semibold mb-3 px-1">{title}</h2>
      <div className="grid grid-cols-3 gap-3">
        {uniqueManga.map((m) => (
          <MangaCard key={m.slug} manga={m} layout="grid" />
        ))}
      </div>
    </section>
  );
}
