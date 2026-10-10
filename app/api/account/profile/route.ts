import { NextResponse } from "next/server";
import { getSession, createSession } from "@/lib/auth";
import { db } from "@/lib/db";

function profileSelect() {
  return {
    id: true,
    name: true,
    email: true,
    role: true,
    phone: true,
    address: true,
    city: true,
    state: true,
    createdAt: true,
    updatedAt: true,
  } as const;
}

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "You must be signed in to view your profile." },
        { status: 401 }
      );
    }

    const profile = await db.user.findUnique({
      where: { id: session.userId },
      select: profileSelect(),
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, message: "Account not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load your profile." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "You must be signed in to update your profile." },
        { status: 401 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Please submit valid profile information." },
        { status: 400 }
      );
    }

    const name = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const address = String(body.address ?? "").trim();
    const city = String(body.city ?? "").trim();
    const state = String(body.state ?? "").trim();

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Your full name is required." },
        { status: 400 }
      );
    }

    if (name.length > 100 || phone.length > 40 || address.length > 500 || city.length > 100 || state.length > 100) {
      return NextResponse.json(
        { success: false, message: "One or more profile fields are too long." },
        { status: 400 }
      );
    }

    const updated = await db.user.update({
      where: { id: session.userId },
      data: {
        name,
        phone: phone || null,
        address: address || null,
        city: city || null,
        state: state || null,
      },
      select: profileSelect(),
    });

    // Refresh the signed session so the updated name appears in the navigation immediately.
    await createSession({
      userId: updated.id,
      role: updated.role,
      email: updated.email,
      name: updated.name,
    });

    return NextResponse.json({
      success: true,
      message: "Your profile has been updated.",
      profile: updated,
    });
  } catch (error) {
    console.error("Profile PATCH error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to update your profile." },
      { status: 500 }
    );
  }
}
