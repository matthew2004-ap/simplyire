"use client";

import { useEffect, useMemo, useState } from "react";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/lib/product-types";
import PromotionCarousel from "@/components/PromotionCarousel";

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

useEffect(() => {
  async function loadProducts() {
    try {
      setLoading(true);

      const res = await fetch("/api/products");

      if (!res.ok) {
        throw new Error("Failed to load products");
      }

      const data = await res.json();

      setProducts(
        Array.isArray(data.products) ? data.products : []
      );
    } catch (error) {
      console.error("Failed to load products:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  loadProducts();
}, []);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(products.map((product) => product.category)))],
    [products]
  );

  const filtered = useMemo(
    () =>
      products.filter(
        (product) =>
          (category === "All" || product.category === category) &&
          `${product.name} ${product.description}`.toLowerCase().includes(search.toLowerCase())
      ),
    [products, category, search]
  );

  if (loading) {
    return (
      <div className="page">
        <section className="page-hero">
          <div className="container">
            <span className="eyebrow">The collection</span>
            <h1>Shop your essentials.</h1>
            <p>Loading products from the catalog...</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      <section className="page-hero">
        <div className="container"><span className="eyebrow">The collection</span><h1>Shop your essentials.</h1><p>Beauty, self-care and everyday pieces selected with you in mind.</p></div>
      </section>
      <PromotionCarousel placement="SHOP" />
      <section className="section container">
        <div className="shop-toolbar">
          <div className="filters">{categories.map(c => <button key={c} onClick={() => setCategory(c)} className={category === c ? "filter active" : "filter"}>{c}</button>)}</div>
          <input className="search" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <p className="result-count">{filtered.length} product{filtered.length === 1 ? "" : "s"}</p>
        <div className="product-grid">{filtered.map(p => <ProductCard key={p.id} product={p} />)}</div>
      </section>
    </div>
  );
}
