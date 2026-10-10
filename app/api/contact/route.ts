import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const subject = String(body.subject ?? "").trim();
    const message = String(body.message ?? "").trim();

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ success: false, message: "All fields are required." }, { status: 400 });
    }
    if (name.length > 100 || email.length > 254 || subject.length > 150 || message.length > 5000) {
      return NextResponse.json({ success: false, message: "One or more fields are too long." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, message: "Please provide a valid email address." }, { status: 400 });
    }

    const saved = await db.contactMessage.create({
      data: { name, email, subject, message },
      select: { id: true },
    });

    return NextResponse.json({ success: true, message: "Your message was received.", id: saved.id }, { status: 201 });
  } catch (error) {
    console.error("Contact message save error:", error);
    return NextResponse.json({ success: false, message: "We couldn't save your message right now. Please try again later." }, { status: 503 });
  }
}
