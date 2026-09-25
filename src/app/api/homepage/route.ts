import { NextResponse } from "next/server";
import { getHomepageRanking, getHomepageLatest } from "@/lib/scraper";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section");

  try {
    if (section === "latest") {
      const latest = await getHomepageLatest();
      return NextResponse.json({ latest });
    }

    const ranking = await getHomepageRanking();
    return NextResponse.json({ ranking });
  } catch (error) {
    console.error("Homepage API error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
