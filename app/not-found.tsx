import Link from "next/link";
export default function NotFound(){return <div className="empty-state container"><div className="empty-icon">404</div><h1>That page wandered off.</h1><p>Let&apos;s get you back to the good stuff.</p><Link href="/" className="btn btn-primary">Back home</Link></div>}
