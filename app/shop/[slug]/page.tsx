import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/utils";
import AddToCartButton from "@/components/AddToCartButton";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const databaseProduct = await db.product.findUnique({
    where: { slug },
  });
  const product = databaseProduct
    ? { ...databaseProduct, stock: Math.max(0, databaseProduct.stock - databaseProduct.reservedStock) }
    : null;

  if (!product) {
    notFound();
  }

  return (
    <div className="page">
      {/* Breadcrumbs */}
      <div className="container breadcrumbs">
        <Link href="/shop">Shop</Link> / {product.category} /{" "}
        {product.name}
      </div>

      {/* Product Details */}
      <section className="product-detail container">
        {/* Product Image */}
        <div className="detail-image">
          <img
            src={product.image}
            alt={product.name}
          />
        </div>

        {/* Product Information */}
        <div className="detail-copy">
          <span className="eyebrow">
            {product.category}
          </span>

          <h1>{product.name}</h1>

          <div className="detail-price">
            {formatNaira(product.price)}
          </div>

          <p>{product.description}</p>

          {/* Real Cart Controls */}
          <AddToCartButton product={product} />

          {/* Product Notes */}
          <div className="detail-notes">
            <span>♡ Carefully selected</span>
            <span>✓ Quality checked</span>
            <span>🚚 Nationwide delivery</span>
          </div>

          {/* Stock Status */}
          <div className="stock-status">
            {product.stock > 0
              ? `${product.stock} available`
              : "Currently out of stock"}
          </div>
        </div>
      </section>
    </div>
  );
}