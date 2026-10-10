import Link from "next/link";
import type { Product } from "@/lib/product-types";
import { formatNaira } from "@/lib/utils";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <Link href={`/shop/${product.slug}`} className="product-image-wrap">
        <img src={product.image} alt={product.name} className="product-image" />
        {product.featured && <span className="badge">Featured</span>}
      </Link>
      <div className="product-info">
        <span className="eyebrow">{product.category}</span>
        <Link href={`/shop/${product.slug}`}><h3>{product.name}</h3></Link>
        <div className="product-row">
          <strong>{formatNaira(product.price)}</strong>
          <Link href={`/shop/${product.slug}`} className="text-link">View →</Link>
        </div>
      </div>
    </article>
  );
}
