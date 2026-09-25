import { Manga, MangaDetail, Chapter, ChapterPages } from "./types";

const BASE_URL = "https://komiku.org";

function buildUrl(src: string): string {
  if (!src) return "";
  if (src.startsWith("http")) return src;
  if (src.startsWith("//")) return `https:${src}`;
  return `${BASE_URL}${src}`;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeChapterSlug(value?: string): string {
  if (!value) return "";
  const normalized = value.replace(/\\\//g, "/");
  const pathname = normalized.startsWith("http")
    ? new URL(normalized).pathname
    : normalized.split(/[?#]/)[0];
  return pathname.match(/^\/([^/]+)\/?$/)?.[1] || "";
}

async function fetchHTML(
  url: string,
  revalidate = 300,
  referer = BASE_URL
): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
      "Referer": referer,
    },
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function extractBetween(html: string, startMarker: string, endMarker: string): string {
  const startIdx = html.indexOf(startMarker);
  if (startIdx === -1) return "";
  const searchFrom = startIdx + startMarker.length;
  const endIdx = html.indexOf(endMarker, searchFrom);
  if (endIdx === -1) return html.substring(searchFrom);
  return html.substring(searchFrom, endIdx);
}

function parseRankArticle(block: string): Manga | null {
  const titleM = block.match(/<h4>\s*<a\s+href="([^"]*)"[^>]*>([^<]*)<\/a>\s*<\/h4>/);
  if (!titleM) return null;

  const thumbM = block.match(/data-src="([^"]+)"/);
  const genreM = block.match(/<span class="ls4s">([^<]*)<\/span>/);
  const chM = block.match(/<a\s+href="([^"]*)"[^>]*class="ls24"[^>]*>([^<]*)<\/a>/);

  const url = titleM[1].replace(/\/$/, "");
  const slug = url.replace(/^\/manga\//, "");
  const genreText = genreM?.[1] || "";
  const parts = genreText.split("·").map(s => s.trim());

  return {
    title: titleM[2].trim(),
    slug,
    thumbnail: buildUrl(thumbM?.[1] || ""),
    genre: parts[0] || "",
    type: "manga",
    latestChapter: chM?.[2]?.trim() || "",
    latestChapterSlug: chM?.[1]?.replace(/^\//, "").replace(/\/$/, "") || "",
    views: parts[1] || "",
    url: titleM[1],
  };
}

function dedupeManga(items: Manga[]): Manga[] {
  const seen = new Set<string>();
  return items.filter((manga) => {
    const key = manga.slug.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ===== HOMEPAGE =====

export async function getHomepageRanking(): Promise<{ harian: Manga[]; mingguan: Manga[] }> {
  const html = await fetchHTML(BASE_URL);

  const parseRankSection = (sectionHtml: string): Manga[] => {
    const results: Manga[] = [];
    const articleRegex = /<article class="ls4">([\s\S]*?)<\/article>/g;
    let match;
    while ((match = articleRegex.exec(sectionHtml)) !== null) {
      const manga = parseRankArticle(match[1]);
      if (manga) {
        results.push(manga);
      }
    }
    return dedupeManga(results).map((manga, index) => ({
      ...manga,
      rank: index + 1,
    }));
  };

  // Extract between rank section IDs - find the actual section boundaries
  const harianSection = extractBetween(html, 'id="rank-harian"', 'id="rank-mingguan"');
  const mingguanSection = extractBetween(html, 'id="rank-mingguan"', '</section>');

  return {
    harian: harianSection ? parseRankSection(harianSection) : [],
    mingguan: mingguanSection ? parseRankSection(mingguanSection) : [],
  };
}

export async function getHomepageLatest(): Promise<Manga[]> {
  const html = await fetchHTML(BASE_URL);

  // Extract the Terbaru section
  const terbaruSection = extractBetween(html, 'id="Terbaru"', '<section id="Filter"');

  const results: Manga[] = [];
  const articleRegex = /<article class="ls2">([\s\S]*?)<\/article>/g;
  let match;
  while ((match = articleRegex.exec(terbaruSection || html)) !== null) {
    const block = match[1];
    const titleM = block.match(/<h3>\s*<a\s+href="([^"]*)"[^>]*>([^<]*)<\/a>\s*<\/h3>/);
    if (!titleM) continue;

    const thumbM = block.match(/data-src="([^"]+)"/);
    const genreM = block.match(/<span class="ls2t">([^<]*)<\/span>/);
    const chM = block.match(/<a\s+href="([^"]*)"[^>]*class="ls2l"[^>]*>([^<]*)<\/a>/);

    const url = titleM[1].replace(/\/$/, "");
    const slug = url.replace(/^\/manga\//, "");
    const genreText = genreM?.[1] || "";
    const genreParts = genreText.split("·").map(s => s.trim());

    results.push({
      title: titleM[2].trim(),
      slug,
      thumbnail: buildUrl(thumbM?.[1] || ""),
      genre: genreParts[0] || "",
      type: "manga",
      latestChapter: chM?.[2]?.trim() || "",
      latestChapterSlug: chM?.[1]?.replace(/^\//, "").replace(/\/$/, "") || "",
      url: titleM[1],
    });
  }
  return dedupeManga(results);
}

// ===== MANGA DETAIL =====

export async function getMangaDetail(slug: string): Promise<MangaDetail | null> {
  const html = await fetchHTML(`${BASE_URL}/manga/${slug}/`);

  // Title from itemprop="name"
  const titleM = html.match(/itemprop="name"\s*style="[^"]*">([^<]+)<\/span>/);
  const titleM2 = html.match(/itemprop="name"[^>]*>([^<]*)<\/span>/);
  const title = (titleM?.[1] || titleM2?.[1] || "").trim();

  // Thumbnail from og:image meta tag
  const thumbM = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);
  const thumbM2 = html.match(/<img[^>]*src="([^"]*)"[^>]*itemprop="image"/);

  // Synopsis from <p class="desc" itemprop="description">
  const descM = html.match(/<p\s+class="desc"\s+itemprop="description">([\s\S]*?)<\/p>/);

  // Info from <table class="inftable">
  const inftableM = html.match(/<table class="inftable">([\s\S]*?)<\/table>/);
  const tableContent = inftableM?.[1] || "";

  const getField = (label: string): string => {
    const re = new RegExp(`<td[^>]*>${label}:?<\\/td>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`);
    const m = tableContent.match(re);
    return m?.[1]?.replace(/<[^>]*>/g, "").trim() || "";
  };

  const status = getField("Status");
  const type = getField("Tipe");
  const alternativeTitle = getField("Judul Alternatif");

  // Genres from schema.org meta tags
  const genres: string[] = [];
  const genreRegex = /itemprop="genre"\s*content="([^"]*)"/g;
  let gm;
  while ((gm = genreRegex.exec(html)) !== null) {
    if (!genres.includes(gm[1])) genres.push(gm[1]);
  }

  // Chapters from <table id="Daftar_Chapter">
  const chapters: Chapter[] = [];
  const chTableM = html.match(/<table id="Daftar_Chapter"[^>]*>([\s\S]*?)<\/table>/);
  if (chTableM) {
    const chRowRegex = /<tr\s+itemprop="itemListElement"[\s\S]*?<a\s+href="([^"]*)"[^>]*>\s*<span[^>]*>\s*<b>([^<]*)<\/b>/g;
    let cm;
    while ((cm = chRowRegex.exec(chTableM[1])) !== null) {
      const chUrl = cm[1].replace(/\/$/, "");
      const chSlug = chUrl.replace(/^\//, "");
      const chNum = cm[2].replace("Chapter ", "").trim();
      const dateM = chTableM[1].substring(cm.index).match(/<td class="tanggalseries">([^<]*)<\/td>/);
      chapters.push({
        number: chNum,
        slug: chSlug,
        url: cm[1],
        uploadDate: dateM?.[1]?.trim() || "",
      });
    }
  }

  // Fallback
  if (chapters.length === 0) {
    const fallback = /<a\s+href="\/([^"]*-chapter-[^"]*)\/"[^>]*>\s*<span[^>]*>\s*<b>([^<]*)<\/b>/g;
    let fb;
    while ((fb = fallback.exec(html)) !== null) {
      const chSlug = fb[1].replace(/\/$/, "");
      if (!chapters.some(c => c.slug === chSlug)) {
        chapters.push({
          number: fb[2].replace("Chapter ", "").trim(),
          slug: chSlug,
          url: `/${fb[1]}`,
        });
      }
    }
  }

  return {
    title,
    slug,
    thumbnail: thumbM?.[1] || thumbM2?.[1] ? buildUrl(thumbM?.[1] || thumbM2?.[1] || "") : "",
    synopsis: descM?.[1]?.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() || "",
    status,
    type,
    genres,
    chapters,
    alternativeTitle,
  };
}

