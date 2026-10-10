import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const placements = new Set(["HOME", "SHOP", "ANNOUNCEMENT"]);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedPlacement = (searchParams.get("placement") || "HOME").toUpperCase();
    const placement = placements.has(requestedPlacement)
      ? requestedPlacement
      : "HOME";
    const now = new Date();

    const promotions = await db.promotion.findMany({
      where: {
        placement,
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        ],
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 8,
      select: {
        id: true,
        title: true,
        subtitle: true,
        description: true,
        image: true,
        ctaLabel: true,
        ctaHref: true,
        placement: true,
      },
    });

    return NextResponse.json(
      { success: true, promotions },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (error) {
    console.error("Public promotions error:", error);
    return NextResponse.json(
      { success: true, promotions: [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
