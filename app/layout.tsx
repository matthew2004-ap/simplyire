import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CartProvider } from "@/context/CartContext";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Simplyire Essentials | Self-Care, Beauty & Everyday Essentials",
    template: "%s | Simplyire Essentials",
  },
  description:
    "Your one-stop shop for girly essentials, self-care, beauty, bags and accessories.",
  keywords: [
    "Simplyire Essentials",
    "beauty",
    "self-care",
    "bags",
    "accessories",
    "Nigeria",
  ],
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