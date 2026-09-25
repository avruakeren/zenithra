"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { MangaDetail } from "@/lib/types";
import { ChapterList } from "@/components/manga/chapter-list";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassBadge } from "@/components/ui/glass-badge";
import { ChapterListSkeleton } from "@/components/shared/skeleton";
import { addBookmark, removeBookmark, isBookmarked } from "@/lib/bookmark";
import { ArrowLeft, Bookmark, BookmarkCheck, ChevronDown, ChevronUp } from "lucide-react";

export default function MangaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [manga, setManga] = useState<MangaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [showFullSynopsis, setShowFullSynopsis] = useState(false);

  useEffect(() => {
    async function fetchManga() {
      try {
        const res = await fetch(`/api/manga?slug=${slug}`);
        const data = await res.json();
        setManga(data);
        setBookmarked(isBookmarked(slug));
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
        latestChapter: manga.chapters[0]?.number || "",
        latestChapterSlug: manga.chapters[0]?.slug || "",
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

            {/* Action Buttons */}
            <div className="flex gap-2 mb-5">
              {manga.chapters.length > 0 && (
                <Link
                  href={`/manga/${slug}/${manga.chapters[0].slug}`}
                  className="flex-1"
                >
                  <GlassButton variant="accent" className="w-full">
                    Baca dari Awal
                  </GlassButton>
                </Link>
              )}
              {manga.chapters.length > 0 && (
                <Link
                  href={`/manga/${slug}/${manga.chapters[manga.chapters.length - 1].slug}`}
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
