"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { MangaRankRow } from "@/components/manga/manga-rank-row";
import { MangaGrid } from "@/components/manga/manga-grid";
import { LastReadRow, type LastReadItem } from "@/components/manga/last-read-row";
import { BottomNav } from "@/components/shared/bottom-nav";
import { Footer } from "@/components/shared/footer";
import { getHistory } from "@/lib/bookmark";
import { Manga } from "@/lib/types";

export default function HomePage() {
  const [ranking, setRanking] = useState<{ harian: Manga[]; mingguan: Manga[] }>({ harian: [], mingguan: [] });
  const [latest, setLatest] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);
  const [rankTab, setRankTab] = useState<"harian" | "mingguan">("harian");
  const [history, setHistory] = useState<LastReadItem[]>([]);
  const [now, setNow] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const [rankRes, latestRes] = await Promise.all([
          fetch("/api/homepage"),
          fetch("/api/homepage?section=latest"),
        ]);
        const rankData = await rankRes.json();
        const latestData = await latestRes.json();
        setRanking(rankData.ranking || { harian: [], mingguan: [] });
        setLatest(latestData.latest || []);
      } catch (err) {
        console.error("Failed to fetch homepage:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    const hydrate = window.setTimeout(() => {
      setHistory(
        getHistory()
          .slice(0, 10)
          .map((h) => ({
            title: h.title,
            slug: h.slug,
            thumbnail: h.thumbnail,
            lastChapter: h.lastChapter,
            readAt: h.readAt,
          }))
      );
      setNow(Date.now());
    }, 0);
    const interval = window.setInterval(() => setNow(Date.now()), 60000);

    return () => {
      window.clearTimeout(hydrate);
      window.clearInterval(interval);
    };
  }, []);

  const lastRead = useMemo(() => history, [history]);

  return (
    <main className="flex-1 pb-24">
      {/* Hero Header */}
      <header className="pt-12 pb-6 px-4">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 ring-1 ring-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
            <Image
              src="/zenithra-logo.jpg"
              alt="Logo Zenithra"
              width={56}
              height={56}
              priority
              sizes="56px"
              className="h-full w-full object-cover scale-125"
            />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight leading-none">
            Zenithra
          </h1>
        </div>
      </header>

      <div className="px-4">
        <LastReadRow items={lastRead} now={now} />

        {/* Ranking Section */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-semibold">Peringkat</h2>
            <div className="flex gap-1 ml-auto">
              <button
                onClick={() => setRankTab("harian")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  rankTab === "harian"
                    ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                    : "bg-white/5 text-text-muted border border-white/5"
                }`}
              >
                Harian
              </button>
              <button
                onClick={() => setRankTab("mingguan")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  rankTab === "mingguan"
                    ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                    : "bg-white/5 text-text-muted border border-white/5"
                }`}
              >
                Mingguan
              </button>
            </div>
          </div>
          <MangaRankRow
            title=""
            manga={rankTab === "harian" ? ranking.harian : ranking.mingguan}
            loading={loading}
          />
        </section>

        {/* Latest Section */}
        <MangaGrid title="Terbaru" manga={latest} loading={loading} />
      </div>

      <Footer />

      <BottomNav />
    </main>
  );
}
