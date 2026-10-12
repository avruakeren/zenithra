"use client";

import { useMemo, useState } from "react";
import { Manga } from "@/lib/types";
import { MangaCard } from "./manga-card";
import { MangaGridSkeleton } from "@/components/shared/skeleton";

interface MangaGridProps {
  title?: string;
  manga: Manga[];
  loading?: boolean;
  /** Kartu yang dirender sebelum tombol "Tampilkan lainnya" muncul. */
  limit?: number;
  /** Sembunyikan sisanya di balik tombol expand (lokal, tanpa fetch). */
  expandable?: boolean;
}

export function MangaGrid({ title, manga, loading, limit, expandable }: MangaGridProps) {
  const [expanded, setExpanded] = useState(false);

  const uniqueManga = useMemo(() => {
    const seen = new Set<string>();
    return manga.filter((item) => {
      if (seen.has(item.slug)) return false;
      seen.add(item.slug);
      return true;
    });
  }, [manga]);

  const hiddenCount = limit ? Math.max(0, uniqueManga.length - limit) : 0;
  const visibleManga =
    limit && !expanded ? uniqueManga.slice(0, limit) : uniqueManga;

  if (loading) {
    return (
      <section className="mb-6">
        {title && <h2 className="text-lg font-semibold mb-3 px-1">{title}</h2>}
        <MangaGridSkeleton />
      </section>
    );
  }

  if (uniqueManga.length === 0) return null;

  return (
    <section className="mb-6">
      {title && <h2 className="text-lg font-semibold mb-3 px-1">{title}</h2>}
      <div className="grid grid-cols-3 gap-3">
        {visibleManga.map((m) => (
          <MangaCard key={m.slug} manga={m} layout="grid" />
        ))}
      </div>
      {expandable && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded((value) => !value)}
          className="mt-3 mx-auto block px-4 py-2 rounded-full bg-white/5 border border-white/5 text-xs font-medium text-text-muted hover:bg-white/10 hover:text-text transition-colors"
        >
          {expanded ? "Tampilkan lebih sedikit" : "Tampilkan lainnya"}
        </button>
      )}
    </section>
  );
}
