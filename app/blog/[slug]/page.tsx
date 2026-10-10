import { notFound } from "next/navigation";
import Link from "next/link";

const posts: Record<string, {title:string; category:string; image:string; paragraphs:string[]}> = {
  "simple-self-care-routine": { title:"A simple self-care routine for busy days", category:"Self-care", image:"https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1400&q=85", paragraphs:["Self-care does not need to be a complicated checklist. The goal is to create small moments that help you reset and feel ready for what comes next.","Start with one simple thing you can repeat: a calm shower, skincare, a few minutes away from your phone, or preparing the things you need for the next day.","The best routine is one that fits your actual life. Keep it simple, make it enjoyable and give yourself permission to change it when your needs change."] },
  "how-to-choose-a-signature-scent": { title:"How to choose a scent that feels like you", category:"Beauty", image:"https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1400&q=85", paragraphs:["Choosing fragrance is personal. There is no single scent that everyone should wear, and you do not need to know every fragrance term to find one you enjoy.","Try a few different scent families and pay attention to what you naturally reach for. Give a fragrance time on your skin instead of deciding only from the first spray.","Most importantly, choose what you enjoy. Your fragrance is an accessory, not a rulebook."] },
  "everyday-bag-essentials": { title:"The everyday bag essentials we actually use", category:"Lifestyle", image:"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1400&q=85", paragraphs:["A useful everyday bag should make life easier rather than become a second suitcase.","Start with the basics you genuinely use: your phone, keys, wallet, small personal-care items and anything you need for your day. A compact pouch can keep smaller items organized.","The best setup changes depending on your routine. Build your bag around your day, not around a list of things you think you are supposed to carry."] }
};

export function generateStaticParams(){ return Object.keys(posts).map(slug => ({slug})); }

export default async function Article({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params; const post=posts[slug]; if(!post) notFound();
  return <article className="article"><div className="container article-head"><span className="eyebrow">{post.category}</span><h1>{post.title}</h1></div><img className="article-cover" src={post.image} alt={post.title}/><div className="article-body">{post.paragraphs.map((p,i)=><p key={i}>{p}</p>)}<Link href="/blog" className="text-link">← Back to journal</Link></div></article>;
}
