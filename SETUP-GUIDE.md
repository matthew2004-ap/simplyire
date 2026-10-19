# Simplyire Essentials — Complete Setup Guide

This guide takes the supplied project from an extracted folder to local development and a Vercel deployment. Do the steps in order; the website uses a real PostgreSQL database for products, orders, accounts, contact messages, promotions and newsletter subscriptions.

## Part A — Prepare the project

### 1. Extract the clean project

Extract the supplied `simplyire-essentials-complete.zip` to a folder you can find easily, for example:

```text
C:\Users\YOUR-USER\Desktop\simplyire
```

Open that folder in VS Code. Use **File → Open Folder** and choose the folder that contains `package.json`.

### 2. Check Node.js and npm

In VS Code, open **Terminal → New Terminal** and run:

```powershell
node -v
npm -v
```

If either command is missing or Node.js is too old for your installed Next.js version, install a current Node.js LTS release and reopen VS Code.

### 3. Create the private environment file

Run from the project root:

```powershell
Copy-Item .env.example .env
```

Open `.env` and enter the credentials for your PostgreSQL database. A hosted PostgreSQL provider such as Supabase can be used. Copy the provider's correct PostgreSQL connection string and preserve any required SSL settings. Do not use the example placeholder literally.

Create strong secrets. Run this command twice — one output for `AUTH_SECRET` and another for `CRON_SECRET`:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Your local `.env` should contain values for these entries:

```env
DATABASE_URL="YOUR_REAL_POSTGRES_CONNECTION_STRING"
AUTH_SECRET="PASTE_FIRST_RANDOM_SECRET_HERE"
SITE_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
PAYSTACK_SECRET_KEY="YOUR_PAYSTACK_TEST_SECRET_KEY"
CRON_SECRET="PASTE_SECOND_RANDOM_SECRET_HERE"
NEXT_PUBLIC_CONTACT_EMAIL="YOUR_REAL_SUPPORT_EMAIL"
NEXT_PUBLIC_INSTAGRAM_URL=""
NEXT_PUBLIC_TIKTOK_URL=""
NEXT_PUBLIC_WHATSAPP_URL=""
```

Use a **Paystack test secret** during testing. Do not share the `.env` contents, and never commit it to GitHub. The optional social variables should be valid full URLs if you fill them.

### 4. Install the dependencies

```powershell
npm install
```

Wait for it to finish without errors.

### 5. Generate Prisma Client

Prisma Client is generated code and is intentionally not included in the ZIP. Run:

```powershell
npx prisma generate
```

Do this after changing `prisma/schema.prisma`, and before the first local development run. This project uses Prisma 7 and a custom generated-client path (`app/generated/prisma`). If Prisma cannot download its CLI engine, fix the network/proxy connection and rerun the command.

## Part B — Set up the database

### 6. Apply the database migrations

Make sure `DATABASE_URL` points to the database you intend to update, then run:

```powershell
npx prisma migrate deploy
```

This applies the committed migration history, including inventory reservations, fulfillment status, promotions, newsletter subscribers, and optional customer profile/delivery fields. It does **not** reset your database or erase existing orders.

For normal schema development, make a new migration only after editing the schema:

```powershell
npx prisma migrate dev --name describe_your_change
npx prisma generate
```

Do not use `migrate dev` on the production database. Back up a production database before any schema change.

### 7. Add the starter products

```powershell
npm run db:seed
```

The seed script adds or updates the example product catalogue by slug. Review those products, replace demonstration prices/descriptions/images with your actual products and verify physical stock before launch. Running the seed again updates matching starter slugs, so edit `prisma/seed.ts` first if you do not want those starter items reset.

### 8. Start the local site

```powershell
npm run dev
```

Visit:

- Storefront: `http://localhost:3000`
- Shop: `http://localhost:3000/shop`
- Cart: `http://localhost:3000/cart`
- Login/register: `http://localhost:3000/login` and `/register`
- Customer dashboard and order tracking: `http://localhost:3000/dashboard`
- Customer profile and saved delivery details: `http://localhost:3000/profile`
- Individual order details (from an order card): `/orders/<order-id>`
- Promotion API: `http://localhost:3000/api/promotions?placement=HOME`
- Database health: `http://localhost:3000/api/health/db`

The port might change if port 3000 is already in use; use the URL printed in the terminal and update `SITE_URL` for payment callbacks to match.

## Part C — Create the administrator account

### 9. Register your own account

Go to `/register` and create the email/password account you want to administer the store with. The registration route always creates a normal customer account; this is intentional so visitors cannot register themselves as administrators.

### 10. Promote the account to admin

In PowerShell, replace the email with the account you registered:

```powershell
npm run admin:make -- your-email@example.com
```

