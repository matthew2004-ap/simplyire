import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

const MAX_PRODUCT_IMAGE_BYTES = 2 * 1024 * 1024;

function getImageValidationError(image: unknown) {
  if (typeof image !== "string" || !image.trim()) {
    return "Please provide all required product information.";
  }

  if (image.startsWith("data:")) {
    const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);

    if (!match) {
      return "Uploaded images must be JPG, PNG, or WebP.";
    }

    const base64 = match[2];
    const padding = base64.endsWith("==")
      ? 2
      : base64.endsWith("=")
        ? 1
        : 0;
    const imageBytes = Math.floor((base64.length * 3) / 4) - padding;

    if (imageBytes > MAX_PRODUCT_IMAGE_BYTES) {
      return "Uploaded images must be no larger than 2 MB.";
    }
  }

  return null;
}

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

/* =========================
   GET PRODUCTS
========================= */

export async function GET() {
  try {
    const auth = await requireAdmin();

    if (auth.error) {
      return auth.error;
    }

    const products = await db.product.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            orderItems: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      products,
    });
  } catch (error) {
    console.error(
      "Admin products GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load products.",
      },
      { status: 500 }
    );
  }
}

/* =========================
   CREATE PRODUCT
========================= */

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();

    if (auth.error) {
      return auth.error;
    }

    const body = await request.json();

    const {
      slug,
      name,
      category,
      description,
      price,
      image,
      featured,
      stock,
    } = body;

    const imageError = getImageValidationError(image);

    if (
      !slug?.trim() ||
      !name?.trim() ||
      !category?.trim() ||
      !description?.trim() ||
      imageError
    ) {
      return NextResponse.json(
        {
          success: false,
          message: imageError ||
            "Please provide all required product information.",
        },
        { status: 400 }
      );
    }

    const normalizedPrice = Number(price);
    const normalizedStock = Number(stock);

    if (
      !Number.isInteger(normalizedPrice) ||
      normalizedPrice < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Price must be a valid whole number.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(normalizedStock) ||
      normalizedStock < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Stock must be a valid non-negative whole number.",
        },
        { status: 400 }
      );
    }

    const normalizedSlug = slug
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");

    const existingProduct =
      await db.product.findUnique({
        where: {
          slug: normalizedSlug,
        },
      });

    if (existingProduct) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A product with this slug already exists.",
        },
        { status: 409 }
      );
    }

    const product = await db.product.create({
      data: {
        slug: normalizedSlug,
        name: name.trim(),
        category: category.trim(),
        description: description.trim(),
        price: normalizedPrice,
        image: image.trim(),
        featured: Boolean(featured),
        stock: normalizedStock,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Product created successfully.",
        product,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Admin products POST error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create product.",
      },
      { status: 500 }
    );
  }
}

/* =========================
   UPDATE PRODUCT
========================= */

export async function PUT(request: Request) {
  try {
    const auth = await requireAdmin();

    if (auth.error) {
      return auth.error;
    }

    const body = await request.json();

    const {
      id,
      slug,
      name,
      category,
      description,
      price,
      image,
      featured,
      stock,
    } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Product ID is required.",
        },
        { status: 400 }
      );
    }

    const existingProduct =
      await db.product.findUnique({
        where: {
          id,
        },
      });

    if (!existingProduct) {
      return NextResponse.json(
        {
          success: false,
          message: "Product not found.",
        },
        { status: 404 }
      );
    }

    const imageError = getImageValidationError(image);

    if (
      !slug?.trim() ||
      !name?.trim() ||
      !category?.trim() ||
      !description?.trim() ||
      imageError
    ) {
      return NextResponse.json(
        {
          success: false,
          message: imageError ||
            "Please provide all required product information.",
        },
        { status: 400 }
      );
    }

    const normalizedPrice = Number(price);
    const normalizedStock = Number(stock);

    if (
      !Number.isInteger(normalizedPrice) ||
      normalizedPrice < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Price must be a valid whole number.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(normalizedStock) ||
      normalizedStock < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Stock must be a valid non-negative whole number.",
        },
        { status: 400 }
      );
    }

    if (normalizedStock < existingProduct.reservedStock) {
      return NextResponse.json(
        {
          success: false,
          message: `Stock cannot be lower than the ${existingProduct.reservedStock} units currently reserved for customer orders.`,
        },
        { status: 400 }
      );
    }

    const normalizedSlug = slug
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");

    const duplicateSlug =
      await db.product.findFirst({
        where: {
          slug: normalizedSlug,
          NOT: {
            id,
          },
        },
      });

    if (duplicateSlug) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Another product already uses this slug.",
        },
        { status: 409 }
      );
    }

    const product = await db.product.update({
      where: {
        id,
      },
      data: {
        slug: normalizedSlug,
        name: name.trim(),
        category: category.trim(),
        description: description.trim(),
        price: normalizedPrice,
        image: image.trim(),
        featured: Boolean(featured),
        stock: normalizedStock,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Product updated successfully.",
      product,
    });
  } catch (error) {
    console.error(
      "Admin products PUT error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update product.",
      },
      { status: 500 }
    );
  }
}

/* =========================
   DELETE PRODUCT
========================= */

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
          message: "Product ID is required.",
        },
        { status: 400 }
      );
    }

    const product =
      await db.product.findUnique({
        where: {
          id,
        },
        include: {
          _count: {
            select: {
              orderItems: true,
            },
          },
        },
      });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Product not found.",
        },
        { status: 404 }
      );
    }

    /*
      Do not delete products that already
      belong to customer orders.
    */
    if (product._count.orderItems > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This product cannot be deleted because it is attached to existing orders. Update its stock instead.",
        },
        { status: 409 }
      );
    }

    await db.product.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Admin products DELETE error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete product.",
      },
      { status: 500 }
    );
  }
}