import Link from "next/link";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="page">
      <section className="page-hero"><div className="container"><span className="eyebrow">Our story</span><h1>More than a shop.<br />A little corner of confidence.</h1><p>Simplyire Essentials exists to make everyday self-care easier, prettier and more accessible.</p></div></section>
      <section className="section container split"><img className="rounded-image" src="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1100&q=85" alt="Beauty and self-care scene" /><div><span className="eyebrow">What we believe</span><h2>The everyday deserves a little sparkle.</h2><p>We started with a simple idea: finding the small things that make you feel good shouldn&apos;t feel stressful. So we curate practical essentials, beauty treats and accessories that fit real everyday life.</p><p>From a fragrance before a big day to a bag that carries everything you need, Simplyire is here for the moments in between.</p></div></section>
      <section className="values"><div className="container values-grid">{[["01","Quality","Products selected with care and attention to the details that matter."],["02","Confidence","We want every purchase to help you feel prepared, comfortable and yourself."],["03","Accessibility","Good self-care should feel approachable, useful and worth the money."],["04","Community","We are building a brand that listens, learns and grows with its customers."]].map(v => <div key={v[0]} className="value"><span>{v[0]}</span><h3>{v[1]}</h3><p>{v[2]}</p></div>)}</div></section>
      <section className="cta-section container"><h2>Ready to find your little something?</h2><Link href="/shop" className="btn btn-primary">Explore the shop</Link></section>
    </div>
  );
}
