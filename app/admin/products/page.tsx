"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";

type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  price: number;
  image: string;
  featured: boolean;
  stock: number;
  reservedStock?: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    orderItems: number;
  };
};

type ProductForm = {
  slug: string;
  name: string;
  category: string;
  description: string;
  price: string;
  image: string;
  featured: boolean;
  stock: string;
};

const emptyForm: ProductForm = {
  slug: "",
  name: "",
  category: "",
  description: "",
  price: "",
  image: "",
  featured: false,
  stock: "0",
};

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function generateSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function availableStock(product: Product) {
  return Math.max(0, product.stock - (product.reservedStock ?? 0));
}

function getStockClass(stock: number) {
  if (stock <= 0) {
    return `${styles.stockBadge} ${styles.stockOut}`;
  }

  if (stock <= 2) {
    return `${styles.stockBadge} ${styles.stockDanger}`;
  }

  if (stock <= 5) {
    return `${styles.stockBadge} ${styles.stockWarning}`;
  }

  return `${styles.stockBadge} ${styles.stockGood}`;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);

  const [form, setForm] =
    useState<ProductForm>(emptyForm);
  const [imageSource, setImageSource] =
    useState<"url" | "upload">("url");

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/admin/products",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to load products."
        );
      }

      setProducts(data.products);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load products."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Initial client-side fetch; state updates happen after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProducts();
  }, []);

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        products
          .map((product) =>
            product.category.trim()
          )
          .filter(Boolean)
      )
    ).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.name
          .toLowerCase()
          .includes(query) ||
        product.slug
          .toLowerCase()
          .includes(query) ||
        product.category
          .toLowerCase()
          .includes(query);

      const matchesCategory =
        category === "ALL" ||
        product.category === category;

      return (
        matchesSearch &&
        matchesCategory
      );
    });
  }, [products, search, category]);

  // Inventory summary: physical stock includes units currently reserved.
  const totalPhysicalStock = products.reduce(
    (sum, product) => sum + Math.max(0, product.stock),
    0
  );

  const totalReservedStock = products.reduce(
    (sum, product) => sum + Math.max(0, product.reservedStock ?? 0),
    0
  );

  const totalAvailableStock = products.reduce(
    (sum, product) => sum + availableStock(product),
    0
  );

  const lowStockCount = products.filter((product) => {
    const available = availableStock(product);
    return available > 0 && available <= 5;
  }).length;

  const outOfStockCount = products.filter(
    (product) => availableStock(product) <= 0
  ).length;

  const featuredCount = products.filter(
    (product) => product.featured
  ).length;

  function openCreateModal() {
    setEditingProduct(null);
    setForm(emptyForm);
    setImageSource("url");
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);

    setForm({
      slug: product.slug,
      name: product.name,
      category: product.category,
      description: product.description,
      price: String(product.price),
      image: product.image,
      featured: product.featured,
      stock: String(product.stock),
    });
    setImageSource(
      product.image.startsWith("data:image/")
        ? "upload"
        : "url"
    );

    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingProduct(null);
    setForm(emptyForm);
    setImageSource("url");
    setError("");
  }

  function handleImageSourceChange(
    source: "url" | "upload"
  ) {
    setImageSource(source);
    setForm((current) => ({
      ...current,
      image:
        source === "upload"
          ? current.image.startsWith("data:image/")
            ? current.image
            : ""
          : current.image.startsWith("data:image/")
            ? ""
            : current.image,
    }));
    setError("");
  }

  function handleImageFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Choose an image smaller than 2 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const imageData = reader.result;
      if (typeof imageData !== "string") {
        setError("The selected image could not be read.");
        return;
      }

      setForm((current) => ({
        ...current,
        image: imageData,
      }));
      setError("");
    };
    reader.onerror = () => {
      setError("The selected image could not be read.");
    };
    reader.readAsDataURL(file);
  }

  function updateForm(
    field: keyof ProductForm,
    value: string | boolean
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleNameChange(value: string) {
    setForm((current) => ({
      ...current,
      name: value,
      slug:
        editingProduct
          ? current.slug
          : generateSlug(value),
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setNotice("");

      const payload = {
        ...(editingProduct
          ? { id: editingProduct.id }
          : {}),
        slug: generateSlug(form.slug),
        name: form.name.trim(),
        category: form.category.trim(),
        description:
          form.description.trim(),
        price: Number(form.price),
        image: form.image.trim(),
        featured: form.featured,
        stock: Number(form.stock),
      };

      const response = await fetch(
        "/api/admin/products",
        {
          method: editingProduct
            ? "PUT"
            : "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to save product."
        );
      }

      setNotice(
        editingProduct
          ? "Product updated successfully."
          : "Product created successfully."
      );

      setModalOpen(false);
      setEditingProduct(null);
      setForm(emptyForm);
      setImageSource("url");

      await loadProducts();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to save product."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(
    product: Product
  ) {
    const confirmed = window.confirm(
      `Delete "${product.name}"?\n\nThis cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setError("");
      setNotice("");

      const response = await fetch(
        `/api/admin/products?id=${encodeURIComponent(
          product.id
        )}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to delete product."
        );
      }

      setNotice(
        "Product deleted successfully."
      );

      await loadProducts();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete product."
      );
    }
  }

  return (
    <main className={styles.page}>
      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroTop}>
            <div>
              <Link
                href="/admin"
                className={styles.backLink}
              >
                ← Administration
              </Link>

              <span
                className={styles.eyebrow}
              >
                Inventory
              </span>

              <h1>
                Product Management
              </h1>

              <p>
                Manage your Simplyire
                Essentials catalogue, pricing,
                stock reservations and availability.
              </p>
            </div>

            <button
              type="button"
              className={styles.addButton}
              onClick={openCreateModal}
            >
              <span>＋</span>
              Add Product
            </button>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className={styles.statsSection}>
        <div className={styles.container}>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.pink}`}>📦</div>
              <div>
                <span>Total Products</span>
                <strong>{products.length}</strong>
                <small>In catalogue</small>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.green}`}>▣</div>
              <div>
                <span>Physical Stock</span>
                <strong>{totalPhysicalStock}</strong>
                <small>Units in inventory</small>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.orange}`}>↗</div>
              <div>
                <span>Reserved Stock</span>
                <strong>{totalReservedStock}</strong>
                <small>Held for pending orders</small>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.green}`}>✓</div>
              <div>
                <span>Available Stock</span>
                <strong>{totalAvailableStock}</strong>
                <small>Units available to order</small>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.orange}`}>⚠</div>
              <div>
                <span>Low Stock</span>
                <strong>{lowStockCount}</strong>
                <small>Products with 1–5 available</small>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.orange}`}>!</div>
              <div>
                <span>Out of Stock</span>
                <strong>{outOfStockCount}</strong>
                <small>Products unavailable to order</small>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.purple}`}>⭐</div>
              <div>
                <span>Featured</span>
                <strong>{featuredCount}</strong>
                <small>Featured products</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className={styles.content}>
        <div className={styles.container}>
          {notice && (
            <div
              className={
                styles.noticeSuccess
              }
            >
              ✓ {notice}
            </div>
          )}

          {error && !modalOpen && (
            <div
              className={
                styles.noticeError
              }
            >
              ⚠ {error}
            </div>
          )}

          <div className={styles.panel}>
            {/* TOOLBAR */}
            <div
              className={styles.toolbar}
            >
              <div>
                <span
                  className={
                    styles.panelEyebrow
                  }
                >
                  Catalogue
                </span>

                <h2>
                  All Products
                </h2>

                <p>
                  {filteredProducts.length}{" "}
                  of {products.length}{" "}
                  products shown.
                </p>
              </div>

              <div
                className={
                  styles.filters
                }
              >
                <div
                  className={
                    styles.search
                  }
                >
                  <span>⌕</span>

                  <input
                    type="search"
                    placeholder="Search products..."
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                  />
                </div>

                <select
                  className={
                    styles.select
                  }
                  value={category}
                  onChange={(event) =>
                    setCategory(
                      event.target.value
                    )
                  }
                >
                  <option value="ALL">
                    All categories
                  </option>

                  {categories.map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            {/* LOADING */}
            {loading && (
              <div
                className={
                  styles.empty
                }
              >
                <div
                  className={
                    styles.loader
                  }
                >
                  <span />
                  <span />
                  <span />
                </div>

                <h3>
                  Loading products...
                </h3>

                <p>
                  Getting the latest
                  catalogue.
                </p>
              </div>
            )}

            {/* EMPTY */}
            {!loading &&
              filteredProducts.length ===
                0 && (
                <div
                  className={
                    styles.empty
                  }
                >
                  <div
                    className={
                      styles.emptyIcon
                    }
                  >
                    🛍️
                  </div>

                  <h3>
                    No products found
                  </h3>

                  <p>
                    Try changing your
                    search or category
                    filter.
                  </p>
                </div>
              )}

            {/* DESKTOP TABLE */}
            {!loading &&
              filteredProducts.length >
                0 && (
                <div
                  className={
                    styles.tableWrapper
                  }
                >
                  <table
                    className={
                      styles.table
                    }
                  >
                    <thead>
                      <tr>
                        <th>
                          Product
                        </th>
                        <th>
                          Category
                        </th>
                        <th>
                          Price
                        </th>
                        <th>Physical Stock</th>
                        <th>Reserved</th>
                        <th>Available</th>
                        <th>Featured</th>
                        <th />
                      </tr>
                    </thead>

                    <tbody>
                      {filteredProducts.map(
                        (product) => (
                          <tr
                            key={
                              product.id
                            }
                          >
                            <td>
                              <div
                                className={
                                  styles.productCell
                                }
                              >
                                <img
                                  src={
                                    product.image
                                  }
                                  alt={
                                    product.name
                                  }
                                />

                                <div>
                                  <strong>
                                    {
                                      product.name
                                    }
                                  </strong>

                                  <span>
                                    /
                                    {
                                      product.slug
                                    }
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td>
                              <span
                                className={
                                  styles.categoryBadge
                                }
                              >
                                {
                                  product.category
                                }
                              </span>
                            </td>

                            <td>
                              <strong
                                className={
                                  styles.price
                                }
                              >
                                {formatNaira(
                                  product.price
                                )}
                              </strong>
                            </td>

                            <td>
                              <strong>{product.stock}</strong>
                              <small style={{ display: "block", marginTop: 4, color: "#9a858d", fontSize: 10 }}>
                                Physical units
                              </small>
                            </td>

                            <td>
                              <strong>{Math.max(0, product.reservedStock ?? 0)}</strong>
                              <small style={{ display: "block", marginTop: 4, color: "#9a858d", fontSize: 10 }}>
                                Reserved units
                              </small>
                            </td>

                            <td>
                              <span className={getStockClass(availableStock(product))}>
                                {availableStock(product) <= 0
                                  ? "Out of stock"
                                  : `${availableStock(product)} available`}
                              </span>
                              {availableStock(product) > 0 && availableStock(product) <= 5 && (
                                <small style={{ display: "block", marginTop: 4, color: "#a65c22", fontSize: 10 }}>
                                  Low-stock alert
                                </small>
                              )}
                            </td>

                            <td>
                              {product.featured ? (
                                <span
                                  className={
                                    styles.featuredYes
                                  }
                                >
                                  ★ Featured
                                </span>
                              ) : (
                                <span
                                  className={
                                    styles.featuredNo
                                  }
                                >
                                  Standard
                                </span>
                              )}
                            </td>

                            <td>
                              <div
                                className={
                                  styles.rowActions
                                }
                              >
                                <button
                                  type="button"
                                  className={
                                    styles.editButton
                                  }
                                  onClick={() =>
                                    openEditModal(
                                      product
                                    )
                                  }
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  className={
                                    styles.deleteButton
                                  }
                                  onClick={() =>
                                    handleDelete(
                                      product
                                    )
                                  }
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}

            {/* MOBILE CARDS */}
            {!loading &&
              filteredProducts.length >
                0 && (
                <div
                  className={
                    styles.mobileProducts
                  }
                >
                  {filteredProducts.map(
                    (product) => (
                      <article
                        key={product.id}
                        className={
                          styles.mobileCard
                        }
                      >
                        <img
                          src={
                            product.image
                          }
                          alt={
                            product.name
                          }
                        />

                        <div
                          className={
                            styles.mobileProductMain
                          }
                        >
                          <div>
                            <strong>
                              {
                                product.name
                              }
                            </strong>

                            <span>
                              {
                                product.category
                              }
                            </span>
                          </div>

                          <strong>
                            {formatNaira(
                              product.price
                            )}
                          </strong>
                        </div>

                        <div
                          style={{
                            clear: "both",
                            display: "grid",
                            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                            gap: 8,
                            paddingTop: 14,
                          }}
                        >
                          <div style={{ border: "1px solid #f0e3e8", borderRadius: 10, padding: "10px 8px" }}>
                            <small style={{ display: "block", color: "#9b878e", fontSize: 10 }}>Physical</small>
                            <strong style={{ display: "block", marginTop: 4 }}>{product.stock}</strong>
                          </div>
                          <div style={{ border: "1px solid #f0e3e8", borderRadius: 10, padding: "10px 8px" }}>
                            <small style={{ display: "block", color: "#9b878e", fontSize: 10 }}>Reserved</small>
                            <strong style={{ display: "block", marginTop: 4 }}>{Math.max(0, product.reservedStock ?? 0)}</strong>
                          </div>
                          <div style={{ border: "1px solid #f0e3e8", borderRadius: 10, padding: "10px 8px" }}>
                            <small style={{ display: "block", color: "#9b878e", fontSize: 10 }}>Available</small>
                            <strong style={{ display: "block", marginTop: 4 }}>{availableStock(product)}</strong>
                          </div>
                        </div>

                        <div className={styles.mobileMeta}>
                          <span className={getStockClass(availableStock(product))}>
                            {availableStock(product) <= 0
                              ? "Out of stock"
                              : availableStock(product) <= 5
                              ? "Low stock"
                              : "In stock"}
                          </span>

                          {product.featured && (
                            <span className={styles.featuredYes}>
                              ★ Featured
                            </span>
                          )}
                        </div>

                        <div
                          className={
                            styles.mobileActions
                          }
                        >
                          <button
                            type="button"
                            className={
                              styles.editButton
                            }
                            onClick={() =>
                              openEditModal(
                                product
                              )
                            }
                          >
                            Edit Product
                          </button>

                          <button
                            type="button"
                            className={
                              styles.deleteButton
                            }
                            onClick={() =>
                              handleDelete(
                                product
                              )
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    )
                  )}
                </div>
              )}
          </div>
        </div>
      </section>

      {/* PRODUCT MODAL */}
      {modalOpen && (
        <div
          className={
            styles.modalBackdrop
          }
          onClick={closeModal}
        >
          <div
            className={
              styles.modal
            }
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div
              className={
                styles.modalHeader
              }
            >
              <div>
                <span
                  className={
                    styles.panelEyebrow
                  }
                >
                  {editingProduct
                    ? "Catalogue"
                    : "New Product"}
                </span>

                <h2>
                  {editingProduct
                    ? "Edit Product"
                    : "Add Product"}
                </h2>

                <p>
                  {editingProduct
                    ? "Update product details and inventory."
                    : "Add a new product to your store."}
                </p>
              </div>

              <button
                type="button"
                className={
                  styles.closeButton
                }
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className={
                styles.form
              }
            >
              {error && (
                <div
                  className={
                    styles.formError
                  }
                >
                  ⚠ {error}
                </div>
              )}

              <div
                className={
                  styles.formGrid
                }
              >
                <div
                  className={
                    styles.field
                  }
                >
                  <label>
                    Product Name
                  </label>

                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      handleNameChange(
                        event.target.value
                      )
                    }
                    placeholder="e.g. Glow Face Care Kit"
                    required
                  />
                </div>

                <div
                  className={
                    styles.field
                  }
                >
                  <label>
                    Category
                  </label>

                  <input
                    type="text"
                    value={
                      form.category
                    }
                    onChange={(event) =>
                      updateForm(
                        "category",
                        event.target.value
                      )
                    }
                    placeholder="e.g. Skincare"
                    required
                  />
                </div>
              </div>

              <div
                className={
                  styles.field
                }
              >
                <label>
                  Slug
                </label>

                <input
                  type="text"
                  value={form.slug}
                  onChange={(event) =>
                    updateForm(
                      "slug",
                      generateSlug(
                        event.target
                          .value
                      )
                    )
                  }
                  placeholder="glow-face-care-kit"
                  required
                />

                <small>
                  Used for the product URL.
                </small>
              </div>

              <div
                className={
                  styles.formGrid
                }
              >
                <div
                  className={
                    styles.field
                  }
                >
                  <label>
                    Price (₦)
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.price}
                    onChange={(event) =>
                      updateForm(
                        "price",
                        event.target.value
                      )
                    }
                    placeholder="32000"
                    required
                  />
                </div>

                <div
                  className={
                    styles.field
                  }
                >
                  <label>
                    Stock
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.stock}
                    onChange={(event) =>
                      updateForm(
                        "stock",
                        event.target.value
                      )
                    }
                    placeholder="10"
                    required
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label>Product Image</label>

                <div
                  className={styles.imageSourceOptions}
                  role="group"
                  aria-label="Choose how to add a product image"
                >
                  <button
                    type="button"
                    className={
                      imageSource === "url"
                        ? `${styles.imageSourceButton} ${styles.imageSourceActive}`
                        : styles.imageSourceButton
                    }
                    aria-pressed={imageSource === "url"}
                    onClick={() =>
                      handleImageSourceChange("url")
                    }
                  >
                    Enter image URL
                  </button>
                  <button
                    type="button"
                    className={
                      imageSource === "upload"
                        ? `${styles.imageSourceButton} ${styles.imageSourceActive}`
                        : styles.imageSourceButton
                    }
                    aria-pressed={imageSource === "upload"}
                    onClick={() =>
                      handleImageSourceChange("upload")
                    }
                  >
                    Upload from this device
                  </button>
                </div>

                {imageSource === "url" ? (
                  <input
                    type="url"
                    value={form.image}
                    onChange={(event) =>
                      updateForm("image", event.target.value)
                    }
                    placeholder="https://..."
                    aria-label="Product image URL"
                    required
                  />
                ) : (
                  <>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageFileChange}
                      aria-label="Choose product image from this device"
                      required={!form.image}
                    />
                    <small>
                      JPG, PNG, or WebP; maximum file size 2 MB.
                    </small>
                  </>
                )}

                {form.image && (
                  <div className={styles.imagePreview}>
                    <img
                      src={form.image}
                      alt="Product preview"
                    />
                  </div>
                )}
              </div>

              <div
                className={
                  styles.field
                }
              >
                <label>
                  Description
                </label>

                <textarea
                  value={
                    form.description
                  }
                  onChange={(event) =>
                    updateForm(
                      "description",
                      event.target.value
                    )
                  }
                  placeholder="Describe the product..."
                  rows={5}
                  required
                />
              </div>

              <label
                className={
                  styles.featuredToggle
                }
              >
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(event) =>
                    updateForm(
                      "featured",
                      event.target.checked
                    )
                  }
                />

                <span
                  className={
                    styles.checkbox
                  }
                />

                <span>
                  <strong>
                    Feature this product
                  </strong>

                  <small>
                    Show this item in
                    featured product
                    sections.
                  </small>
                </span>
              </label>

              <div
                className={
                  styles.formActions
                }
              >
                <button
                  type="button"
                  className={
                    styles.cancelButton
                  }
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={
                    styles.saveButton
                  }
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingProduct
                    ? "Save Changes"
                    : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}