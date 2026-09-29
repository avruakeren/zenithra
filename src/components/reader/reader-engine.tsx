"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSwipeGesture } from "./touch-gesture";
import { Chapter, ChapterPages, ReadingSettings } from "@/lib/types";
import { ChevronLeft, ChevronRight, ChevronDown, Check, Search, Settings, List, ArrowLeft, X } from "lucide-react";

function ChapterEndNav({
  chapter,
  mangaSlug,
}: {
  chapter: ChapterPages;
  mangaSlug: string;
}) {
  const hasPrev = Boolean(chapter.prevChapter);
  const hasNext = Boolean(chapter.nextChapter);

  if (!hasPrev && !hasNext) {
    return (
      <div className="mt-8 mb-4 safe-area-bottom">
        <Link
          href={`/manga/${mangaSlug}`}
          className="block glass-elevated rounded-2xl px-4 py-3.5 text-center text-sm font-medium"
        >
          Kembali ke Detail Manga
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 mb-4 safe-area-bottom flex gap-2">
      {hasPrev && (
        <Link
          href={`/manga/${mangaSlug}/${chapter.prevChapter}`}
          className="flex-1 glass rounded-2xl px-4 py-3.5 text-center text-sm font-medium"
        >
          ← Prev Ch
        </Link>
      )}
      {hasNext && (
        <Link
          href={`/manga/${mangaSlug}/${chapter.nextChapter}`}
          className="flex-1 glass-elevated rounded-2xl px-4 py-3.5 text-center text-sm font-medium text-purple-200"
        >
          Next →
        </Link>
      )}
    </div>
  );
}

interface ReaderEngineProps {
  chapter: ChapterPages;
  mangaSlug: string;
  currentChapterSlug: string;
  initialPage: number;
  settings: ReadingSettings;
  onSettingsChange: (settings: Partial<ReadingSettings>) => void;
}

export function ReaderEngine({
  chapter,
  mangaSlug,
  currentChapterSlug,
  initialPage,
  settings,
  onSettingsChange,
}: ReaderEngineProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [showUI, setShowUI] = useState(true);
  const [direction, setDirection] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showChapterList, setShowChapterList] = useState(false);
  const [chapterList, setChapterList] = useState<Chapter[] | null>(null);
  const [chapterListFailed, setChapterListFailed] = useState(false);
  const [chapterPickerOpen, setChapterPickerOpen] = useState(false);
  const [chapterQuery, setChapterQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const chapterListBoxRef = useRef<HTMLDivElement>(null);
  const activeRowRef = useRef<HTMLButtonElement>(null);

  const totalPages = chapter.pages.length;
  const isRTL = settings.mode === "manga";
  const isScroll = settings.mode === "webtoon";

  const chapterListLoading = showChapterList && !chapterList && !chapterListFailed;
  const sortedChapterList = useMemo(
    () =>
      chapterList
        ? [...chapterList].sort(
            (a, b) => (parseFloat(a.number) || 0) - (parseFloat(b.number) || 0)
          )
        : [],
    [chapterList]
  );

  const filteredChapters = useMemo(() => {
    const query = chapterQuery.trim().toLowerCase();
    if (!query) return sortedChapterList;
    return sortedChapterList.filter((ch) => ch.number.toLowerCase().includes(query));
  }, [sortedChapterList, chapterQuery]);

  const currentChapterNumber =
    sortedChapterList.find((ch) => ch.slug === currentChapterSlug)?.number ??
    chapter.chapterNumber;

  const closeChapterPicker = useCallback(() => {
    setChapterPickerOpen(false);
    setChapterQuery("");
  }, []);

  useEffect(() => {
    if (!chapterPickerOpen) return;
    const box = chapterListBoxRef.current;
    const active = activeRowRef.current;
    if (!box || !active) return;
    box.scrollTop = Math.max(
      0,
      active.offsetTop - box.clientHeight / 2 + active.offsetHeight / 2
    );
  }, [chapterPickerOpen, filteredChapters]);

  useEffect(() => {
    if (!chapterPickerOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeChapterPicker();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [chapterPickerOpen, closeChapterPicker]);

  useEffect(() => {
    if (!showChapterList || chapterList || chapterListFailed) return;

    let cancelled = false;
    fetch(`/api/manga?slug=${encodeURIComponent(mangaSlug)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("gagal"))))
      .then((data: { chapters?: Chapter[] }) => {
        if (!cancelled) setChapterList(data.chapters ?? []);
      })
      .catch(() => {
        if (!cancelled) setChapterListFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [showChapterList, chapterList, chapterListFailed, mangaSlug]);

  const goNext = useCallback(() => {
    if (currentPage < totalPages - 1) {
      setDirection(isRTL ? -1 : 1);
      setCurrentPage(p => p + 1);
      return;
    }

    router.push(
      chapter.nextChapter
        ? `/manga/${mangaSlug}/${chapter.nextChapter}`
        : `/manga/${mangaSlug}`
    );
  }, [currentPage, totalPages, isRTL, router, chapter.nextChapter, mangaSlug]);

  const goPrev = useCallback(() => {
    if (currentPage > 0) {
      setDirection(isRTL ? 1 : -1);
      setCurrentPage(p => p - 1);
      return;
    }

    router.push(
      chapter.prevChapter
        ? `/manga/${mangaSlug}/${chapter.prevChapter}?from=prev`
        : `/manga/${mangaSlug}`
    );
  }, [currentPage, isRTL, router, chapter.prevChapter, mangaSlug]);

  const { onTouchStart, onTouchEnd } = useSwipeGesture({
    onSwipeLeft: isScroll ? () => undefined : isRTL ? goPrev : goNext,
    onSwipeRight: isScroll ? () => undefined : isRTL ? goNext : goPrev,
    onDoubleTapCenter: () => setShowUI((visible) => !visible),
    enabled: !showSettings && !showChapterList,
  });

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (isScroll) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        if (isRTL) goPrev();
        else goNext();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        if (isRTL) goNext();
        else goPrev();
      } else if (e.key === "Escape") {
        setShowUI(v => !v);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isRTL, isScroll, goNext, goPrev]);

  // Auto-hide UI
  useEffect(() => {
    if (!showUI || showSettings || showChapterList) return;
    const timer = setTimeout(() => setShowUI(false), 3000);
    return () => clearTimeout(timer);
  }, [showUI, showSettings, showChapterList]);

  // Save reading progress
  useEffect(() => {
    const key = `zenithra_progress_${mangaSlug}`;
    localStorage.setItem(key, JSON.stringify({
      chapterSlug: totalPages > 0 ? window.location.pathname.split("/").pop() : "",
      page: currentPage,
      total: totalPages,
      timestamp: Date.now(),
    }));
  }, [currentPage, totalPages, mangaSlug]);

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({
      x: dir > 0 ? "-100%" : "100%",
      opacity: 0,
    }),
  };

  return (
    <div
      ref={containerRef}
      className="reader-page reader-shell z-50 bg-[#050208] flex flex-col"
      style={{ filter: `brightness(${settings.brightness})` }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top Bar */}
      <AnimatePresence>
        {showUI && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute top-0 left-0 right-0 z-50 safe-area-top"
          >
            <div className="glass-elevated mx-3 mt-3 rounded-2xl px-4 py-3 flex items-center gap-3">
              <Link
                href={`/manga/${mangaSlug}`}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
              >
                <ArrowLeft size={16} />
              </Link>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-muted truncate">{chapter.title}</p>
                <p className="text-sm font-medium">
                  Chapter {chapter.chapterNumber} · {currentPage + 1}/{totalPages}
                </p>
              </div>
              <button
                onClick={() => setShowChapterList(true)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
              >
                <Settings size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 z-[60] h-0.5 bg-white/5">
        <motion.div
          className="h-full bg-purple-500"
          animate={{ width: `${((currentPage + 1) / totalPages) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Reader Content */}
      {isScroll ? (
        /* Webtoon Mode - Vertical Scroll */
        <div className="flex-1 overflow-y-auto reader-hidden-scrollbar">
          <div className="w-full max-w-2xl mx-auto">
            {chapter.pages.map((page, i) => (
              <div key={i} className="w-full" style={{ marginBottom: settings.gap }}>
                <img
                  src={page}
                  alt={`Page ${i + 1}`}
                  className="w-full h-auto"
                  loading={i < 3 ? "eager" : "lazy"}
                />
              </div>
            ))}
            <ChapterEndNav chapter={chapter} mangaSlug={mangaSlug} />
          </div>
        </div>
      ) : (
        /* Page Mode - Manga/Comic */
        <div className="flex-1 relative overflow-hidden">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={currentPage}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="absolute inset-0 flex items-center justify-center p-2"
            >
              <img
                src={chapter.pages[currentPage]}
                alt={`Page ${currentPage + 1}`}
                className="max-h-full max-w-full object-contain"
                draggable={false}
              />
            </motion.div>
          </AnimatePresence>

          {/* Tap Zones (when UI is hidden) */}
          {!showUI && (
            <div className="absolute inset-0 z-40 flex">
              <button
                onClick={isRTL ? goNext : goPrev}
                className="w-1/3 h-full"
                aria-label={isRTL ? "Selanjutnya" : "Sebelumnya"}
              />
              <button
                onDoubleClick={() => setShowUI(true)}
                className="w-1/3 h-full"
                aria-label="Tampilkan navigasi"
              />
              <button
                onClick={isRTL ? goPrev : goNext}
                className="w-1/3 h-full"
                aria-label={isRTL ? "Sebelumnya" : "Selanjutnya"}
              />
            </div>
          )}
        </div>
      )}

      {/* Bottom Bar */}
      <AnimatePresence>
        {showUI && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-0 left-0 right-0 z-50 safe-area-bottom"
          >
            <div className="glass-elevated mx-3 mb-3 rounded-2xl px-4 py-3 flex items-center gap-2">
              {!isScroll && (
                <>
                  <button
                    onClick={isRTL ? goNext : goPrev}
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"
                    aria-label={isRTL ? "Selanjutnya" : "Sebelumnya"}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-sm font-mono font-medium text-text-muted">
                      {currentPage + 1} / {totalPages}
                    </span>
                  </div>
                  <button
                    onClick={isRTL ? goPrev : goNext}
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"
                    aria-label={isRTL ? "Sebelumnya" : "Selanjutnya"}
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
              {isScroll && (
                <div className="w-full text-center py-1">
                  <span className="text-xs font-mono text-text-muted">
                    {totalPages} halaman
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full glass-elevated rounded-t-3xl p-6 safe-area-bottom"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-6" />
              <h3 className="text-lg font-semibold mb-5">Pengaturan Baca</h3>

              {/* Reading Mode */}
              <div className="mb-5">
                <label className="text-xs text-text-muted mb-2 block">Gaya Baca</label>
                <div className="flex gap-2">
                  {([
                    { value: "manga", label: "Manga", desc: "Kanan → Kiri" },
                    { value: "comic", label: "Komik", desc: "Kiri → Kanan" },
                    { value: "webtoon", label: "Webtoon", desc: "Scroll Vertikal" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => onSettingsChange({ mode: opt.value })}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-center transition-all duration-300",
                        settings.mode === opt.value
                          ? "bg-purple-600/20 border border-purple-500/30 text-purple-300"
                          : "bg-white/5 border border-white/5 text-text-muted"
                      )}
                    >
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-[10px] mt-0.5 opacity-60">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Brightness */}
              <div className="mb-5">
                <label className="text-xs text-text-muted mb-2 block">
                  Kecerahan · {Math.round(settings.brightness * 100)}%
                </label>
                <input
                  type="range"
                  min="0.3"
                  max="1.5"
                  step="0.05"
                  value={settings.brightness}
                  onChange={(e) => onSettingsChange({ brightness: parseFloat(e.target.value) })}
                  className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-purple-500"
                />
              </div>

              {/* Fit Mode */}
              <div className="mb-5">
                <label className="text-xs text-text-muted mb-2 block">Mode Fit</label>
                <div className="flex gap-2">
                  {(["width", "height", "auto"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => onSettingsChange({ fitMode: mode })}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl text-sm transition-all duration-300",
                        settings.fitMode === mode
                          ? "bg-purple-600/20 border border-purple-500/30 text-purple-300"
                          : "bg-white/5 border border-white/5 text-text-muted"
                      )}
                    >
                      {mode === "width" ? "Lebar" : mode === "height" ? "Tinggi" : "Auto"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Page Gap */}
              <div className="mb-5">
                <label className="text-xs text-text-muted mb-2 block">
                  Jarak Halaman · {settings.gap}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="32"
                  step="4"
                  value={settings.gap}
                  onChange={(e) => onSettingsChange({ gap: parseInt(e.target.value) })}
                  className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-purple-500"
                />
              </div>

              {/* Page Number Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm">Nomor Halaman</span>
                <button
                  onClick={() => onSettingsChange({ showPageNumber: !settings.showPageNumber })}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all duration-300",
                    settings.showPageNumber ? "bg-purple-600" : "bg-white/10"
                  )}
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full bg-white transition-transform duration-300",
                      settings.showPageNumber ? "translate-x-6" : "translate-x-0.5"
                    )}
                  />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chapter List Panel */}
      <AnimatePresence>
        {showChapterList && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end"
            onClick={() => setShowChapterList(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-h-[85vh] glass-elevated rounded-t-3xl p-6 safe-area-bottom"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4" />
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Daftar Chapter</h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Chapter {chapter.chapterNumber}
                  </p>
                </div>
                <button
                  onClick={() => setShowChapterList(false)}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
                  aria-label="Tutup daftar chapter"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2">
                {chapter.prevChapter && (
                  <Link
                    href={`/manga/${mangaSlug}/${chapter.prevChapter}`}
                    className="block glass rounded-xl px-4 py-3 text-center text-purple-400 hover:bg-purple-500/10"
                  >
                    ← Chapter Sebelumnya
                  </Link>
                )}
                <div className="glass-elevated rounded-xl px-4 py-3 text-center text-sm font-medium text-purple-300">
                  Chapter {chapter.chapterNumber}
                </div>
                {chapter.nextChapter && (
                  <Link
                    href={`/manga/${mangaSlug}/${chapter.nextChapter}`}
                    className="block glass rounded-xl px-4 py-3 text-center text-purple-400 hover:bg-purple-500/10"
                  >
                    Chapter Selanjutnya →
                  </Link>
                )}
              </div>

              <div className="h-px bg-white/10 my-4" />

              {chapterListLoading && (
                <div className="flex items-center justify-center py-10">
                  <div className="w-7 h-7 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin" />
                </div>
              )}

              {chapterListFailed && (
                <div className="text-center py-8">
                  <p className="text-sm text-text-muted mb-3">
                    Gagal memuat daftar chapter.
                  </p>
                  <button
                    onClick={() => {
                      setChapterListFailed(false);
                      setChapterList(null);
                    }}
                    className="glass-button px-4 py-2 rounded-full text-xs"
                  >
                    Coba Lagi
                  </button>
                </div>
              )}

              {sortedChapterList.length > 0 && (
                <div>
                  <span className="text-xs text-text-dim block mb-2">
                    Pilih chapter · {sortedChapterList.length} chapter
                  </span>
                  <div className="relative">
                    {chapterPickerOpen && (
                      <div
                        className="absolute inset-0 z-[75]"
                        onClick={closeChapterPicker}
                        aria-hidden="true"
                      />
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        chapterPickerOpen ? closeChapterPicker() : setChapterPickerOpen(true)
                      }
                      className="relative z-[80] w-full flex items-center justify-between gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-left active:scale-[0.99] transition-transform"
                      aria-haspopup="listbox"
                      aria-expanded={chapterPickerOpen}
                    >
                      <span className="text-sm font-medium">
                        Chapter {currentChapterNumber}
                      </span>
                      <ChevronDown
                        size={16}
                        className={cn(
                          "shrink-0 text-text-muted transition-transform duration-200",
                          chapterPickerOpen && "rotate-180"
                        )}
                      />
                    </button>

                    {chapterPickerOpen && (
                      <div className="absolute left-0 right-0 bottom-full mb-2 z-[80] glass-elevated rounded-2xl overflow-hidden shadow-2xl">
                        <div className="flex items-center gap-2 border-b border-white/10 px-3">
                          <Search size={14} className="shrink-0 text-text-dim" />
                          <input
                            value={chapterQuery}
                            onChange={(e) => setChapterQuery(e.target.value)}
                            placeholder="Cari chapter..."
                            className="w-full bg-transparent py-3 text-sm text-foreground placeholder:text-text-dim outline-none"
                          />
                        </div>

                        <div
                          ref={chapterListBoxRef}
                          role="listbox"
                          className="max-h-[38vh] overflow-y-auto reader-hidden-scrollbar p-1.5"
                        >
                          {filteredChapters.length === 0 ? (
                            <p className="px-3 py-6 text-center text-xs text-text-dim">
                              Tidak ada chapter cocok
                            </p>
                          ) : (
                            filteredChapters.map((ch) => {
                              const isActive = ch.slug === currentChapterSlug;
                              return (
                                <button
                                  key={ch.slug}
                                  ref={isActive ? activeRowRef : undefined}
                                  type="button"
                                  role="option"
                                  aria-selected={isActive}
                                  onClick={() => {
                                    if (isActive) {
                                      closeChapterPicker();
                                      return;
                                    }
                                    router.push(`/manga/${mangaSlug}/${ch.slug}`);
                                    closeChapterPicker();
                                  }}
                                  className={cn(
                                    "w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                                    isActive
                                      ? "bg-purple-600/25 text-purple-100"
                                      : "text-text-muted active:bg-white/5"
                                  )}
                                >
                                  <span>Chapter {ch.number}</span>
                                  {isActive && <Check size={14} className="shrink-0" />}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
