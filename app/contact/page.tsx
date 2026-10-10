import ContactForm from "@/components/ContactForm";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_URL?.trim();

  return (
    <div className="page">
      <section className="page-hero"><div className="container"><span className="eyebrow">Get in touch</span><h1>We&apos;d love to hear from you.</h1><p>Questions about a product, an order, gifting or a partnership? Send us a message.</p></div></section>
      <section className="section container contact-grid">
        <div>
          <span className="eyebrow">Contact details</span>
          <h2>Let&apos;s talk.</h2>
          {email ? <div className="contact-detail"><strong>Email</strong><a href={`mailto:${email}`}>{email}</a></div> : <div className="contact-detail"><strong>Email</strong><span>Use the contact form and our team will follow up.</span></div>}
          {whatsapp ? <div className="contact-detail"><strong>WhatsApp</strong><a href={whatsapp} target="_blank" rel="noreferrer">Chat with Simplyire ↗</a></div> : null}
          <div className="contact-detail"><strong>Response time</strong><span>We aim to respond as soon as possible during business hours.</span></div>
          <p className="muted">For order questions, include your order number and the email used at checkout.</p>
        </div>
        <ContactForm />
      </section>
    </div>
  );
}
