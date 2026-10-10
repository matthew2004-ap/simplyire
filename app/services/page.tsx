import Link from "next/link";

export const metadata = { title: "Services" };

const services = [
  ["Curated Shopping", "A carefully selected range of beauty, self-care, accessories and lifestyle essentials in one place.", "01"],
  ["Gift Selection", "Need a thoughtful gift? We help you put together a simple, beautiful combination for birthdays, celebrations and everyday surprises.", "02"],
  ["Personal Shopping", "Tell us what you are looking for and our team can help you find the right product or combination.", "03"],
  ["Bulk & Event Orders", "Planning an event, bridal package, student community order or corporate gift? Ask about bulk options.", "04"]
];

export default function ServicesPage() {
  return <div className="page"><section className="page-hero"><div className="container"><span className="eyebrow">What we do</span><h1>Services made around<br />real everyday needs.</h1><p>Simplyire is growing beyond products into practical services that make shopping and gifting easier.</p></div></section><section className="section container service-list">{services.map(([title, text, num]) => <article className="service-row" key={num}><span className="service-num">{num}</span><div><h2>{title}</h2><p>{text}</p></div><Link href="/contact" className="circle-arrow">↗</Link></article>)}</section><section className="dark-band"><div className="container"><span className="eyebrow">Have an idea?</span><h2>Let&apos;s build something useful together.</h2><Link href="/contact" className="btn btn-light">Talk to us</Link></div></section></div>;
}
