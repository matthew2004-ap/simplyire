import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms for shopping with Simplyire Essentials.",
};

export default function TermsPage() {
  return (
    <div className="page legal-page">
      <section className="page-hero"><div className="container"><span className="eyebrow">Shopping responsibly</span><h1>Terms of Service</h1><p>Last updated: 9 October 2026</p></div></section>
      <section className="section container legal-content">
        <p>These terms explain the basic conditions for using the Simplyire Essentials website. By using the store, you agree to provide accurate information and use the website lawfully.</p>
        <h2>Products and availability</h2>
        <p>Product descriptions, photos, prices and stock availability are displayed to help you make a purchase. Colours may vary slightly between screens. An order is subject to stock availability and successful payment confirmation.</p>
        <h2>Prices and payments</h2>
        <p>Prices are displayed in Nigerian naira unless stated otherwise. Delivery charges and the order total are displayed at checkout. A payment is considered confirmed only after the payment provider verifies it.</p>
        <h2>Orders and delivery</h2>
        <p>Please provide correct contact information and a complete delivery address. Processing and delivery times may vary by destination, stock availability and courier conditions. The store may contact you to clarify delivery details.</p>
        <h2>Accounts</h2>
        <p>You are responsible for keeping your account credentials private and for activity under your account. Contact the store if you believe that your account has been accessed without permission.</p>
        <h2>Website use</h2>
        <p>Do not attempt to disrupt the website, bypass access controls, submit fraudulent orders or misuse information belonging to other customers.</p>
        <h2>Updates</h2>
        <p>These terms may be updated as the store evolves. The date shown above indicates when this page was last revised.</p>
        <p><strong>Store owner note:</strong> Have the final terms reviewed for your actual business, applicable Nigerian law, delivery arrangements and payment practices before accepting real customer orders.</p>
      </section>
    </div>
  );
}
