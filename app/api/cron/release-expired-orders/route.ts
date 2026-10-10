import { NextResponse } from "next/server";
import { processExpiredReservations } from "@/lib/expired-reservations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error("CRON_SECRET is missing.");
      return NextResponse.json(
        { success: false, message: "Cron service is not configured." },
        { status: 500 }
      );
    }

    const authorization = request.headers.get("authorization");
    if (authorization !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    return NextResponse.json(await processExpiredReservations(100));
  } catch (error) {
    console.error("Expired order cleanup error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Cleanup failed.",
      },
      { status: 500 }
    );
  }
}
