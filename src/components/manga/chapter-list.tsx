"use client";

import Link from "next/link";
import { Chapter } from "@/lib/types";
import { formatElapsedTime } from "@/lib/utils";
import { BookOpen, CheckCheck, Clock } from "lucide-react";

interface ChapterListProps {
  chapters: Chapter[];
  mangaSlug: string;
  readChapters?: string[];
  currentSlug?: string | null;
}

function chapterNumberValue(value: string): number {
  const parsed = parseFloat(
    value.replace(/^chapter\s*/i, "").replace(/^ch\s*/i, "")
  );
  return Number.isFinite(parsed) ? parsed : 0;
}

export function ChapterList({
  chapters,
  mangaSlug,
  readChapters = [],
  currentSlug = null,
}: ChapterListProps) {
  if (chapters.length === 0) {
    return (
      <div className="surface rounded-2xl p-8 text-center">
        <BookOpen size={32} className="mx-auto mb-3 text-text-dim" />
        <p className="text-sm text-text-muted">Belum ada chapter</p>
      </div>
    );
  }

  const readSet = new Set(
    readChapters
      .map((number) => chapterNumberValue(number))
      .filter((number) => number > 0)
  );

  return (
    <div className="space-y-2">
      {chapters.map((ch) => {
        const numberValue = chapterNumberValue(ch.number);
        const isRead = numberValue > 0 && readSet.has(numberValue);
        const isCurrent = !!currentSlug && currentSlug === ch.slug;
        const elapsed = ch.uploadDate ? formatElapsedTime(ch.uploadDate) : null;

        return (
          <Link
            key={ch.slug}
            href={`/manga/${mangaSlug}/${ch.slug}`}
            className="block"
          >
            <div
              className={`surface rounded-xl px-4 py-3 flex items-center gap-3 transition-all duration-200 hover:bg-white/[0.06] active:scale-[0.98] ${
                isRead ? "opacity-60" : ""
              } ${isCurrent ? "border-l-2 border-purple-500" : ""}`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isRead ? "bg-white/5" : "bg-purple-500/10"
                }`}
              >
                <span
                  className={`text-xs font-bold ${
                    isRead ? "text-text-dim" : "text-purple-400"
                  }`}
                >
                  {ch.number.replace("Chapter ", "").replace("Ch ", "")}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm truncate ${
                    isRead ? "font-normal text-text-dim" : "font-medium"
                  }`}
                >
                  Chapter {ch.number}
                </p>
                {ch.title && (
                  <p className="text-xs text-text-muted truncate">{ch.title}</p>
                )}
                {isCurrent && (
                  <p className="text-[10px] text-purple-400 mt-0.5">Dilanjut</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {isRead && (
                  <CheckCheck
                    size={14}
                    className="text-emerald-400/70"
                    aria-label="Sudah dibaca"
                  />
                )}
                {ch.uploadDate && (
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[10px] text-text-dim flex items-center gap-1">
                      <Clock size={10} />
                      {ch.uploadDate}
                    </span>
                    {elapsed && (
                      <span className="text-[10px] text-text-dim opacity-70">
                        {elapsed}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
