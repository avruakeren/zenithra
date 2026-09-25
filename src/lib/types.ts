export interface Manga {
  title: string;
  slug: string;
  thumbnail: string;
  genre: string;
  type: "manga" | "manhwa" | "manhua";
  latestChapter: string;
  latestChapterSlug: string;
  views?: string;
  rank?: number;
  url: string;
}

export interface MangaDetail {
  title: string;
  slug: string;
  thumbnail: string;
  synopsis: string;
  status: string;
  type: string;
  genres: string[];
  chapters: Chapter[];
  alternativeTitle?: string;
}

export interface Chapter {
  number: string;
  title?: string;
  slug: string;
  url: string;
  uploadDate?: string;
}

export interface ChapterPages {
  title: string;
  chapterNumber: string;
  pages: string[];
  prevChapter?: string;
  nextChapter?: string;
  mangaSlug: string;
}

export type ReadingMode = "manga" | "comic" | "webtoon";

export interface ReadingSettings {
  mode: ReadingMode;
  brightness: number;
  fitMode: "width" | "height" | "auto";
  gap: number;
  showPageNumber: boolean;
}

export interface SearchResult {
  title: string;
  slug: string;
  thumbnail: string;
  type: string;
  latestChapter?: string;
  url: string;
}
