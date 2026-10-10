const faqs = [
  ["How do I place an order?", "Browse the shop, open a product and add it to your bag. The checkout flow can be connected to your preferred payment provider during backend setup."],
  ["Do you deliver across Nigeria?", "The site is designed for nationwide delivery. Final delivery locations, rates and timelines should be configured before launch."],
  ["Can I order for someone else?", "Yes. Gift orders can be supported; use the contact page for special requests until the full gifting workflow is connected."],
  ["Can I make a bulk order?", "Yes. Contact us for event, community, corporate or other bulk-order requests."],
  ["What payment provider will be used?", "The payment gateway is intentionally left configurable so the business can choose a provider such as Paystack or Flutterwave during backend installation."]
];
export default function FAQ(){return <div className="page"><section className="page-hero"><div className="container"><span className="eyebrow">Help</span><h1>Frequently asked questions.</h1></div></section><section className="section container faq">{faqs.map(([q,a])=><details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</section></div>}
