import { NextResponse } from "next/server";
import { getHomepageData } from "@/lib/scraper";

export async function GET() {
  try {
    // Satu respons berisi semua section landing page — homepage komiku
    // cuma di-scrape sekali.
    const data = await getHomepageData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Homepage API error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
