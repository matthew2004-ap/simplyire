import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

async function requireAdmin() {
  const session = await getSession();

  if (!session) {
    return {
      error: NextResponse.json(
        {
          success: false,
          message: "You must be logged in.",
        },
        { status: 401 }
      ),
    };
  }

  if (session.role !== "ADMIN") {
    return {
      error: NextResponse.json(
        {
          success: false,
          message: "Admin access required.",
        },
        { status: 403 }
      ),
    };
  }

  return { session };
}

export async function GET() {
  try {
    const auth = await requireAdmin();

    if (auth.error) {
      return auth.error;
    }

    const messages =
      await db.contactMessage.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });

    return NextResponse.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error(
      "Admin messages GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load messages.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAdmin();

    if (auth.error) {
      return auth.error;
    }

    const { searchParams } =
      new URL(request.url);

    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Message ID is required.",
        },
        { status: 400 }
      );
    }

    const message =
      await db.contactMessage.findUnique({
        where: {
          id,
        },
      });

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          message: "Message not found.",
        },
        { status: 404 }
      );
    }

    await db.contactMessage.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Message deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Admin messages DELETE error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete message.",
      },
      { status: 500 }
    );
  }
}