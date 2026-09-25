"use client";

import { useState, useEffect, useCallback, use } from "react";
import { ReaderEngine } from "@/components/reader/reader-engine";
import { ChapterPages, ReadingSettings } from "@/lib/types";
import { getReadingSettings, setReadingSettings, addToHistory } from "@/lib/bookmark";
import { BookOpen } from "lucide-react";

export default function ChapterReaderPage({
  params,
}: {
  params: Promise<{ slug: string; chapter: string }>;
}) {
  const { slug, chapter } = use(params);
  const [chapterData, setChapterData] = useState<ChapterPages | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettingsState] = useState<ReadingSettings>(getReadingSettings());

  const handleSettingsChange = useCallback((partial: Partial<ReadingSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...partial };
      setReadingSettings(partial);
      return next;
    });
  }, []);

  useEffect(() => {
    async function fetchChapter() {
      try {
        const res = await fetch(`/api/chapter?slug=${chapter}`);
        if (!res.ok) throw new Error("Chapter not found");
        const data: ChapterPages = await res.json();
        setChapterData(data);

        // Save to history
        addToHistory(
          {
            title: data.title,
            slug,
            thumbnail: "",
            genre: "",
            type: "manga",
            latestChapter: data.chapterNumber,
            latestChapterSlug: chapter,
            url: `/manga/${slug}`,
          },
          chapter,
          data.chapterNumber
        );
      } catch (err) {
        setError("Gagal memuat chapter. Coba lagi nanti.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchChapter();
  }, [slug, chapter]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#050208] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-sm text-text-muted">Memuat chapter...</p>
        </div>
      </div>
    );
  }

  if (error || !chapterData) {
    return (
      <div className="fixed inset-0 z-50 bg-[#050208] flex items-center justify-center px-8">
        <div className="text-center glass rounded-2xl p-8">
          <BookOpen size={40} className="mx-auto mb-4 text-text-dim" />
          <p className="text-sm text-text-muted mb-4">{error || "Chapter tidak ditemukan"}</p>
          <button
            onClick={() => window.location.reload()}
            className="glass-button px-6 py-2.5 rounded-full text-sm"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <ReaderEngine
      chapter={chapterData}
      mangaSlug={slug}
      settings={settings}
      onSettingsChange={handleSettingsChange}
    />
  );
}
