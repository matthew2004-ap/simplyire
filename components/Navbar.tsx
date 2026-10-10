"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import AnnouncementBar from "@/components/AnnouncementBar";

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER" | "ADMIN";
};

const links = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/blog", label: "Journal" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { cartCount } = useCart();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const loadSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) {
        setUser(null);
        return;
      }
      const data = await response.json();
      setUser(data.success ? data.user : null);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // Refresh session on mount, focus and auth-change events.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSession();
    window.addEventListener("focus", loadSession);
    window.addEventListener("simplyire-auth-change", loadSession);
    return () => {
      window.removeEventListener("focus", loadSession);
      window.removeEventListener("simplyire-auth-change", loadSession);
    };
  }, [loadSession, pathname]);

  async function handleLogout() {
    try {
      setLoggingOut(true);
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setOpen(false);
      window.dispatchEvent(new Event("simplyire-auth-change"));
      router.push("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  const accountHref = user?.role === "ADMIN" ? "/admin" : "/dashboard";
  const accountLabel = user?.role === "ADMIN" ? "Administration" : "My orders";

  return (
    <header className="site-header">
      <AnnouncementBar />
      <nav className="nav container" aria-label="Main navigation">
        <Link href="/" className="brand" onClick={() => setOpen(false)} aria-label="Simplyire Essentials home">
          <span className="brand-script">Simplyire</span>
          <span className="brand-sub">ESSENTIALS</span>
        </Link>

        <button
          className="menu-btn"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          type="button"
        >
          {open ? "×" : "☰"}
        </button>

        <div className={`nav-links ${open ? "open" : ""}`}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? "active" : ""}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link href={accountHref} onClick={() => setOpen(false)} className={pathname.startsWith(accountHref) ? "active" : ""}>
                {accountLabel}
              </Link>
              {user.role === "CUSTOMER" && (
                <Link href="/profile" onClick={() => setOpen(false)} className={pathname === "/profile" ? "active" : ""}>
                  My profile
                </Link>
              )}
              <button
                type="button"
                className="nav-logout"
                disabled={loggingOut}
                onClick={handleLogout}
              >
                {loggingOut ? "Signing out…" : "Logout"}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setOpen(false)} className={pathname === "/login" ? "active" : ""}>
                Sign in
              </Link>
              <Link href="/register" onClick={() => setOpen(false)} className={pathname === "/register" ? "active" : ""}>
                Join
              </Link>
            </>
          )}
          <Link href="/cart" className="nav-cart" onClick={() => setOpen(false)} aria-label={`Shopping bag, ${cartCount} items`}>
            Bag <span>{cartCount}</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
