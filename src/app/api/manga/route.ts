import { NextResponse } from "next/server";
import { getMangaDetail } from "@/lib/scraper";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 });
  }

  try {
    const manga = await getMangaDetail(slug);
    if (!manga) {
      return NextResponse.json({ error: "Manga not found" }, { status: 404 });
    }
    return NextResponse.json(manga);
  } catch (error) {
    console.error("Manga API error:", error);
    return NextResponse.json({ error: "Failed to fetch manga" }, { status: 500 });
  }
}
