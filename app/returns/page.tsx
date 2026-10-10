import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Returns & Refunds",
  description: "Guidance for order issues, returns and refunds at Simplyire Essentials.",
};

export default function ReturnsPage() {
  return (
    <div className="page legal-page">
      <section className="page-hero"><div className="container"><span className="eyebrow">We&apos;re here to help</span><h1>Returns & Refunds</h1><p>Read this policy before placing an order.</p></div></section>
      <section className="section container legal-content">
        <p>If there is an issue with an order, contact Simplyire Essentials with your order number, the email used at checkout and a clear description of the issue.</p>
        <h2>Report an issue</h2>
        <p>Please contact the store as soon as reasonably possible if an item arrives damaged, incorrect or missing. Include clear photos when relevant so the team can review the issue.</p>
        <h2>Eligibility and review</h2>
        <p>Returns and remedies depend on the condition of the item, the nature of the issue, product hygiene requirements and applicable consumer-protection rules. Some personal-care, beauty and hygiene items may not be suitable for return once opened, except where required by law or where the item is faulty.</p>
        <h2>Refunds</h2>
        <p>When a refund is approved, it should be handled through the original payment method where possible. Processing times depend on the payment provider and financial institution. Do not treat a refund request as approved until the store confirms it.</p>
        <h2>Order cancellation</h2>
        <p>Contact the store promptly to request cancellation. Orders already being prepared or handed to a courier may not always be cancellable. A paid order must not be marked cancelled in the admin system until any required refund or remedy has been addressed.</p>
        <h2>Contact</h2>
        <p>Use the <a href="/contact">Contact page</a> to discuss an order. The store owner should replace this guidance with the actual approved returns window, contact details, shipping responsibilities and refund procedure before launch.</p>
      </section>
    </div>
  );
}
