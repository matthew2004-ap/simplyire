import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "You must be logged in." }, { status: 401 });
    }
    if (session.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Admin access required." }, { status: 403 });
    }

    const subscribers = await db.newsletterSubscriber.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, createdAt: true },
    });

    return NextResponse.json({ success: true, subscribers });
  } catch (error) {
    console.error("Admin newsletter query error:", error);
    return NextResponse.json({ success: false, message: "Unable to load newsletter subscribers." }, { status: 500 });
  }
}
