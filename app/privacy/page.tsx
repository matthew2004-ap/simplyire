import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Learn how Simplyire Essentials handles customer information.",
};

export default function PrivacyPage() {
  return (
    <div className="page legal-page">
      <section className="page-hero"><div className="container"><span className="eyebrow">Your information</span><h1>Privacy Policy</h1><p>Last updated: 9 October 2026</p></div></section>
      <section className="section container legal-content">
        <p>Simplyire Essentials respects your privacy. This page explains the information the store may collect when you browse, contact us, subscribe to updates, create an account or place an order.</p>
        <h2>Information we collect</h2>
        <p>We may collect account details such as your name and email address, contact and delivery details you provide at checkout, order and payment-reference information, messages sent through our contact form, and newsletter subscription addresses.</p>
        <h2>How we use information</h2>
        <p>We use the information to create and secure your account, process orders, arrange delivery, respond to enquiries, send requested updates, prevent misuse and maintain store records.</p>
        <h2>Payments</h2>
        <p>Payments are processed by Paystack. The store uses transaction references and payment confirmations to reconcile orders. Do not send card PINs, passwords or one-time passcodes through the contact form or email.</p>
        <h2>Sharing and retention</h2>
        <p>Information may be shared with service providers necessary to operate the store, such as hosting, database, payment and delivery providers. We retain records for as long as needed for order fulfilment, support, security and applicable legal obligations.</p>
        <h2>Your choices</h2>
        <p>You may contact the store to ask about the personal information associated with your account or to request correction. Newsletter subscribers may contact us to request removal. We will verify requests where necessary.</p>
        <h2>Cookies and security</h2>
        <p>The site uses a secure session cookie for authentication and browser storage for the shopping cart. No internet service can guarantee absolute security, so please use a strong unique password and sign out on shared devices.</p>
        <h2>Contact</h2>
        <p>For privacy questions, use the <a href="/contact">Contact page</a>. Before launching, replace this template with the store&apos;s verified business contact details and ensure it reflects your actual practices.</p>
      </section>
    </div>
  );
}
