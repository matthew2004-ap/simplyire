# Simplyire Essentials

A full-stack ecommerce storefront for beauty, self-care, fragrances, bags and everyday essentials. Built with Next.js App Router, React, TypeScript, PostgreSQL, Prisma 7, Paystack and Vercel.

## Included features

- Responsive Simplyire pink/cream storefront with subtle entrance, hover and product-ad animations; animations respect the visitor's reduced-motion preference.
- Product catalogue, category/search filters, product details, local-storage cart, checkout, delivery pricing and order creation.
- Paystack payment initialization, server-side verification and signed webhook handling.
- Inventory reservations, payment settlement and expired-reservation reconciliation.
- Customer authentication, editable profile/contact details, saved delivery information, account dashboard, individual order detail pages and private order tracking.
- Protected admin dashboard, product management, order management/fulfillment, customers, contact messages, newsletter subscribers and promotions.
- Admin-managed advertisements for the homepage, shop page and announcement bar, with image URLs, CTA buttons, active/draft state, start/end scheduling and sorting priority.
- Contact-form submissions and newsletter subscriptions saved to PostgreSQL; subscriber export is available from the admin panel. Outbound marketing email delivery needs a provider integration and is not preconfigured.
- Privacy, terms, returns/refunds, shipping and FAQ pages, metadata, robots and sitemap routes.
- PostgreSQL schema and versioned migrations, product seed script, and admin-promotion helper script.

## Before you start

Install a current Node.js LTS version supported by Next.js 16 and npm. You also need a PostgreSQL database. Paystack is only required to test payments; start with a Paystack test secret, never a live key.

## Quick start (Windows PowerShell)

1. Extract the ZIP and open the `simplyire` project folder in VS Code.
2. Create a local environment file:
   ```powershell
   Copy-Item .env.example .env
   ```
3. Edit `.env` and replace the placeholder `DATABASE_URL`, `AUTH_SECRET`, `CRON_SECRET`, `SITE_URL`, `NEXT_PUBLIC_SITE_URL` and test Paystack key. Keep `.env` private.
4. Install dependencies and generate Prisma's TypeScript client:
   ```powershell
   npm install
   npx prisma generate
   ```
5. Apply the database migrations and seed the product catalogue:
   ```powershell
   npx prisma migrate deploy
   npm run db:seed
   ```
6. Start the site:
   ```powershell
   npm run dev
   ```
7. Open `http://localhost:3000`.

The expanded instructions, including admin setup, customer profiles/order tracking, payment configuration, promotions and Vercel deployment, are in [`SETUP-GUIDE.md`](./SETUP-GUIDE.md).

## Common commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the local development server (after `npx prisma generate`) |
| `npm run build` | Generate Prisma Client and build the production app |
| `npm run start` | Start the built production app |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Generate Prisma Client and run TypeScript checks |
| `npx prisma migrate dev --name change_name` | Create a development migration after changing `schema.prisma` |
| `npx prisma migrate deploy` | Apply committed migrations to the configured database |
| `npm run db:seed` | Add/update the demo products |
| `npm run admin:make -- your@email.com` | Promote an already-registered user to admin |

## Admin pages

After registering a customer account and promoting it to admin, sign out and sign in again. The admin links include:

- `/admin` — sales/inventory overview
- `/admin/orders` — orders, payment status and fulfillment controls
- `/admin/products` — add/edit products and stock
- `/admin/customers` — customer list and order history
- `/admin/messages` — contact messages
- `/admin/newsletter` — subscriber list and CSV export
- `/admin/promotions` — homepage/shop/announcement adverts
- `/profile` — signed-in user's profile and saved delivery details
- `/dashboard` — customer order history and fulfillment tracking
- `/orders/<order-id>` — private order detail page for the owning customer

## Environment variables

See `.env.example`. Required values are `DATABASE_URL`, `AUTH_SECRET`, `SITE_URL`, `PAYSTACK_SECRET_KEY`, and `CRON_SECRET`. `NEXT_PUBLIC_SITE_URL` is used by sitemap/SEO routes. The optional `NEXT_PUBLIC_CONTACT_EMAIL` and social links populate the contact/footer areas.

Do not put real secrets in source code, GitHub, screenshots or messages. `.env` is excluded by `.gitignore`; commit `.env.example`, not `.env`.

## Promotions and product advertising

Go to **Administration → Promotions & Ads**. Create an advert, choose `Homepage`, `Shop page` or `Announcement strip`, add a HTTPS image URL if desired, set a CTA and destination, and activate it. Optional start/end times allow campaigns to be scheduled. The public storefront only shows campaigns that are active and inside their configured date window.

The application stores image URLs, not image files. Use product/lifestyle images you own or have permission to use; later you can replace URLs with a managed image-storage service.

## Production notes

- Configure production environment variables in Vercel and apply outstanding Prisma migrations to the intended production database before relying on the new features.
- Add the Paystack webhook URL `https://simplyire.vercel.app/api/payments/webhook` to the matching Paystack environment. Use test credentials for staging and live credentials only when formally ready to accept real payments.
- The included Vercel cron is scheduled daily for compatibility with Hobby plans. Expired reservations are also swept opportunistically during catalog/order traffic. Pro/Enterprise projects can change the schedule to a shorter interval and redeploy if desired.
- Review the privacy, terms and returns pages and replace them with policies approved for your actual business. Confirm your real support email, WhatsApp and social URLs. Check product names, photos, price, stock, delivery fee and delivery timing before launch.
- Test with a staging database and Paystack test mode before using live payment keys.

## Verification limitation

The project should run `npx prisma generate` against the final schema before development/typecheck/build. The generated Prisma Client is intentionally not packaged; it is generated locally and during `npm run build`. If Prisma engine download is blocked by a network restriction, resolve that connectivity problem and rerun generation.