// ===== CHAPTER PAGES =====

export async function getChapterPages(chapterSlug: string): Promise<ChapterPages | null> {
  const html = await fetchHTML(`${BASE_URL}/${chapterSlug}/`);

  const titleM = html.match(/<h1>([^<]+)<\/h1>/);

  // Extract chapterData from JavaScript
  const chapterDataM = html.match(/var\s+chapterData\s*=\s*\{([^}]+)\}/);
  let mangaSlug = "";
  let chNumber = "";
  let seriesName = "";
  if (chapterDataM) {
    const dataStr = chapterDataM[1];
    const seriesM = dataStr.match(/series\s*:\s*"([^"]*)"/);
    const chM = dataStr.match(/chapter\s*:\s*"([^"]*)"/);
    const linkSeriesM = dataStr.match(/link_series\s*:\s*"([^"]*)"/);
    seriesName = seriesM?.[1] || "";
    chNumber = chM?.[1] || "";
    if (linkSeriesM) {
      const seriesUrl = linkSeriesM[1].replace(/\\\//g, "/");
      mangaSlug = seriesUrl.match(/\/manga\/([^/?#]+)/)?.[1] || "";
    }
  }

  if (!mangaSlug) {
    mangaSlug =
      html.match(/itemprop="isPartOf"[^>]*>[\s\S]*?itemprop="url"[^>]*content="[^"]*\/manga\/([^/"]+)/)?.[1] ||
      html.match(/<a[^>]*itemprop="item"[^>]*href="[^"]*\/manga\/([^/"]+)/)?.[1] ||
      "";
  }

  if (!mangaSlug) {
    mangaSlug = chapterSlug
      .replace(/-chapter-[\d.]+(?:-[\d.]+)?$/, "")
      .replace(/^manga\//, "");
  }
  if (!chNumber) {
    chNumber = chapterSlug.match(/chapter-([\d.]+)/)?.[1] || "";
  }

  // Extract images from #Baca_Komik div
  const pages: string[] = [];
  const bacaStart = html.indexOf('id="Baca_Komik"');
  if (bacaStart !== -1) {
    const bacaEnd = html.indexOf('class="iklan mobile"', bacaStart + 100);
    const bacaContent = bacaEnd !== -1
      ? html.substring(bacaStart, bacaEnd)
      : html.substring(bacaStart, bacaStart + 50000);

    const imgRegex = /<img\s+[^>]*src="([^"]*)"[^>]*class="[^"]*(?:klazy|ww)[^"]*"[^>]*>/g;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(bacaContent)) !== null) {
      const src = imgMatch[1];
      if (src.includes("komiku-promosi") || src.includes("iklan") || src.includes("ads")) continue;
      pages.push(src);
    }

    // Fallback
    if (pages.length === 0) {
      const imgRegex2 = /<img\s+[^>]*src="([^"]*)"[^>]*class="[^"]*(?:klazy|ww)/g;
      let imgMatch2;
      while ((imgMatch2 = imgRegex2.exec(bacaContent)) !== null) {
        pages.push(imgMatch2[1]);
      }
    }
  }

  // Extract prev/next
  const prevM = html.match(/<a\s+href="([^"]*)"[^>]*aria-label="Prev"/);
  const nextM = html.match(/<a\s+href="([^"]*)"[^>]*aria-label="Next"/);

  return {
    title: titleM?.[1]?.trim() || `${seriesName} Chapter ${chNumber}`,
    chapterNumber: chNumber,
    pages,
    prevChapter: normalizeChapterSlug(prevM?.[1]) || undefined,
    nextChapter: normalizeChapterSlug(nextM?.[1]) || undefined,
    mangaSlug,
  };
}

// ===== SEARCH =====

const searchCache = new Map<string, { results: Manga[]; expiresAt: number }>();
const SEARCH_CACHE_TTL = 5 * 60 * 1000;

function parseBgeSearchCard(card: string): Manga | null {
  const titleM = card.match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
  const mangaLinkM = card.match(/<a\s+href="([^"]*\/manga\/[^"]+)"[^>]*>/);
  const slugM = mangaLinkM?.[1].match(/^\/manga\/([^/]+)\/?$/);
  if (!titleM || !mangaLinkM || !slugM) return null;

  const thumbM = card.match(/<img[^>]*src="([^"]+)"/);
  const typeM = card.match(/<div class="tpe1_inf">([\s\S]*?)<\/div>/);
  const typeText = typeM?.[1]
    ?.replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const typeMatch = typeText?.match(/^(Manga|Manhwa|Manhua)\s*(.*)$/i);
  const type = (typeMatch?.[1] || "manga").toLowerCase() as Manga["type"];
  const latestM = card.match(
    /<a href="([^"]+)"[^>]*>\s*<span>Terbaru:\s*<\/span>\s*<span>([^<]*)<\/span>/
  );
  const title = titleM[1].replace(/<[^>]+>/g, "").trim();

  return {
    title: decodeHtml(title),
    slug: slugM[1],
    thumbnail: buildUrl(decodeHtml(thumbM?.[1] || "")),
    genre: typeMatch?.[2]?.trim() || "",
    type,
    latestChapter: latestM ? decodeHtml(latestM[2].trim()) : "",
    latestChapterSlug: latestM?.[1]
      ?.replace(/^\//, "")
      .replace(/\/$/, "") || "",
    url: mangaLinkM[1],
  };
}

