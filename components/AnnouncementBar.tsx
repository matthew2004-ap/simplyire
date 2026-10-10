"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Announcement = {
  id: string;
  title: string;
  ctaLabel: string;
  ctaHref: string;
};

export default function AnnouncementBar() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let active = true;
    fetch("/api/promotions?placement=ANNOUNCEMENT", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (active && data.success && Array.isArray(data.promotions)) {
          setItems(data.promotions);
        }
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (items.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % items.length), 5500);
    return () => window.clearInterval(timer);
  }, [items.length]);

  const item = items[index];
  if (!item) {
    return <div className="announcement"><span className="announcement-sparkle" aria-hidden="true">✦</span> Little things. Big confidence. Free delivery on selected orders. <span className="announcement-sparkle" aria-hidden="true">✦</span></div>;
  }

  const external = /^https:\/\//i.test(item.ctaHref);
  return (
    <div className="announcement announcement-live" key={item.id}>
      <span className="announcement-sparkle" aria-hidden="true">✦</span>
      <span>{item.title}</span>
      {external ? <a href={item.ctaHref} target="_blank" rel="noreferrer">{item.ctaLabel} ↗</a> : <Link href={item.ctaHref}>{item.ctaLabel} →</Link>}
      <span className="announcement-sparkle" aria-hidden="true">✦</span>
    </div>
  );
}
