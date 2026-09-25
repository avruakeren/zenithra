"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { MangaRankRow } from "@/components/manga/manga-rank-row";
import { MangaGrid } from "@/components/manga/manga-grid";
import { BottomNav } from "@/components/shared/bottom-nav";
import { Manga } from "@/lib/types";

export default function HomePage() {
  const [ranking, setRanking] = useState<{ harian: Manga[]; mingguan: Manga[] }>({ harian: [], mingguan: [] });
  const [latest, setLatest] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);
  const [rankTab, setRankTab] = useState<"harian" | "mingguan">("harian");

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

      <BottomNav />
    </main>
  );
}