function parseArticleSearchCard(block: string): Manga | null {
  const titleM = block.match(
    /<h3[^>]*>\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h3>/
  );
  const slugM = titleM?.[1].match(/^\/manga\/([^/]+)\/?$/);
  if (!titleM || !slugM) return null;

  const thumbM = block.match(/data-src="([^"]+)"/) || block.match(/<img[^>]*src="([^"]+)"/);
  const genreM = block.match(/<span class="ls2t">([^<]*)<\/span>/);
  const latestM = block.match(
    /<a\s+href="([^"]+)"[^>]*class="ls2l"[^>]*>([\s\S]*?)<\/a>/
  );
  const genreParts = (genreM?.[1] || "").split("·").map((part) => part.trim());
  const title = titleM[2].replace(/<[^>]+>/g, "").trim();

  return {
    title: decodeHtml(title),
    slug: slugM[1],
    thumbnail: buildUrl(decodeHtml(thumbM?.[1] || "")),
    genre: genreParts[0] || "",
    type: "manga",
    latestChapter: latestM ? decodeHtml(latestM[2].replace(/<[^>]+>/g, "").trim()) : "",
    latestChapterSlug: latestM?.[1].replace(/^\//, "").replace(/\/$/, "") || "",
    url: titleM[1],
  };
}

