"use client";

import { useState, useEffect } from "react";
import { MangaCard } from "@/components/manga/manga-card";
import { BottomNav } from "@/components/shared/bottom-nav";
import { Manga } from "@/lib/types";
import { getBookmarks, getHistory } from "@/lib/bookmark";
import { Bookmark, Clock } from "lucide-react";

export default function BookmarkPage() {
  const [bookmarks, setBookmarks] = useState<Manga[]>([]);
  const [history, setHistory] = useState<(Manga & { lastChapter: string; lastChapterSlug: string; readAt: number })[]>([]);
  const [activeTab, setActiveTab] = useState<"bookmarks" | "history">("bookmarks");
  const [now, setNow] = useState(0);

  useEffect(() => {
    const hydrate = window.setTimeout(() => {
      setBookmarks(getBookmarks());
      setHistory(getHistory());
      setNow(Date.now());
    }, 0);
    const interval = window.setInterval(() => setNow(Date.now()), 60000);

    return () => {
      window.clearTimeout(hydrate);
      window.clearInterval(interval);
    };
  }, []);

  const timeAgo = (timestamp: number) => {
    if (!now) return "";
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return "Baru saja";
    if (minutes < 60) return `${minutes} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    return `${days} hari lalu`;
  };

  return (
    <main className="flex-1 pb-24">
      {/* Header */}
      <header className="pt-12 pb-4 px-4">
        <h1 className="text-xl font-bold mb-4">Koleksi</h1>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("bookmarks")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "bookmarks"
                ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                : "bg-white/5 text-text-muted border border-white/5"
            }`}
          >
            <Bookmark size={14} />
            Bookmark
            <span className="text-xs opacity-60">({bookmarks.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "history"
                ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                : "bg-white/5 text-text-muted border border-white/5"
            }`}
          >
            <Clock size={14} />
            Riwayat
            <span className="text-xs opacity-60">({history.length})</span>
          </button>
        </div>
      </header>

      <div className="px-4">
        {activeTab === "bookmarks" ? (
          bookmarks.length === 0 ? (
            <div className="text-center py-16">
              <Bookmark size={40} className="mx-auto mb-4 text-text-dim" />
              <p className="text-sm text-text-muted">Belum ada bookmark</p>
              <p className="text-xs text-text-dim mt-1">
                Tap ikon bookmark di manga untuk menyimpan
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {bookmarks.map((m) => (
                <MangaCard key={m.slug} manga={m} layout="list" />
              ))}
            </div>
          )
        ) : history.length === 0 ? (
          <div className="text-center py-16">
            <Clock size={40} className="mx-auto mb-4 text-text-dim" />
            <p className="text-sm text-text-muted">Belum ada riwayat baca</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <a
                key={h.slug}
                href={`/manga/${h.slug}/${h.lastChapterSlug}`}
                className="block"
              >
                <div className="glass rounded-2xl p-3 flex gap-3 transition-all active:scale-[0.98]">
                  <div className="w-16 h-22 rounded-lg bg-white/5 overflow-hidden shrink-0 relative">
                    {h.thumbnail && (
                      <img
                        src={h.thumbnail}
                        alt={h.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 py-0.5">
                    <h3 className="text-sm font-medium line-clamp-1 mb-1">{h.title}</h3>
                    <p className="text-xs text-purple-400 mb-1">
                      Chapter {h.lastChapter}
                    </p>
                    <p className="text-[10px] text-text-dim">{timeAgo(h.readAt)}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