The script will report that the account role changed to `ADMIN`. Sign out and sign back in so the session cookie refreshes with the new role. The navbar will then show **Administration**.

### 11. Where to manage the store

- `/admin` — key metrics, recent orders and low-stock items
- `/admin/products` — create/edit products, change price/stock and mark featured
- `/admin/orders` — review payments and move fulfillment through Processing, Shipped and Delivered
- `/admin/customers` — inspect customer records and their linked order history
- `/admin/messages` — review contact form messages and reply by email
- `/admin/newsletter` — search and export newsletter subscribers to CSV
- `/admin/promotions` — create advert placements for the storefront

Only accounts with an admin role can access admin API routes.

## Customer profiles, saved details and order tracking

When a visitor registers or signs in, the navigation and homepage provide account entry points. Customers can open `/profile` to review their name/email, add or update their phone number and default delivery address, and save those changes to their own account. Email is read-only in the profile UI to avoid changing account identity without an email-verification flow.

The checkout form attempts to load a signed-in customer's saved contact and delivery details from `/api/account/profile`; a guest can still enter details manually. Newly created orders are linked to the authenticated account through `Order.userId`. The customer dashboard at `/dashboard` lists only orders linked to the signed-in user and shows payment state, fulfillment progress, and product details. Selecting **View order details** opens `/orders/<order-id>`. That route checks the order ownership on the server; knowing another order's ID does not grant access. Existing guest/test orders with `userId = null` are intentionally not automatically attached to an account by email.

The profile fields require the included `20261009223000_add_customer_profile_fields` migration. After extracting the ZIP, configure `.env`, then run `npx prisma generate` and `npx prisma migrate deploy` before starting the website. When applying this to an existing production database, back it up first and confirm `DATABASE_URL` points to the intended database.

## Part D — Configure Paystack

### 12. Local test payments

In `.env`, use a Paystack **test** secret key and set `SITE_URL` to your local site URL, for example:

```env
SITE_URL="http://localhost:3000"
```

Restart the development server after changing environment variables. Create a new order from the storefront and follow the Paystack test checkout. The server verifies the returned transaction reference, metadata, NGN currency and amount before marking the order paid.

Inventory is reserved when the order is created. On successful payment, reserved units are committed: physical stock decreases and `reservedStock` decreases. Failed/abandoned payments can release reservations.

A local website is not a public webhook target. The customer callback can verify the transaction during local testing; configure the public webhook after you deploy.

### 13. Production Paystack webhook

After deploying, enter this endpoint in the matching Paystack dashboard environment:

```text
https://simplyire.vercel.app/api/payments/webhook
```

Keep the signed webhook validation enabled. Do not use a test secret with live payments or a live secret in development. Make sure `SITE_URL` uses your actual deployed HTTPS domain so the Paystack callback points back to the correct site.

## Part E — Promotions and animations

### 14. Create a new or upcoming product advert

Open **Administration → Promotions & Ads** (`/admin/promotions`) and choose **Create advert**.

1. Enter a clear headline, such as “Meet the next Simplyire favourite”.
2. Enter an eyebrow/subtitle, for example “Coming soon” or “Just dropped”.
3. Add a short description.
4. Add an optional **HTTPS image URL** for a product/lifestyle image you own or have permission to use.
5. Enter the button text and destination, such as `Shop the collection` and `/shop`.
6. Choose a placement:
   - **Homepage** — animated campaign panel on the home page.
   - **Shop page** — campaign panel above the catalogue.
   - **Announcement strip** — rotating line at the top of the site.
7. Optionally set start/end date and time and sorting priority.
8. Tick **Publish when scheduled** and save.

The advert becomes public only while it is active and within its configured schedule. Pause it to hide it without deleting it. Carousel movement, entrance effects and product hover effects are included; the site respects the browser/OS reduced-motion setting.

Images are stored as URLs rather than uploaded files. If you want true upload management later, add a storage provider (such as a managed object/image service) and save the resulting image URL in the `image` field.

## Part F — Deploy to GitHub and Vercel

### 15. Verify secrets are not staged

The project ignores `.env`, `.next`, `node_modules`, `.vercel` and logs. Before committing, run:

```powershell
git status --short
```

Make sure `.env` is not listed. If a real `.env` or credentials were ever committed to a public repository or shared archive, rotate those credentials with the provider; deleting the file later is not sufficient to revoke a leaked key.

If this folder is already a Git repository, commit changes as usual. If it is not:

```powershell
git init
git add .
git commit -m "Prepare Simplyire Essentials store"
```

Create a GitHub repository and push the project using the repository URL GitHub provides. Do not upload `.env`.

### 16. Configure Vercel

Import the GitHub repository into Vercel. In **Project → Settings → Environment Variables**, add at least:

- `DATABASE_URL` — production PostgreSQL connection string
- `AUTH_SECRET` — strong private random secret
- `SITE_URL` — `https://simplyire.vercel.app`
- `NEXT_PUBLIC_SITE_URL` — `https://simplyire.vercel.app`
- `PAYSTACK_SECRET_KEY` — test key for staging, live key only when ready for real payments
- `CRON_SECRET` — a separate strong random secret
- Optional `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_INSTAGRAM_URL`, `NEXT_PUBLIC_TIKTOK_URL`, `NEXT_PUBLIC_WHATSAPP_URL`

Add the correct environment values for Production (and Preview if you use it). Redeploy after changing Vercel environment variables.

### 17. Apply the new production migration

Before using the new promotions/newsletter features, apply migrations to the production database. Use a terminal configured with the **production** `DATABASE_URL` and run:

```powershell
npx prisma migrate deploy
```

Do not accidentally point this command at your local database if your intention is to update production, and do not use `migrate dev` against production. Then redeploy if needed. The Vercel build script runs `prisma generate && next build` so the Prisma client is generated during builds.

### 18. Cron and expired inventory reservations

The default `vercel.json` runs the scheduled cleanup once per day so it can deploy on Vercel Hobby plans. The store also attempts a small expired-reservation sweep when product catalog/order traffic arrives, so ordinary activity helps release expired holds sooner. On a Hobby project with no visitor traffic, an expired reservation can remain held until the next daily scheduled run; use Pro/Enterprise scheduling or a dedicated job runner if you need frequent cleanup independent of traffic.

Vercel's current plan limits are different: Hobby is limited to daily cron schedules, while Pro/Enterprise support more frequent schedules. If your project is on Pro/Enterprise and you want a ten-minute scheduled sweep, edit `vercel.json` to:

```json
{
  "crons": [
    {
      "path": "/api/cron/release-expired-orders",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

Then redeploy. On Hobby, do not leave that ten-minute schedule in place — Vercel will reject a too-frequent cron schedule.

For a local manual test, make sure your `.env` has `CRON_SECRET`, restart the dev server after environment changes, open a second PowerShell terminal and run (paste the **same local secret** used in `.env` only into your terminal):

```powershell
$secret = "PASTE_YOUR_LOCAL_CRON_SECRET_HERE"
Invoke-WebRequest `
  -Uri "http://localhost:3000/api/cron/release-expired-orders" `
  -Method GET `
  -Headers @{ Authorization = "Bearer $secret" }
```

A response with `success: true` and `scanned: 0` is normal if no reservations have expired.

## Part G — Final launch checklist

Before taking real orders:

- [ ] Replace placeholder product photos, names, descriptions, prices and stock with correct store information.
- [ ] Add the real support email, WhatsApp and social links.
- [ ] Review shipping/delivery fee rules and actual delivery timelines.
- [ ] Review the Privacy Policy, Terms and Returns & Refunds pages with policies that accurately describe your business and comply with applicable rules.
- [ ] Verify admin access and confirm normal customer accounts cannot open admin pages or APIs.
- [ ] Test registration, login, logout, customer profile editing, checkout prefill, and customer-specific order history/order detail pages.
- [ ] Test a Paystack test payment and check `status = PAID`, `inventoryStatus = COMMITTED`, and the correct stock/reservation counts.
- [ ] Test failed/abandoned checkout and reservation release.
- [ ] Create, schedule, pause and preview each advert placement.
- [ ] Test the contact form and newsletter form; confirm messages/subscribers show in admin.
- [ ] Run `npm run lint`, `npm run typecheck` and `npm run build` after database/environment configuration.
- [ ] Confirm no `.env` or live secret is tracked by Git.
- [ ] Switch to Paystack live credentials only after testing and confirming the real webhook URL.

## Troubleshooting

**`Prisma Client could not find model promotion/newsletterSubscriber`:** Run `npx prisma generate` after saving the current schema and use a clean build.

**`DATABASE_URL` is missing:** Check that `.env` exists in the project root, the variable is spelled correctly, and you restarted the dev server after editing it.

**The dashboard redirects to `/login` or `/dashboard`:** Check the user role in PostgreSQL; after promoting a user to admin, log out and back in so the role in the session token refreshes.

**Products have fewer available units than their physical stock:** `reservedStock` is inventory temporarily held by unpaid orders. Available stock is `stock - reservedStock`.

**A promotion does not appear:** Ensure it is active, the placement matches the page, its start date is not in the future, its end date has not passed, and the CTA/image URLs are valid.

**The cron endpoint returns 401:** Use the exact `CRON_SECRET` value in the `Authorization: Bearer ...` header. Never share the secret in screenshots or public issue trackers.
