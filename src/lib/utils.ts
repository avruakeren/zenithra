import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ReadingSettings } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Kanvas di balik halaman komik — dipilih lewat pengaturan "Warna Latar".
export const READER_CANVAS: Record<ReadingSettings["background"], string> = {
  black: "#050208",
  gray: "#15161c",
  krem: "#e8e2d5",
};

export function cleanMangaTitle(title: string): string {
  return title
    .replace(/\s+Chapter\s+[\d.]+(?:\s*[-–]\s*[\d.]+)?\s*$/i, "")
    .replace(/\s+Ch\s+[\d.]+(?:\s*[-–]\s*[\d.]+)?\s*$/i, "")
    .trim();
}

export function timeAgo(timestamp: number, now: number): string {
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  if (days < 7) return `${days} hari lalu`;
  if (days < 30) return `${Math.floor(days / 7)} minggu lalu`;
  return `${Math.floor(days / 30)} bulan lalu`;
}

// Tanggal rilis chapter dari komiku berformat DD/MM/YYYY (tanpa jam),
// jadi jam rilisnya nggak diketahui dan dianggap jam 00.00 lokal.
export function parseUploadDate(value: string): number | null {
  const raw = value.trim();
  if (!raw) return null;

  const m = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const date = new Date(year, month - 1, day);
    // Tolak tanggal yang nggak valid (mis. 31 Februari → Maret)
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }
    return date.getTime();
  }

  const fallback = Date.parse(raw);
  return Number.isFinite(fallback) ? fallback : null;
}

function isSameCalendarDay(a: number, b: number): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return (
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate()
  );
}

// "Hari ini" / "5 detik lalu" / "3 menit lalu" / "12 jam lalu" /
// "7 hari lalu" / "4 bulan lalu" / "2 tahun lalu".
export function formatElapsedTime(value: string, now: number = Date.now()): string | null {
  const timestamp = parseUploadDate(value);
  if (timestamp === null) return null;
  // Tanggal dari masa depan (data nggak valid / beda timezone) → jangan tampil.
  if (timestamp > now) return null;
  if (isSameCalendarDay(timestamp, now)) return "Hari ini";

  const diff = Math.max(0, now - timestamp);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (seconds < 60) return `${Math.max(seconds, 1)} detik lalu`;
  if (minutes < 60) return `${minutes} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  if (days < 30) return `${days} hari lalu`;
  if (days < 365) return `${Math.floor(days / 30)} bulan lalu`;
  return `${Math.floor(days / 365)} tahun lalu`;
}
