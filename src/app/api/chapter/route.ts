import { NextResponse } from "next/server";
import { getChapterPages } from "@/lib/scraper";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 });
  }

  try {
    const chapter = await getChapterPages(slug);
    if (!chapter) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }
    return NextResponse.json(chapter);
  } catch (error) {
    console.error("Chapter API error:", error);
    return NextResponse.json({ error: "Failed to fetch chapter" }, { status: 500 });
  }
}
