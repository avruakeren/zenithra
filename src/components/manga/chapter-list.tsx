"use client";

import Link from "next/link";
import { Chapter } from "@/lib/types";
import { BookOpen, Clock } from "lucide-react";

interface ChapterListProps {
  chapters: Chapter[];
  mangaSlug: string;
}

export function ChapterList({ chapters, mangaSlug }: ChapterListProps) {
  if (chapters.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <BookOpen size={32} className="mx-auto mb-3 text-text-dim" />
        <p className="text-sm text-text-muted">Belum ada chapter</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {chapters.map((ch) => (
        <Link
          key={ch.slug}
          href={`/manga/${mangaSlug}/${ch.slug}`}
          className="block"
        >
          <div className="glass rounded-xl px-4 py-3 flex items-center gap-3 transition-all duration-200 hover:bg-white/[0.04] active:scale-[0.98]">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-purple-400">
                {ch.number.replace("Chapter ", "").replace("Ch ", "")}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                Chapter {ch.number}
              </p>
              {ch.title && (
                <p className="text-xs text-text-muted truncate">{ch.title}</p>
              )}
            </div>
            {ch.uploadDate && (
              <span className="text-[10px] text-text-dim shrink-0 flex items-center gap-1">
                <Clock size={10} />
                {ch.uploadDate}
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
