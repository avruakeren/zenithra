import { Manga, ReadingSettings } from "./types";

const BOOKMARK_KEY = "zenithra_bookmarks";
const HISTORY_KEY = "zenithra_history";
const SETTINGS_KEY = "zenithra_reading_settings";
const RECENT_SEARCH_KEY = "zenithra_recent_searches";

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

const DEFAULT_SETTINGS: ReadingSettings = {
  mode: "manga",
  brightness: 1,
  fitMode: "width",
  gap: 8,
  showPageNumber: true,
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
