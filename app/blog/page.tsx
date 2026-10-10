import Link from "next/link";

const posts = [
  { slug: "simple-self-care-routine", title: "A simple self-care routine for busy days", category: "Self-care", image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=85", text: "Small habits can make ordinary days feel a little better." },
  { slug: "how-to-choose-a-signature-scent", title: "How to choose a scent that feels like you", category: "Beauty", image: "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1000&q=85", text: "A beginner-friendly guide to understanding fragrance families." },
  { slug: "everyday-bag-essentials", title: "The everyday bag essentials we actually use", category: "Lifestyle", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=85", text: "Useful, realistic things worth keeping close." }
];

export default function BlogPage() {
  return <div className="page"><section className="page-hero"><div className="container"><span className="eyebrow">The journal</span><h1>Little notes for<br />everyday living.</h1><p>Self-care ideas, beauty guides, product stories and practical inspiration.</p></div></section><section className="section container blog-grid">{posts.map(post => <article className="blog-card" key={post.slug}><Link href={`/blog/${post.slug}`}><img src={post.image} alt={post.title} /></Link><div><span className="eyebrow">{post.category}</span><h2><Link href={`/blog/${post.slug}`}>{post.title}</Link></h2><p>{post.text}</p><Link href={`/blog/${post.slug}`} className="text-link">Read article →</Link></div></article>)}</section></div>;
}
