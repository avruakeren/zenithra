"use client";

import { useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type Transition, type Variants } from "framer-motion";
import { cn, READER_CANVAS, formatElapsedTime } from "@/lib/utils";
import { useSwipeGesture } from "./touch-gesture";
import { Chapter, ChapterPages, ReadingSettings } from "@/lib/types";
import { getReadChapters, markChapterRead } from "@/lib/bookmark";
import { ChevronLeft, ChevronRight, ChevronDown, Check, Search, Settings, List, ArrowLeft, X } from "lucide-react";

// Cache daftar chapter per manga (per sesi). Dipakai buat indikator
// "Ch. x/y" di bar bawah dan buat panel daftar chapter.
const chapterListCache = new Map<string, Chapter[]>();

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
          className="block surface-elevated rounded-2xl px-4 py-3.5 text-center text-sm font-medium"
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
          className="flex-1 surface rounded-2xl px-4 py-3.5 text-center text-sm font-medium flex items-center justify-center gap-1.5"
        >
          <ChevronLeft size={14} />
          Prev Ch
        </Link>
      )}
      {hasNext && (
        <Link
          href={`/manga/${mangaSlug}/${chapter.nextChapter}`}
          className="flex-1 surface-elevated rounded-2xl px-4 py-3.5 text-center text-sm font-medium text-purple-200 flex items-center justify-center gap-1.5"
        >
          Next Ch
          <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}

// ===== Settings panel primitives =====
// Satu sumber styling buat seluruh isi sheet pengaturan, biar pola label
// dan state aktif/nonaktif seragam antar kontrol.

const SEG_ACTIVE = "bg-purple-600/20 border border-purple-500/30 text-purple-300";
const SEG_IDLE = "bg-white/5 border border-white/5 text-text-muted";

function SettingSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-2 pt-4 border-t border-white/5 first:mt-0 first:pt-0 first:border-t-0">
      <h4 className="text-[10px] uppercase tracking-[0.15em] text-text-dim mb-3">
        {title}
      </h4>
      {children}
    </section>
  );
}

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  desc?: ReactNode;
  swatch?: string;
}

function SettingSegmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="mb-5">
      <label className="text-xs text-text-muted mb-2 block">{label}</label>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 py-2.5 rounded-xl flex flex-col items-center justify-center transition-all duration-300",
              value === opt.value ? SEG_ACTIVE : SEG_IDLE
            )}
          >
            {opt.swatch && (
              <span
                className="w-3.5 h-3.5 rounded-full border border-white/25 mb-1"
                style={{ backgroundColor: opt.swatch }}
              />
            )}
            <p className="text-sm font-medium">{opt.label}</p>
            {opt.desc && (
              <p className="text-[10px] mt-0.5 opacity-60 flex items-center justify-center gap-1">
                {opt.desc}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function SettingToggle({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc?: ReactNode;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <span className="text-sm">{label}</span>
        {desc && (
          <p className="text-[10px] text-text-dim mt-0.5 flex items-center gap-1">{desc}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!value)}
        aria-pressed={value}
        className={cn(
          "w-12 h-6 rounded-full transition-all duration-300 shrink-0",
          value ? "bg-purple-600" : "bg-white/10"
        )}
      >
        <div
          className={cn(
            "w-5 h-5 rounded-full bg-white transition-transform duration-300",
            value ? "translate-x-6" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}

function SettingSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="mb-5">
      <label className="text-xs text-text-muted mb-2 block">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-purple-500"
      />
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
  const [chapterList, setChapterList] = useState<Chapter[] | null>(
    () => chapterListCache.get(mangaSlug) ?? null
  );
  const [chapterListFailed, setChapterListFailed] = useState(false);
  const [chapterPickerOpen, setChapterPickerOpen] = useState(false);
  const [chapterQuery, setChapterQuery] = useState("");
  const [readChapters, setReadChapters] = useState<string[]>([]);
  const [chapterFilter, setChapterFilter] = useState<"all" | "unread">("all");
  const [chapterSort, setChapterSort] = useState<"asc" | "desc">("asc");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const pageContentRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const pinchRef = useRef<{
    dist: number;
    cx: number;
    cy: number;
    zoom: number;
    panX: number;
    panY: number;
    centerX: number;
    centerY: number;
  } | null>(null);
  const panTrackRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);
  const chapterListBoxRef = useRef<HTMLDivElement>(null);
  const activeRowRef = useRef<HTMLButtonElement>(null);

  const totalPages = chapter.pages.length;
  const isRTL = settings.mode === "manga";
  const isScroll = settings.mode === "webtoon";
  // Arah zona ketuk kiri/kanan (bisa dibalik buat kidal / tangan kiri).
  const leftIsNext = settings.flipTap ? !isRTL : isRTL;

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

  // Saat daftar terisi, hidrasi log chapter yang sudah dibuka tanpa setState sync di body effect.
  useEffect(() => {
    if (!chapterList) return;
    const hydrate = window.setTimeout(() => {
      try {
        setReadChapters(getReadChapters(mangaSlug, chapterList));
      } catch {
        setReadChapters([]);
      }
    }, 0);
    return () => window.clearTimeout(hydrate);
  }, [chapterList, mangaSlug]);

  const normalizeChapterNumberForSort = (value: string) => {
    const number = parseFloat((value || "").replace(/[^\d.]/g, ""));
    return Number.isFinite(number) ? number : 0;
  };

  const filteredChapters = useMemo(() => {
    const query = chapterQuery.trim().toLowerCase();
    const readSet = new Set(readChapters);
    const sorted = [...sortedChapterList].sort((a, b) => {
      const diff =
        normalizeChapterNumberForSort(a.number) - normalizeChapterNumberForSort(b.number);
      return chapterSort === "desc" ? -diff : diff;
    });
    return sorted.filter((ch) => {
      if (query && !ch.number.toLowerCase().includes(query)) return false;
      if (chapterFilter === "unread" && readSet.has(ch.number)) return false;
      return true;
    });
  }, [sortedChapterList, chapterQuery, chapterSort, chapterFilter, readChapters]);

  const currentChapterNumber =
    sortedChapterList.find((ch) => ch.slug === currentChapterSlug)?.number ??
    chapter.chapterNumber;

  const latestChapterNumber = sortedChapterList.length
    ? sortedChapterList[sortedChapterList.length - 1].number
    : "";

  const chapterProgressLabel =
    latestChapterNumber && latestChapterNumber !== currentChapterNumber
      ? `Ch. ${currentChapterNumber}/${latestChapterNumber}`
      : `Ch. ${currentChapterNumber}`;

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
    if (chapterList || chapterListFailed) return;

    let cancelled = false;
    fetch(`/api/manga?slug=${encodeURIComponent(mangaSlug)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("gagal"))))
      .then((data: { chapters?: Chapter[] }) => {
        const chapters = data.chapters ?? [];
        chapterListCache.set(mangaSlug, chapters);
        if (!cancelled) setChapterList(chapters);
      })
      .catch(() => {
        if (!cancelled) setChapterListFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [chapterList, chapterListFailed, mangaSlug]);

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
    onSwipeLeft: isScroll || zoom > 1 ? () => undefined : isRTL ? goPrev : goNext,
    onSwipeRight: isScroll || zoom > 1 ? () => undefined : isRTL ? goNext : goPrev,
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

  // Reset zoom + pan saat pindah halaman / ganti mode supaya nggak nyangkut.
  const [resetKey, setResetKey] = useState(`${currentPage}-${isScroll}`);
  const nextResetKey = `${currentPage}-${isScroll}`;
  if (nextResetKey !== resetKey) {
    setResetKey(nextResetKey);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  // Mirror zoom/pan ke ref — biar touch handler manual (detached listener)
  // selalu baca nilai terbaru tanpa re-attach listener.
  useEffect(() => {
    zoomRef.current = zoom;
    panRef.current = pan;
  }, [zoom, pan]);

  // Pinch-to-zoom (2 jari) + pan 1 jari saat zoom aktif — Manga/Komik doang.
  // Webtoon skip: vertikal scroll, prefetch nggak butuh zoom.
  useEffect(() => {
    const el = pageContentRef.current;
    if (!el || isScroll) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const [a, b] = [e.touches[0], e.touches[1]];
        const rect = imgRef.current?.getBoundingClientRect();
        pinchRef.current = {
          dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
          cx: (a.clientX + b.clientX) / 2,
          cy: (a.clientY + b.clientY) / 2,
          zoom: zoomRef.current,
          panX: panRef.current.x,
          panY: panRef.current.y,
          centerX: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
          centerY: rect ? rect.top + rect.height / 2 : window.innerHeight / 2,
        };
        panTrackRef.current = null;
      } else if (e.touches.length === 1 && zoomRef.current > 1) {
        panTrackRef.current = {
          sx: e.touches[0].clientX,
          sy: e.touches[0].clientY,
          px: panRef.current.x,
          py: panRef.current.y,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (pinchRef.current && e.touches.length === 2) {
        e.preventDefault();
        const [a, b] = [e.touches[0], e.touches[1]];
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const cx = (a.clientX + b.clientX) / 2;
        const cy = (a.clientY + b.clientY) / 2;
        const k = dist / pinchRef.current.dist;
        const nextZoom = Math.min(4, Math.max(1, pinchRef.current.zoom * k));
        if (nextZoom <= 1) {
          zoomRef.current = 1;
          setZoom(1);
          panRef.current = { x: 0, y: 0 };
          setPan({ x: 0, y: 0 });
          return;
        }
        const ratio = nextZoom / pinchRef.current.zoom;
        const nx =
          cx - pinchRef.current.centerX + pinchRef.current.panX -
          ratio * (pinchRef.current.cx - pinchRef.current.centerX);
        const ny =
          cy - pinchRef.current.centerY + pinchRef.current.panY -
          ratio * (pinchRef.current.cy - pinchRef.current.centerY);
        zoomRef.current = nextZoom;
        setZoom(nextZoom);
        panRef.current = { x: nx, y: ny };
        setPan({ x: nx, y: ny });
      } else if (panTrackRef.current && e.touches.length === 1 && zoomRef.current > 1) {
        e.preventDefault();
        const nx = panTrackRef.current.px + (e.touches[0].clientX - panTrackRef.current.sx);
        const ny = panTrackRef.current.py + (e.touches[0].clientY - panTrackRef.current.sy);
        panRef.current = { x: nx, y: ny };
        setPan({ x: nx, y: ny });
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchRef.current = null;
      if (e.touches.length === 0) panTrackRef.current = null;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [isScroll]);

  // Preload every page in the current chapter (in page order) so paging feels
  // instant. Manga/comic only — webtoon renders and lazy-loads all images in
  // the DOM already, so it doesn't need this prefetch.
  useEffect(() => {
    if (isScroll || totalPages === 0) return;

    let cancelled = false;
    let index = 0;

    const loadOne = (url: string) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = url;
      });

    const worker = async () => {
      while (index < chapter.pages.length && !cancelled) {
        const url = chapter.pages[index++];
        await loadOne(url);
      }
    };

    // Two workers run concurrently: enough to actually pace the download
    // but light enough not to hammer Komiku's CDN.
    const workers = Array.from(
      { length: Math.min(2, chapter.pages.length) },
      () => worker()
    );
    Promise.all(workers);

    return () => {
      cancelled = true;
    };
  }, [chapter.pages, isScroll, totalPages]);

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

  const fadeVariants = {
    enter: { opacity: 0 },
    center: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const pageVariants: Variants =
    settings.transition === "fade" ? fadeVariants : slideVariants;
  const pageTransition: Transition =
    settings.transition === "fade"
      ? { duration: 0.18 }
      : { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] };

  return (
    <div
      ref={containerRef}
      data-canvas={settings.background}
      className="reader-page reader-shell z-50 flex flex-col"
      style={{
        backgroundColor: READER_CANVAS[settings.background],
        filter: `brightness(${settings.brightness})`,
      }}
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
                <p className="text-sm font-medium truncate">{chapter.title}</p>
                <p className="text-xs text-text-muted truncate">
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
        <div
          ref={pageContentRef}
          className="flex-1 relative overflow-hidden"
          style={{ touchAction: zoom > 1 ? "none" : "pan-y" }}
        >
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={currentPage}
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={pageTransition}
              className={cn(
                "absolute inset-0 flex justify-center",
                settings.fitMode === "width"
                  ? "items-start overflow-y-auto reader-hidden-scrollbar"
                  : "items-center"
              )}
            >
              <img
                ref={imgRef}
                src={chapter.pages[currentPage]}
                alt={`Page ${currentPage + 1}`}
                draggable={false}
                fetchPriority="high"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "center center",
                }}
                className={cn(
                  "select-none",
                  // "width" fills the screen edge to edge and scrolls vertically
                  // when the page is taller than the viewport.
                  settings.fitMode === "width" && "w-full h-auto my-auto",
                  // "height" scales to the viewport height — max-w-full keeps
                  // landscape pages from being cropped off-screen.
                  settings.fitMode === "height" &&
                    "h-full w-auto max-w-full object-contain",
                  settings.fitMode === "auto" &&
                    "max-h-full max-w-full object-contain"
                )}
              />
            </motion.div>
          </AnimatePresence>

          {/* Tap Zones (when UI is hidden and not zoomed) */}
          {!showUI && zoom <= 1 && (
            <div className="absolute inset-0 z-40 flex">
              <button
                onClick={leftIsNext ? goNext : goPrev}
                className="w-1/3 h-full"
                aria-label={leftIsNext ? "Selanjutnya" : "Sebelumnya"}
              />
              <button
                onDoubleClick={() => setShowUI(true)}
                className="w-1/3 h-full"
                aria-label="Tampilkan navigasi"
              />
              <button
                onClick={leftIsNext ? goPrev : goNext}
                className="w-1/3 h-full"
                aria-label={leftIsNext ? "Sebelumnya" : "Selanjutnya"}
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
                  {/* Kiri/kanan = pindah chapter (bukan halaman). Halaman tetap lewat tap-zone & keyboard. */}
                  {chapter.prevChapter ? (
                    <Link
                      href={`/manga/${mangaSlug}/${chapter.prevChapter}`}
                      className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"
                      aria-label="Chapter sebelumnya"
                    >
                      <ChevronLeft size={20} />
                    </Link>
                  ) : (
                    <span
                      className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center opacity-30"
                      aria-hidden
                    >
                      <ChevronLeft size={20} />
                    </span>
                  )}
                  <div className="flex-1 text-center">
                    <span className="text-sm font-mono font-medium text-text-muted">
                      {chapterProgressLabel}
                    </span>
                  </div>
                  {chapter.nextChapter ? (
                    <Link
                      href={`/manga/${mangaSlug}/${chapter.nextChapter}`}
                      className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"
                      aria-label="Chapter selanjutnya"
                    >
                      <ChevronRight size={20} />
                    </Link>
                  ) : (
                    <span
                      className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center opacity-30"
                      aria-hidden
                    >
                      <ChevronRight size={20} />
                    </span>
                  )}
                </>
              )}
              {isScroll && (
                <div className="w-full text-center py-1">
                  <span className="text-xs font-mono text-text-muted">
                    {chapterProgressLabel}
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
              className="w-full glass-elevated rounded-t-3xl p-6 safe-area-bottom max-h-[80vh] overflow-y-auto reader-hidden-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-6" />
              <h3 className="text-lg font-semibold mb-1">Pengaturan Baca</h3>

              {/* ===== Mode Baca ===== */}
              <SettingSection title="Mode Baca">
                <SettingSegmented
                  label="Gaya Baca"
                  value={settings.mode}
                  onChange={(mode) => onSettingsChange({ mode })}
                  options={[
                    {
                      value: "manga",
                      label: "Manga",
                      desc: (
                        <>
                          <ChevronLeft size={10} />
                          Ke kiri
                        </>
                      ),
                    },
                    {
                      value: "comic",
                      label: "Komik",
                      desc: (
                        <>
                          <ChevronRight size={10} />
                          Ke kanan
                        </>
                      ),
                    },
                    {
                      value: "webtoon",
                      label: "Webtoon",
                      desc: (
                        <>
                          <ChevronDown size={10} />
                          Vertikal
                        </>
                      ),
                    },
                  ]}
                />

                {/* Fit Mode — hanya mode halaman (Manga/Komik) */}
                {!isScroll && (
                  <SettingSegmented
                    label="Mode Fit"
                    value={settings.fitMode}
                    onChange={(fitMode) => onSettingsChange({ fitMode })}
                    options={[
                      { value: "width", label: "Lebar", desc: "Penuh + scroll" },
                      { value: "height", label: "Tinggi", desc: "Pas tinggi layar" },
                      { value: "auto", label: "Auto", desc: "Muat seluruh halaman" },
                    ]}
                  />
                )}

                {/* Page Gap — hanya webtoon */}
                {isScroll && (
                  <SettingSlider
                    label={`Jarak Halaman · ${settings.gap}px`}
                    value={settings.gap}
                    min={0}
                    max={32}
                    step={4}
                    onChange={(gap) => onSettingsChange({ gap })}
                  />
                )}
              </SettingSection>

              {/* ===== Tampilan ===== */}
              <SettingSection title="Tampilan">
                <SettingSegmented
                  label="Warna Latar"
                  value={settings.background}
                  onChange={(background) => onSettingsChange({ background })}
                  options={[
                    { value: "black", label: "Hitam", swatch: READER_CANVAS.black },
                    { value: "gray", label: "Abu", swatch: READER_CANVAS.gray },
                    { value: "krem", label: "Krem", swatch: READER_CANVAS.krem },
                  ]}
                />

                <SettingSlider
                  label={`Kecerahan · ${Math.round(settings.brightness * 100)}%`}
                  value={settings.brightness}
                  min={0.3}
                  max={1.5}
                  step={0.05}
                  onChange={(brightness) => onSettingsChange({ brightness })}
                />

                {/* Animasi — hanya mode halaman (Manga/Komik) */}
                {!isScroll && (
                  <SettingSegmented
                    label="Animasi Halaman"
                    value={settings.transition}
                    onChange={(transition) => onSettingsChange({ transition })}
                    options={[
                      { value: "slide", label: "Geser", desc: "Geser ke samping" },
                      { value: "fade", label: "Fade", desc: "Timbul pelan" },
                    ]}
                  />
                )}
              </SettingSection>

              {/* ===== Kontrol ===== */}
              <SettingSection title="Kontrol">
                <SettingToggle
                  label="Balik Arah Ketuk"
                  desc={
                    <>
                      <ChevronLeft size={10} />
                      Zona kiri/kanan
                      <ChevronRight size={10} />
                    </>
                  }
                  value={settings.flipTap}
                  onChange={(flipTap) => onSettingsChange({ flipTap })}
                />
              </SettingSection>
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
              className="w-full max-h-[85vh] glass-elevated rounded-t-3xl p-6 pb-8 safe-area-bottom"
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

              <div className="h-px bg-white/10 my-3" />

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
                      <div className="absolute left-0 right-0 bottom-full mb-0 z-[80] bg-black/75 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="flex items-center gap-2 border-b border-white/10 px-3">
                          <Search size={14} className="shrink-0 text-text-dim" />
                          <input
                            value={chapterQuery}
                            onChange={(e) => setChapterQuery(e.target.value)}
                            placeholder="Cari chapter..."
                            className="w-full bg-transparent py-3 text-sm text-foreground placeholder:text-text-dim outline-none"
                          />
                          {chapterQuery && (
                            <button
                              type="button"
                              onClick={() => setChapterQuery("")}
                              className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-text-dim hover:text-foreground"
                              aria-label="Hapus pencarian"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-white/10">
                          {(["all", "unread"] as const).map((f) => (
                            <button
                              key={f}
                              type="button"
                              onClick={() => setChapterFilter(f)}
                              className={cn(
                                "px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors",
                                chapterFilter === f
                                  ? "bg-purple-600/25 text-purple-200"
                                  : "bg-white/5 text-text-muted"
                              )}
                            >
                              {f === "all" ? "Semua" : "Belum dibaca"}
                            </button>
                          ))}
                          <div className="w-px h-4 bg-white/10 mx-0.5" />
                          {(["asc", "desc"] as const).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setChapterSort(s)}
                              className={cn(
                                "px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors",
                                chapterSort === s
                                  ? "bg-white/10 text-foreground"
                                  : "bg-white/5 text-text-muted"
                              )}
                            >
                              {s === "asc" ? "Terlama ↑" : "Terbaru ↓"}
                            </button>
                          ))}
                        </div>

                        <div
                          ref={chapterListBoxRef}
                          role="listbox"
                          className="max-h-[50vh] overflow-y-auto reader-hidden-scrollbar p-1.5 pb-3"
                        >
                          {filteredChapters.length === 0 ? (
                            <p className="px-3 py-6 text-center text-xs text-text-dim">
                              {chapterFilter === "unread"
                                ? "Semua chapter udah dibaca 🎉"
                                : chapterQuery.trim()
                                  ? "Tidak ada chapter cocok"
                                  : "Tidak ada chapter"}
                            </p>
                          ) : (
                            filteredChapters.map((ch) => {
                              const isActive = ch.slug === currentChapterSlug;
                              const isRead = readChapters.includes(ch.number) || isActive;
                              const elapsed = formatElapsedTime(ch.uploadDate ?? "");
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
                                    markChapterRead(mangaSlug, ch.number);
                                    setReadChapters((prev) =>
                                      prev.includes(ch.number)
                                        ? prev
                                        : [...prev, ch.number]
                                    );
                                    router.push(`/manga/${mangaSlug}/${ch.slug}`);
                                    closeChapterPicker();
                                  }}
                                  className={cn(
                                    "w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                                    isActive
                                      ? "bg-purple-600/25 text-purple-100"
                                      : cn("text-text-muted active:bg-white/5", isRead && "opacity-60")
                                  )}
                                >
                                  <span className="flex flex-col min-w-0">
                                    <span className="truncate">
                                      Chapter {ch.number}
                                      {ch.title ? ` · ${ch.title}` : ""}
                                    </span>
                                    {elapsed && (
                                      <span className="block text-[10px] text-text-dim mt-0.5">
                                        {elapsed}
                                      </span>
                                    )}
                                  </span>
                                  {isActive && <Check size={14} className="shrink-0" />}
                                </button>
                              );
                            })
                          )}
                        </div>
                        <div className="h-2" />
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
