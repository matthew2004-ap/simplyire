"use client";

import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();
  const socials = [
    { label: "Instagram", href: process.env.NEXT_PUBLIC_INSTAGRAM_URL },
    { label: "WhatsApp", href: process.env.NEXT_PUBLIC_WHATSAPP_URL },
    { label: "TikTok", href: process.env.NEXT_PUBLIC_TIKTOK_URL },
  ].filter((item) => item.href && item.href.trim());

  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <Link href="/" className="brand footer-brand">
            <span className="brand-script">Simplyire</span>
            <span className="brand-sub">ESSENTIALS</span>
          </Link>
          <p>Self-care, beauty and everyday essentials curated to make the little things feel special.</p>
        </div>
        <div>
          <h4>Explore</h4>
          <Link href="/shop">Shop all</Link>
          <Link href="/about">Our story</Link>
          <Link href="/services">Services</Link>
          <Link href="/blog">Journal</Link>
        </div>
        <div>
          <h4>Help & policies</h4>
          <Link href="/contact">Contact us</Link>
          <Link href="/shipping">Shipping</Link>
          <Link href="/returns">Returns & refunds</Link>
          <Link href="/faq">FAQs</Link>
        </div>
        <div>
          <h4>Stay in the know</h4>
          <p>New drops, self-care ideas and special offers.</p>
          <div className="footer-socials">
            {socials.length ? socials.map((social) => (
              <a key={social.label} href={social.href} target="_blank" rel="noreferrer">{social.label}</a>
            )) : <span>Follow links can be added in your environment settings.</span>}
          </div>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {year} Simplyire Essentials. All rights reserved.</span>
        <div className="footer-legal"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div>
        <span>Made with care in Nigeria 🇳🇬</span>
      </div>
    </footer>
  );
}
