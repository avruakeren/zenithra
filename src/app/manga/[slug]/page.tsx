"use client";

import { useState, useEffect, useMemo, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { MangaDetail } from "@/lib/types";
import { ChapterList } from "@/components/manga/chapter-list";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassBadge } from "@/components/ui/glass-badge";
import { ChapterListSkeleton } from "@/components/shared/skeleton";
import { addBookmark, removeBookmark, isBookmarked, getHistory } from "@/lib/bookmark";
import { ArrowLeft, Bookmark, BookmarkCheck, ChevronDown, ChevronUp } from "lucide-react";

function parseChapterNumber(value: string): number {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function MangaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [manga, setManga] = useState<MangaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [lastReadChapter, setLastReadChapter] = useState<string | null>(null);
  const [showFullSynopsis, setShowFullSynopsis] = useState(false);

  const sortedChapters = useMemo(() => {
    if (!manga) return [];
    return [...manga.chapters].sort(
      (a, b) => parseChapterNumber(a.number) - parseChapterNumber(b.number)
    );
  }, [manga]);

  const firstChapter = sortedChapters[0];
  const latestChapter = sortedChapters[sortedChapters.length - 1];

  const readProgress = useMemo(() => {
    const latestNumber = parseChapterNumber(latestChapter?.number ?? "");
    if (!latestChapter || latestNumber <= 0) return null;

    const readNumber = parseChapterNumber(lastReadChapter ?? "");
    const percent = Math.min(100, Math.max(0, Math.round((readNumber / latestNumber) * 100)));

    return { percent, readNumber, latestNumber };
  }, [latestChapter, lastReadChapter]);

  useEffect(() => {
    async function fetchManga() {
      try {
        const res = await fetch(`/api/manga?slug=${slug}`);
        const data = await res.json();
        setManga(data);
        setBookmarked(isBookmarked(slug));
        setLastReadChapter(getHistory().find((h) => h.slug === slug)?.lastChapter ?? null);
      } catch (err) {
        console.error("Failed to fetch manga:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchManga();
  }, [slug]);

  const toggleBookmark = () => {
    if (!manga) return;
    if (bookmarked) {
      removeBookmark(slug);
      setBookmarked(false);
    } else {
      addBookmark({
        title: manga.title,
        slug: manga.slug,
        thumbnail: manga.thumbnail,
        genre: manga.genres[0] || "",
        type: manga.type as "manga" | "manhwa" | "manhua",
        latestChapter: latestChapter?.number || "",
        latestChapterSlug: latestChapter?.slug || "",
        url: `/manga/${slug}`,
      });
      setBookmarked(true);
    }
  };

  return (
    <main className="min-h-screen pb-24">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-40 glass-elevated safe-area-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
            <ArrowLeft size={16} />
          </Link>
          <h1 className="flex-1 text-sm font-medium truncate">
            {loading ? "Loading..." : manga?.title}
          </h1>
          <button
            onClick={toggleBookmark}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
          >
            {bookmarked ? <BookmarkCheck size={16} className="text-purple-400" /> : <Bookmark size={16} />}
          </button>
        </div>
      </div>

      <div className="pt-16">
        {loading ? (
          <div className="px-4 space-y-4">
            <div className="flex gap-4">
              <div className="skeleton w-32 h-44 rounded-xl shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="skeleton h-5 w-3/4" />
                <div className="skeleton h-4 w-1/2" />
                <div className="skeleton h-4 w-1/3" />
                <div className="flex gap-2">
                  <div className="skeleton h-5 w-16 rounded-full" />
                  <div className="skeleton h-5 w-16 rounded-full" />
                </div>
              </div>
            </div>
            <ChapterListSkeleton />
          </div>
        ) : manga ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4"
          >
            {/* Manga Info */}
            <div className="flex gap-4 mb-5">
              <div className="relative w-32 h-44 rounded-xl overflow-hidden shrink-0 glass">
                <Image
                  src={manga.thumbnail}
                  alt={manga.title}
                  fill
                  className="object-cover"
                  sizes="128px"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold leading-tight mb-2">{manga.title}</h1>
                {manga.alternativeTitle && (
                  <p className="text-xs text-text-dim mb-2">{manga.alternativeTitle}</p>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <GlassBadge variant="accent">{manga.type}</GlassBadge>
                  <GlassBadge>{manga.status}</GlassBadge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {manga.genres.slice(0, 4).map((g) => (
                    <GlassBadge key={g} variant="muted" className="text-[10px]">
                      {g}
                    </GlassBadge>
                  ))}
                </div>
              </div>
            </div>

            {/* Synopsis */}
            {manga.synopsis && (
              <div className="glass rounded-2xl p-4 mb-5">
                <h3 className="text-sm font-semibold mb-2">Sinopsis</h3>
                <p className={`text-xs text-text-muted leading-relaxed ${!showFullSynopsis ? "line-clamp-3" : ""}`}>
                  {manga.synopsis}
                </p>
                {manga.synopsis.length > 150 && (
                  <button
                    onClick={() => setShowFullSynopsis(!showFullSynopsis)}
                    className="text-xs text-purple-400 mt-2 flex items-center gap-1"
                  >
                    {showFullSynopsis ? (
                      <>Lebih sedikit <ChevronUp size={12} /></>
                    ) : (
                      <>Selengkapnya <ChevronDown size={12} /></>
                    )}
                  </button>
                )}
              </div>
            )}

            {readProgress && (
              <div className="glass rounded-2xl p-4 mb-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">Progres Baca</h3>
                  <span className="text-sm font-mono font-semibold text-purple-300">
                    {readProgress.percent}%
                  </span>
                </div>
                <div
                  className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={readProgress.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-purple-500 transition-[width] duration-500"
                    style={{ width: `${readProgress.percent}%` }}
                  />
                </div>
                <p className="text-xs text-text-muted mt-2">
                  {readProgress.readNumber > 0
                    ? `Chapter ${readProgress.readNumber} dari ${readProgress.latestNumber}`
                    : "Belum dibaca"}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 mb-5">
              {firstChapter && (
                <Link
                  href={`/manga/${slug}/${firstChapter.slug}`}
                  className="flex-1"
                >
                  <GlassButton variant="accent" className="w-full">
                    Baca dari Awal
                  </GlassButton>
                </Link>
              )}
              {latestChapter && (
                <Link
                  href={`/manga/${slug}/${latestChapter.slug}`}
                  className="flex-1"
                >
                  <GlassButton className="w-full">
                    Chapter Terbaru
                  </GlassButton>
                </Link>
              )}
            </div>

            {/* Chapter List */}
            <section>
              <h2 className="text-sm font-semibold mb-3 text-text-muted">
                Daftar Chapter ({manga.chapters.length})
              </h2>
              <ChapterList chapters={manga.chapters} mangaSlug={slug} />
            </section>
          </motion.div>
        ) : (
          <div className="px-4 text-center py-20">
            <p className="text-text-muted">Manga tidak ditemukan</p>
          </div>
        )}
      </div>
    </main>
  );
}