function parseSearchHtml(html: string): Manga[] {
  const results: Manga[] = [];
  const seen = new Set<string>();
  const cards = html.split(/<div class="bge"[^>]*>/).slice(1);
  const articles = html.match(/<article class="ls2">[\s\S]*?<\/article>/g) || [];

  for (const card of cards) {
    const manga = parseBgeSearchCard(card);
    if (manga && !seen.has(manga.slug)) {
      seen.add(manga.slug);
      results.push(manga);
    }
  }

  for (const article of articles) {
    const manga = parseArticleSearchCard(article);
    if (manga && !seen.has(manga.slug)) {
      seen.add(manga.slug);
      results.push(manga);
    }
  }

  return results;
}

export async function searchManga(query: string): Promise<Manga[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  const cacheKey = normalizedQuery.toLocaleLowerCase("id-ID");
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.results;

  const encodedQuery = encodeURIComponent(normalizedQuery);
  const searchPageUrl = `${BASE_URL}/?post_type=manga&s=${encodedQuery}`;
  const apiUrl = `https://api.komiku.org/?post_type=manga&s=${encodedQuery}`;
  const pendingUrls = [apiUrl, searchPageUrl];
  const attempts = new Map<string, number>();

  while (pendingUrls.length > 0) {
    const sourceUrl = pendingUrls.shift();
    if (!sourceUrl) break;

    const attemptsForUrl = attempts.get(sourceUrl) || 0;
    if (attemptsForUrl >= 2) continue;
    attempts.set(sourceUrl, attemptsForUrl + 1);

    try {
      const html = await fetchHTML(sourceUrl, 0, searchPageUrl);
      const results = parseSearchHtml(html);
      if (results.length > 0) {
        searchCache.set(cacheKey, {
          results,
          expiresAt: Date.now() + SEARCH_CACHE_TTL,
        });
        return results;
      }

      const endpointM = html.match(
        /hx-get="([^"]*api\.komiku\.org\/[^"]*post_type=manga[^"]*)"/
      );
      if (endpointM) pendingUrls.push(buildUrl(decodeHtml(endpointM[1])));
    } catch {
      continue;
    }
  }

  return searchCache.get(cacheKey)?.results || [];
}
