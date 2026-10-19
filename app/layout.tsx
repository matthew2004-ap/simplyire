import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CartProvider } from "@/context/CartContext";
import "./globals.css";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://simplyire.vercel.app"
).replace(/\/+$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "Simplyire Essentials | Beauty & Self-Care",
    template: "%s | Simplyire Essentials",
  },

  description:
    "Shop beauty products, skincare, fragrances, lip care, bags and accessories at Simplyire Essentials.",

  verification: {
    google: "KrTTH6r6LGM0qdo32L43t79k2oapuOhzyWOXJcLxZMU",
  },

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Simplyire Essentials",
    title: "Simplyire Essentials | Beauty & Self-Care",
    description:
      "Discover beauty, self-care, fragrances, bags and accessories at Simplyire Essentials.",
    locale: "en_NG",
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <Navbar />
          <div className="site-main">{children}</div>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}