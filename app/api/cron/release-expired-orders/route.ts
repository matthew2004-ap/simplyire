import { NextResponse } from "next/server";
import { reconcileExpiredReservations } from "@/lib/order-inventory";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("CRON_SECRET is missing.");

      return NextResponse.json(
        {
          success: false,
          message: "Cron service is not configured.",
        },
        { status: 500 }
      );
    }

    const authorization =
      request.headers.get("authorization");

    if (
      authorization !== `Bearer ${cronSecret}`
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const summary =
      await reconcileExpiredReservations(100);

    console.log(
      "Expired inventory cleanup completed:",
      summary
    );

    return NextResponse.json({
      success: true,
      message:
        "Expired order cleanup completed.",
      summary,
    });
  } catch (error) {
    console.error(
      "Expired order cleanup error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Cleanup failed.",
      },
      { status: 500 }
    );
  }
}