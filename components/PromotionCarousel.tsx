"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./PromotionCarousel.module.css";

type Promotion = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  image: string | null;
  ctaLabel: string;
  ctaHref: string;
  placement: string;
};

export default function PromotionCarousel({
  placement = "HOME",
}: {
  placement?: "HOME" | "SHOP";
}) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const response = await fetch(
          `/api/promotions?placement=${placement}`,
          { cache: "no-store" }
        );
        const data = await response.json();
        if (mounted && response.ok && data.success) {
          setPromotions(Array.isArray(data.promotions) ? data.promotions : []);
        }
      } catch (error) {
        console.error("Unable to load promotions:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [placement]);

  useEffect(() => {
    if (promotions.length < 2) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % promotions.length);
    }, 6500);

    return () => window.clearInterval(timer);
  }, [promotions.length]);

  if (loading || promotions.length === 0) return null;

  const promotion = promotions[activeIndex] ?? promotions[0];
  const isExternal = /^https:\/\//i.test(promotion.ctaHref);
  const image = promotion.image;

  return (
    <section
      className={`${styles.promotion} ${placement === "SHOP" ? styles.shopPromotion : styles.homePromotion}`}
      aria-label="Featured offers and upcoming products"
    >
      <div className={styles.inner} key={promotion.id}>
        <div className={styles.copy}>
          <span className={styles.kicker}>
            <span className={styles.liveDot} />
            {promotion.subtitle || "A little something new"}
          </span>
          <h2>{promotion.title}</h2>
          {promotion.description && <p>{promotion.description}</p>}
          {isExternal ? (
            <a className={styles.cta} href={promotion.ctaHref} target="_blank" rel="noreferrer">
              {promotion.ctaLabel} <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <Link className={styles.cta} href={promotion.ctaHref}>
              {promotion.ctaLabel} <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
        {image && (
          <div className={styles.imageWrap}>
            {/* The image URL is supplied by the store administrator. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" loading="lazy" />
            <span className={styles.imageGlow} />
          </div>
        )}
      </div>
      {promotions.length > 1 && (
        <div className={styles.controls} aria-label="Promotion slides">
          <button
            type="button"
            aria-label="Previous promotion"
            onClick={() => setActiveIndex((index) => (index - 1 + promotions.length) % promotions.length)}
          >
            ←
          </button>
          <div className={styles.dots}>
            {promotions.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={index === activeIndex ? styles.activeDot : styles.dot}
                aria-label={`Show promotion ${index + 1}`}
                aria-current={index === activeIndex ? "true" : undefined}
                onClick={() => setActiveIndex(index)}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Next promotion"
            onClick={() => setActiveIndex((index) => (index + 1) % promotions.length)}
          >
            →
          </button>
        </div>
      )}
    </section>
  );
}
