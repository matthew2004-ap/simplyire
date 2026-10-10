import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

const products = [
  {
    slug: "luxury-handbag",
    name: "Luxury Handbag",
    category: "Bags & Accessories",
    description:
      "A stylish everyday handbag designed to complement your outfit while keeping your essentials organized.",
    price: 25000,
    image:
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80",
    featured: true,
    stock: 10,
  },
  {
    slug: "signature-perfume",
    name: "Signature Perfume",
    category: "Perfumes",
    description:
      "A beautiful fragrance for everyday confidence and special occasions.",
    price: 18000,
    image:
      "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=900&q=80",
    featured: true,
    stock: 15,
  },
  {
    slug: "glossy-lip-gloss",
    name: "Glossy Lip Gloss",
    category: "Beauty",
    description:
      "A smooth and glossy lip product for a simple polished look.",
    price: 6500,
    image:
      "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=900&q=80",
    featured: true,
    stock: 25,
  },
  {
    slug: "self-care-face-mask",
    name: "Self-Care Face Mask",
    category: "Skincare",
    description:
      "A relaxing face mask for your personal self-care routine.",
    price: 7000,
    image:
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=80",
    featured: false,
    stock: 20,
  },
  {
    slug: "elegant-bracelet",
    name: "Elegant Bracelet",
    category: "Accessories",
    description:
      "A simple accessory that adds an elegant touch to your everyday style.",
    price: 5500,
    image:
      "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=900&q=80",
    featured: true,
    stock: 12,
  },
  {
    slug: "portable-mini-fan",
    name: "Portable Mini Fan",
    category: "Self-Care",
    description:
      "A compact rechargeable fan that is convenient for everyday use.",
    price: 12000,
    image:
      "https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?auto=format&fit=crop&w=900&q=80",
    featured: false,
    stock: 18,
  },
  {
    slug: "vanilla-body-mist",
    name: "Vanilla Body Mist",
    category: "Perfumes",
    description:
      "A sweet and refreshing body mist for everyday use.",
    price: 9500,
    image:
      "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=900&q=80",
    featured: true,
    stock: 20,
  },
  {
    slug: "rose-perfume",
    name: "Rose Blossom Perfume",
    category: "Perfumes",
    description:
      "A floral fragrance with a soft and elegant character.",
    price: 22000,
    image:
      "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=900&q=80",
    featured: false,
    stock: 14,
  },
  {
    slug: "lip-mask",
    name: "Hydrating Lip Mask",
    category: "Beauty",
    description:
      "A nourishing lip mask designed for a comfortable self-care routine.",
    price: 6000,
    image:
      "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&w=900&q=80",
    featured: true,
    stock: 30,
  },
  {
    slug: "skincare-set",
    name: "Daily Skincare Set",
    category: "Skincare",
    description:
      "A simple skincare collection for your everyday routine.",
    price: 28000,
    image:
      "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=80",
    featured: true,
    stock: 8,
  },
  {
    slug: "under-eye-mask",
    name: "Under-Eye Mask",
    category: "Skincare",
    description:
      "A relaxing under-eye care product for your self-care routine.",
    price: 7500,
    image:
      "https://images.unsplash.com/photo-1570554886111-e80fcca6a1d3?auto=format&fit=crop&w=900&q=80",
    featured: false,
    stock: 16,
  },
  {
    slug: "travel-cosmetic-bag",
    name: "Travel Cosmetic Bag",
    category: "Bags & Accessories",
    description:
      "A compact cosmetic bag for organizing your beauty essentials.",
    price: 9000,
    image:
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=80",
    featured: false,
    stock: 15,
  },
  {
    slug: "pearl-hair-clips",
    name: "Pearl Hair Clips",
    category: "Accessories",
    description:
      "Elegant hair clips designed to add a stylish finishing touch.",
    price: 4500,
    image:
      "https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&w=900&q=80",
    featured: false,
    stock: 25,
  },
  {
    slug: "silk-scrunchie-set",
    name: "Silk Scrunchie Set",
    category: "Accessories",
    description:
      "A beautiful set of soft scrunchies suitable for everyday styling.",
    price: 5000,
    image:
      "https://images.unsplash.com/photo-1590156206657-aec4d9a0b9b7?auto=format&fit=crop&w=900&q=80",
    featured: false,
    stock: 22,
  },
  {
    slug: "body-care-bundle",
    name: "Body Care Bundle",
    category: "Self-Care",
    description:
      "A collection of everyday body-care essentials.",
    price: 24000,
    image:
      "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&w=900&q=80",
    featured: true,
    stock: 10,
  },
  {
    slug: "compact-makeup-pouch",
    name: "Compact Makeup Pouch",
    category: "Bags & Accessories",
    description:
      "A practical pouch for carrying makeup and beauty essentials.",
    price: 8000,
    image:
      "https://images.unsplash.com/photo-1523779917675-b6ed3a42a561?auto=format&fit=crop&w=900&q=80",
    featured: false,
    stock: 18,
  },
  {
    slug: "glow-face-care-kit",
    name: "Glow Face Care Kit",
    category: "Skincare",
    description:
      "A convenient collection of face-care products for your routine.",
    price: 32000,
    image:
      "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=80",
    featured: true,
    stock: 7,
  },
  {
    slug: "everyday-tote-bag",
    name: "Everyday Tote Bag",
    category: "Bags & Accessories",
    description:
      "A versatile tote bag for school, work, shopping, and everyday activities.",
    price: 16000,
    image:
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=80",
    featured: true,
    stock: 12,
  },
  {
    slug: "fragrance-gift-set",
    name: "Fragrance Gift Set",
    category: "Perfumes",
    description:
      "A beautifully presented fragrance set suitable for gifting.",
    price: 30000,
    image:
      "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=900&q=80",
    featured: true,
    stock: 9,
  },
  {
    slug: "self-care-goodies-box",
    name: "Self-Care Goodies Box",
    category: "Self-Care",
    description:
      "A curated selection of small self-care essentials for a relaxing experience.",
    price: 20000,
    image:
      "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=900&q=80",
    featured: true,
    stock: 11,
  },
];
async function main() {
  console.log("🌸 Seeding Simplyire Essentials products...");

  for (const product of products) {
    await prisma.product.upsert({
      where: {
        slug: product.slug,
      },
      update: product,
      create: product,
    });
  }

  console.log(`✅ ${products.length} products added/updated.`);
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });