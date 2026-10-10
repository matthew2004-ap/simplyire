import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

const allowedPlacements = new Set(["HOME", "SHOP", "ANNOUNCEMENT"]);

type PromotionInput = {
  id?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  image?: string;
  ctaLabel?: string;
  ctaHref?: string;
  placement?: string;
  isActive?: boolean;
  sortOrder?: number;
  startsAt?: string | null;
  endsAt?: string | null;
};

async function adminResponse() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "You must be logged in." }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ success: false, message: "Admin access required." }, { status: 403 });
  }
  return null;
}

function validHref(value: string) {
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function validateInput(body: PromotionInput) {
  const title = String(body.title ?? "").trim();
  const ctaHref = String(body.ctaHref ?? "/shop").trim();
  const placement = String(body.placement ?? "HOME").toUpperCase();
  const sortOrder = Number(body.sortOrder ?? 0);
  const startsAt = parseDate(body.startsAt);
  const endsAt = parseDate(body.endsAt);

  if (!title) return { error: "Promotion title is required." };
  if (title.length > 120) return { error: "Title must be 120 characters or fewer." };
  if (!allowedPlacements.has(placement)) return { error: "Choose a valid advert placement." };
  if (!validHref(ctaHref)) return { error: "CTA link must be a site path (for example /shop) or an HTTPS URL." };
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000) return { error: "Sort order must be a non-negative whole number." };
  if (startsAt === undefined || endsAt === undefined) return { error: "Please provide valid schedule dates." };
  if (startsAt && endsAt && endsAt <= startsAt) return { error: "End date must be later than start date." };

  const image = String(body.image ?? "").trim();
  if (image) {
    try {
      if (new URL(image).protocol !== "https:") return { error: "Image URL must use HTTPS." };
    } catch {
      return { error: "Please enter a valid HTTPS image URL." };
    }
  }

  return {
    value: {
      title,
      subtitle: String(body.subtitle ?? "").trim() || null,
      description: String(body.description ?? "").trim() || null,
      image: image || null,
      ctaLabel: String(body.ctaLabel ?? "Shop now").trim().slice(0, 40) || "Shop now",
      ctaHref,
      placement,
      isActive: Boolean(body.isActive),
      sortOrder,
      startsAt,
      endsAt,
    },
  };
}

export async function GET() {
  try {
    const authError = await adminResponse();
    if (authError) return authError;

    const promotions = await db.promotion.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ success: true, promotions });
  } catch (error) {
    console.error("Admin promotions GET error:", error);
    return NextResponse.json({ success: false, message: "Failed to load promotions." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authError = await adminResponse();
    if (authError) return authError;

    const body = (await request.json()) as PromotionInput;
    const validated = validateInput(body);
    if (validated.error || !validated.value) {
      return NextResponse.json({ success: false, message: validated.error }, { status: 400 });
    }

    const promotion = await db.promotion.create({ data: validated.value });
    return NextResponse.json({ success: true, message: "Promotion created.", promotion }, { status: 201 });
  } catch (error) {
    console.error("Admin promotions POST error:", error);
    return NextResponse.json({ success: false, message: "Failed to create promotion." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const authError = await adminResponse();
    if (authError) return authError;

    const body = (await request.json()) as PromotionInput;
    if (!body.id) {
      return NextResponse.json({ success: false, message: "Promotion ID is required." }, { status: 400 });
    }

    const existing = await db.promotion.findUnique({ where: { id: body.id } });
    if (!existing) {
      return NextResponse.json({ success: false, message: "Promotion not found." }, { status: 404 });
    }

    const validated = validateInput(body);
    if (validated.error || !validated.value) {
      return NextResponse.json({ success: false, message: validated.error }, { status: 400 });
    }

    const promotion = await db.promotion.update({ where: { id: body.id }, data: validated.value });
    return NextResponse.json({ success: true, message: "Promotion updated.", promotion });
  } catch (error) {
    console.error("Admin promotions PUT error:", error);
    return NextResponse.json({ success: false, message: "Failed to update promotion." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authError = await adminResponse();
    if (authError) return authError;

    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, message: "Promotion ID is required." }, { status: 400 });
    }

    const existing = await db.promotion.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, message: "Promotion not found." }, { status: 404 });
    }

    await db.promotion.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Promotion deleted." });
  } catch (error) {
    console.error("Admin promotions DELETE error:", error);
    return NextResponse.json({ success: false, message: "Failed to delete promotion." }, { status: 500 });
  }
}
