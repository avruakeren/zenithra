"use client";

import { useState, useCallback, useEffect } from "react";
import { MangaCard } from "@/components/manga/manga-card";
import { MangaGridSkeleton } from "@/components/shared/skeleton";
import { BottomNav } from "@/components/shared/bottom-nav";
import { Manga } from "@/lib/types";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
} from "@/lib/bookmark";
import { History, Search as SearchIcon, Trash2, X } from "lucide-react";

function RecentSearches({
  items,
  onSelect,
  onClear,
}: {
  items: string[];
  onSelect: (query: string) => void;
  onClear: () => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-text-muted flex items-center gap-2">
          <History size={14} />
          Pencarian terbaru
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-text-dim flex items-center gap-1.5 hover:text-foreground"
        >
          <Trash2 size={12} />
          Hapus
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onSelect(item)}
            className="px-3 py-2 rounded-full text-xs font-medium bg-purple-600/15 text-purple-200 border border-purple-400/20 flex items-center gap-2"
          >
            <SearchIcon size={12} />
            {item}
          </button>
        ))}
      </div>
    </section>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const hydrate = window.setTimeout(() => {
      setRecentSearches(getRecentSearches());
    }, 0);
    return () => window.clearTimeout(hydrate);
  }, []);

  const handleSearch = useCallback(async (q: string) => {
    const normalizedQuery = q.trim();
    if (!normalizedQuery) return;

    setLoading(true);
    setSearched(true);
    setError("");

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(normalizedQuery)}`);
      const data = (await res.json()) as { results?: Manga[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Pencarian gagal");
      setResults(Array.isArray(data.results) ? data.results : []);
      addRecentSearch(normalizedQuery);
      setRecentSearches(getRecentSearches());
    } catch (err) {
      setResults([]);
      setError(err instanceof Error ? err.message : "Pencarian gagal");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const runRecentSearch = (recentQuery: string) => {
    setQuery(recentQuery);
    handleSearch(recentQuery);
  };

  const removeRecentSearches = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  return (
    <main className="flex-1 pb-24">
      {/* Search Header */}
      <header className="pt-12 pb-4 px-4">
        <h1 className="text-xl font-bold mb-4">Cari Manga</h1>
        <form onSubmit={handleSubmit} className="relative">
          <SearchIcon size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Judul manga..."
            className="w-full h-12 pl-11 pr-20 glass rounded-2xl bg-transparent text-sm outline-none placeholder:text-text-dim"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults([]);
                setSearched(false);
                setError("");
              }}
              className="absolute right-11 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/5 flex items-center justify-center"
              aria-label="Hapus pencarian"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-purple-600/25 border border-purple-400/25 flex items-center justify-center disabled:opacity-40"
            aria-label="Cari manga"
          >
            <SearchIcon size={15} />
          </button>
        </form>
      </header>

      <div className="px-4">
        {!loading && results.length === 0 && (
          <RecentSearches
            items={recentSearches}
            onSelect={runRecentSearch}
            onClear={removeRecentSearches}
          />
        )}

        {/* Results */}
        {loading ? (
          <MangaGridSkeleton count={6} />
        ) : error ? (
          <div className="glass rounded-2xl p-5 text-center">
            <p className="text-sm text-text-muted">{error}. Coba lagi sebentar.</p>
          </div>
        ) : results.length > 0 ? (
          <section>
            <h2 className="text-sm font-semibold text-text-muted mb-3">
              Hasil ({results.length})
            </h2>
            <div className="space-y-2">
              {results.map((manga) => (
                <MangaCard key={manga.slug} manga={manga} layout="list" />
              ))}
            </div>
          </section>
        ) : (
          <div className="text-center py-16">
            <SearchIcon size={40} className="mx-auto mb-4 text-text-dim" />
            <p className="text-sm text-text-muted">
              {searched
                ? `Tidak ada hasil untuk "${query}"`
                : "Ketik judul manga untuk mencari"}
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
