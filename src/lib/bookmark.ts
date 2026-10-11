import { Chapter, Manga, ReadingSettings } from "./types";

const BOOKMARK_KEY = "zenithra_bookmarks";
const HISTORY_KEY = "zenithra_history";
const SETTINGS_KEY = "zenithra_reading_settings";
const RECENT_SEARCH_KEY = "zenithra_recent_searches";
const READ_KEY_PREFIX = "zenithra_read_";
const MAX_READ_ENTRIES = 1000;

export function getBookmarks(): Manga[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BOOKMARK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string): void {
  if (typeof window === "undefined") return;
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return;

  const recent = getRecentSearches().filter(
    (item) => item.toLocaleLowerCase("id-ID") !== normalizedQuery.toLocaleLowerCase("id-ID")
  );
  localStorage.setItem(
    RECENT_SEARCH_KEY,
    JSON.stringify([normalizedQuery, ...recent].slice(0, 8))
  );
}

export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCH_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function clearRecentSearches(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(RECENT_SEARCH_KEY);
}

export function addBookmark(manga: Manga): void {
  const bookmarks = getBookmarks();
  if (!bookmarks.some(b => b.slug === manga.slug)) {
    bookmarks.unshift(manga);
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarks));
  }
}

export function removeBookmark(slug: string): void {
  const bookmarks = getBookmarks().filter(b => b.slug !== slug);
  localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarks));
}

export function isBookmarked(slug: string): boolean {
  return getBookmarks().some(b => b.slug === slug);
}

export function addToHistory(manga: Manga, chapterSlug: string, chapterNumber: string): void {
  const history = getHistory();
  const entry = {
    ...manga,
    lastChapter: chapterNumber,
    lastChapterSlug: chapterSlug,
    readAt: Date.now(),
  };
  const filtered = history.filter(h => h.slug !== manga.slug);
  filtered.unshift(entry);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered.slice(0, 50)));
}

export function getHistory(): (Manga & { lastChapter: string; lastChapterSlug: string; readAt: number })[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ---- Read chapters log -------------------------------------------------
// Menyimpan daftar nomor chapter yang pernah dibuka per manga,
// biar daftar chapter bisa nandain mana yang sudah / belum dibaca.

function readKey(slug: string): string {
  return `${READ_KEY_PREFIX}${slug}`;
}

function readRaw(slug: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(readKey(slug));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((n): n is string => typeof n === "string")
      : [];
  } catch {
    return [];
  }
}

function writeRead(slug: string, numbers: string[]): void {
  localStorage.setItem(
    readKey(slug),
    JSON.stringify(numbers.slice(-MAX_READ_ENTRIES))
  );
}

function normalizeChapterNumber(value: string): number {
  const parsed = parseFloat(
    value.replace(/^chapter\s*/i, "").replace(/^ch\s*/i, "")
  );
  return Number.isFinite(parsed) ? parsed : 0;
}

export function markChapterRead(slug: string, chapterNumber: string): void {
  if (typeof window === "undefined") return;
  const normalized = chapterNumber.trim();
  if (!normalized) return;

  const current = readRaw(slug);
  if (current.includes(normalized)) return;
  writeRead(slug, [...current, normalized]);
}

export function getReadChapters(slug: string, chapters: Chapter[] = []): string[] {
  const stored = readRaw(slug);
  if (stored.length > 0) return stored;

  // Fallback untuk data lama: history cuma nyimpan chapter terakhir,
  // jadi anggap semua chapter sebelumnya sudah dibaca.
  const historyEntry = getHistory().find((h) => h.slug === slug);
  const lastNumber = normalizeChapterNumber(historyEntry?.lastChapter ?? "");
  if (lastNumber <= 0 || chapters.length === 0) return [];

  const seeded = chapters
    .filter((ch) => {
      const number = normalizeChapterNumber(ch.number);
      return number > 0 && number <= lastNumber;
    })
    .map((ch) => ch.number.trim())
    .filter((number, index, all) => all.indexOf(number) === index);

  // Persist hasil seeding sekali biar nggak balik ke "belum dibaca"
  // begitu ada chapter baru yang ditandai lewat markChapterRead.
  if (seeded.length > 0) writeRead(slug, seeded);

  return seeded;
}

const DEFAULT_SETTINGS: ReadingSettings = {
  mode: "manga",
  brightness: 1,
  fitMode: "width",
  gap: 8,
  background: "black",
  transition: "slide",
  flipTap: false,
};

export function getReadingSettings(): ReadingSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function setReadingSettings(settings: Partial<ReadingSettings>): void {
  const current = getReadingSettings();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
}
