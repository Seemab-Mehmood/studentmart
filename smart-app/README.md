# Student Mart (SMart)

A real, working campus marketplace: real accounts (buyer/seller), real shops and products in Postgres, real guest checkout, real Stripe card payments, and admin-editable content — no mock data anywhere in this codebase.

This app needs two free accounts you create yourself (I can't create them for you from here): **Supabase** (database/auth/storage) and **Stripe** (card payments). Everything else — Easypaisa, JazzCash, bank transfer — is configured entirely from `/admin`, no external account needed to launch.

---

## 1. Create your Supabase project (~5 min)

1. Go to [supabase.com](https://supabase.com) → New project (free tier is fine).
2. Once it's created: **Settings → API** → copy the **Project URL**, **anon public key**, and **service_role key**.
3. **SQL Editor → New query** → paste the entire contents of `supabase/schema.sql` → **Run**. This creates every table, RLS policy, the three storage buckets (`shop-logos`, `product-images`, `payment-proofs`), and seeds the About/Policy pages with the founder bio.
4. **Authentication → Providers** → make sure Email is enabled. If you want people to start using their account immediately after signup, go to **Authentication → Settings** and turn **off** "Confirm email" (otherwise they'll need to click a confirmation link first — either is fine, just know which one you picked).

## 2. Create your Stripe account (only needed for card payments)

1. [stripe.com](https://stripe.com) → sign up → grab your **Publishable key** and **Secret key** from **Developers → API keys**.
2. **Products** → create two Prices:
   - "Seller Activation" — one-time, $5.00 → copy its `price_id`
   - "Seller Monthly Plan" — recurring monthly, $3.00 → copy its `price_id`
3. **Developers → Webhooks → Add endpoint** → URL: `https://YOUR-DOMAIN/api/checkout/webhook` → subscribe to `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` → copy the **signing secret**.
4. If you skip Stripe entirely, everything else still works — just leave "Stripe" toggled off in `/admin` and buyers will only see Cash/Easypaisa/JazzCash/Bank transfer, and sellers can't self-activate via card (you'd need to flip `profiles.seller_active` to `true` manually in Supabase for early testers).

## 3. Environment variables

Copy `.env.example` to `.env.local` (for local dev) and fill in the real values. On Render, add the same variables under **Environment** (the `render.yaml` blueprint already lists which ones it needs — Render will prompt you for each `sync: false` value during setup).

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_ACTIVATION_PRICE_ID=
STRIPE_SUBSCRIPTION_PRICE_ID=
SMART_ADMIN_EMAIL=smartlive@gmail.com
SMART_ADMIN_PASSWORD=StudentMart26     # change this after your first login
ADMIN_SESSION_SECRET=                  # any long random string
NEXT_PUBLIC_SITE_URL=https://your-deployed-url.onrender.com
```

**Change `SMART_ADMIN_PASSWORD` before going live** — it's currently set to the value you gave me, which is now written down in this chat.

## 4. Turn on payment methods

Log in at `/admin` with the email/password above, go to **Payment Methods**, and toggle on whichever of Stripe / Cash / Easypaisa / JazzCash / Bank transfer you want live, filling in your real account details for the manual ones. Buyers will only see the methods you've enabled at checkout.

## 5. Deploy to Render

1. Push this project to a GitHub repo (contents at the repo root — not nested in a subfolder).
2. Render → **New → Blueprint** → connect the repo → it reads `render.yaml` and prompts you for the env vars above → **Apply**.
3. Once live, go back to Stripe's webhook settings and make sure the endpoint URL matches your real Render URL.

## How the business logic actually works (all real, computed from the database)

- **Seller activation** — $5 one-time via Stripe → `profiles.seller_active = true` (set by the webhook, not the client).
- **Opening a shop** — free. Logo and description are required fields enforced both in the UI and at the database level (`shops.logo_url`/`description` are `NOT NULL`).
- **Free tier** — up to 3 active listings (`platform_settings.free_tier_item_limit`).
- **Monthly plan** — $3/month via Stripe subscription → raises the limit to 15 (`monthly_tier_item_limit`).
- **Commission** — every shop's first 50 *completed* orders are charged 5%; every completed order after that is charged 10%. This is tracked per-shop in `shops.completed_sales_count`, which only advances when the seller marks an order "Completed" — see `/api/orders/[id]/status`. All thresholds/rates are editable in `/admin → Fees & Tiers`, no code changes needed.
- **Guest checkout** — no login required. `/api/orders` recomputes every price server-side from the database (never trusts the client), snapshots the commission rate that applied at that moment, and writes one order per shop in the cart.
- **Payments** — Stripe Checkout for cards; Easypaisa/JazzCash/bank transfer are manual (admin publishes account details, buyer uploads a payment screenshot, order shows as "proof submitted" until the seller/admin confirms). This is the standard pattern used by small marketplaces in Pakistan without a registered merchant API — a true automated Easypaisa/JazzCash integration requires your own merchant agreement with them.
- **Plaza** — a `plazas` table groups approved shops; admins create Plazas and assign shops to them from `/admin → Plaza`.
- **About & Policy pages** — plain rows in `cms_pages`, editable any time from `/admin → About & Policy`, rendered live at `/about` and `/policy`.

## Project structure

```
app/
  page.js                    Explore Marketplace (live query, no mock data)
  about/, policy/             CMS-rendered pages
  plaza/, plaza/[slug]/        Sub-marketplaces
  shop/[slug]/                 Shop storefront
  product/[id]/                 Product detail
  cart/                          Guest checkout
  login/, signup/                 Auth
  seller/dashboard/                Shop wizard + inventory + orders + analytics + billing
  admin/, admin/dashboard/          Admin console
  api/                                Orders, Stripe checkout + webhook, admin auth/data/update
lib/                                    Supabase clients, pricing logic, cart, admin session
components/                              Navbar, cards, uploaders
supabase/schema.sql                       Run this once in Supabase SQL Editor
```

## Troubleshooting: "Your project's URL and API key are required" during build

This means Render tried to build without your Supabase env vars present (or didn't have them yet when you first deployed). Fixed in this version two ways: the Supabase clients now fall back to harmless placeholders so the build itself can never crash, and every route is forced to render per-request (`export const dynamic = "force-dynamic"` in `app/layout.js`) instead of being statically baked at build time. If pages still show no data after deploying, it means the *real* env vars aren't set — double check Render → your service → **Environment** has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` filled in with your actual Supabase project values, then redeploy.

## What to test after deploying
1. Sign up as a seller → pay the $5 (use Stripe test card `4242 4242 4242 4242` if you're in test mode) → confirm `seller_active` flips to true.
2. Create a shop → confirm it's `pending` until you approve it from `/admin → Approvals`.
3. Add 3 products → confirm the 4th is blocked until you subscribe.
4. As a guest (incognito), add items to cart and check out with a manual payment method → confirm the order appears in the seller's Orders tab and the account details you set in `/admin` show up.
5. Mark an order Completed as the seller → confirm `shop.completed_sales_count` increments and the commission rate in Analytics updates once you pass the threshold.
