"use client";

import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import { BookOpen, History } from "lucide-react";
import { cleanMangaTitle, timeAgo } from "@/lib/utils";

export interface LastReadItem {
  title: string;
  slug: string;
  thumbnail: string;
  lastChapter: string;
  readAt: number;
}

interface LastReadRowProps {
  items: LastReadItem[];
  now: number;
}

export function LastReadRow({ items, now }: LastReadRowProps) {
  if (items.length === 0 || now === 0) return null;

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <History size={16} className="text-text-muted" />
        <h2 className="text-lg font-semibold">Terakhir Dibaca</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 reader-hidden-scrollbar">
        {items.map((item) => (
          <Link
            key={item.slug}
            href={`/manga/${item.slug}`}
            className="block w-28 shrink-0 transition-transform duration-200 active:scale-95"
          >
            <div className="relative aspect-[3/4] rounded-xl overflow-hidden surface mb-2">
              {item.thumbnail ? (
                <SafeImage
                  src={item.thumbnail}
                  alt={item.title}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-dim">
                  <BookOpen size={20} />
                </div>
              )}
            </div>
            <h3 className="text-xs font-medium line-clamp-2 leading-tight mb-1">
              {cleanMangaTitle(item.title)}
            </h3>
            <p className="text-[10px] text-purple-300">Chapter {item.lastChapter}</p>
            <p className="text-[10px] text-text-dim">{timeAgo(item.readAt, now)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

