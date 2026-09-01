# Student Mart (SMart) — v2: Inquiry Marketplace

Real accounts, real database, no mock data. This version works differently from a typical storefront:

- **Buyers never pay through Student Mart.** They fill a dealer-defined custom form per product (name/email/phone always required, plus whatever else the dealer wants to know), submit it with no account needed, and the dealer contacts them directly to arrange payment and delivery.
- **Dealers pay Student Mart, not the other way around**: a one-time account-opening fee to activate selling, and a running 5% commission on every sale they mark "Completed" — since SMart never touches the buyer's payment, that 5% accrues as a balance and is collected together with a flat weekly platform fee.
- **Three roles above buyer**: Dealer (seller) → Admin → Super Admin. The Super Admin can create Admin and Dealer accounts directly from the console.

---

## 1. Create your Supabase project

1. [supabase.com](https://supabase.com) → New project (free tier is fine).
2. **Settings → API** → copy the **Project URL**, **anon public key**, and **service_role key**.
3. **SQL Editor → New query** → paste all of `supabase/schema.sql` → **Run**. This creates every table, RLS policy, storage bucket, and seeds the About/Policy pages with the founder bio you gave me.
4. **Authentication → Settings** → decide whether to require email confirmation (your call either way).

## 2. Set your environment variables

Copy `.env.example` → fill in real values. On Render: your service → **Environment** tab.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SMART_ADMIN_EMAIL=smartlive@gmail.com
SMART_ADMIN_PASSWORD=          # pick a fresh one — don't reuse StudentMart26, it's been shared in chat
BOOTSTRAP_SECRET=              # any long random string, used once
NEXT_PUBLIC_SITE_URL=
```

Stripe keys are optional — dealers can pay entirely through manual Easypaisa/JazzCash/bank transfer if you never set them up.

## 3. Create the Super Admin account (one-time)

After your first deploy, call this once:

```
curl -X POST https://your-app.onrender.com/api/setup/bootstrap-admin \
  -H "Content-Type: application/json" \
  -d '{"secret":"YOUR_BOOTSTRAP_SECRET"}'
```

This creates the real Supabase Auth user for `SMART_ADMIN_EMAIL`/`SMART_ADMIN_PASSWORD` and sets its role to `super_admin`. Log in at `/admin` (or `/login`, both work — admins land in the console automatically).

**Change the password immediately after this** if you're reusing anything you've typed into a chat before.

## 4. As Super Admin, do these three things first

1. **Admin → Payment Methods** — turn on however dealers will pay you (Stripe and/or Easypaisa/JazzCash/bank transfer, with your real account details).
2. **Admin → Fees & Dues Setup** — confirm the commission rate (default 5%), account-opening fee (default $5), and weekly due (default $2). All editable any time.
3. **Admin → Accounts** — create your first Admin or Dealer accounts directly if you don't want people self-registering yet, or leave signup open at `/signup`.

## 5. How a dealer actually gets going

1. Signs up at `/signup` → lands in `/dealer/dashboard`.
2. Pays the account-opening fee (Stripe or manual, confirmed by an admin if manual) → role flips to `dealer`.
3. Shop Setup Wizard — logo and description are required, both in the UI and at the database level.
4. Once an admin approves the shop, it's live and the 7-day due clock starts (`shops.next_due_at`).
5. Adds products — each one can have its own custom inquiry form built right in the Inventory tab (text/textarea/number/select/checkbox fields, each markable required).
6. Buyers submit inquiries with no login. Dealer sees them in the Inquiries kanban (New → Contacted → In Progress → Completed), and enters the actual agreed sale amount when marking one Completed — that's what 5% is calculated on.
7. Dues & Billing tab shows exactly what's owed right now (flat weekly fee + accrued commission) and lets them pay it.

## How the money actually moves (important, since it's not a normal checkout)

- Student Mart **never processes a buyer payment**. The buyer and dealer handle that between themselves after the inquiry.
- The 5% commission is **tracked, not deducted** — it accumulates in `shops.commission_owed_cents` every time a dealer marks a sale Completed with a self-reported amount.
- Once a week, the dealer owes `weekly_due_cents` (flat) + whatever's accrued in `commission_owed_cents`. Paying it (via Stripe or a confirmed manual payment) resets the commission balance to zero and pushes `next_due_at` out 7 days.
- If a dealer never pays, `next_due_at` stays in the past and Admin → Dues Monitor flags them as overdue — nothing auto-suspends them (I didn't want to silently hide someone's shop without you knowing), but you can manually set `shops.status = 'suspended'` from Supabase's Table Editor if you want an enforced cutoff, or ask me to wire up automatic suspension after N overdue days.

## In-app notifications

Both dealers and admins/super admins see a bell icon in the navbar. Notifications are created lazily (no cron job needed) whenever admin data loads and a shop has crossed into "due soon" or "overdue" — plus whenever a dealer reports a manual payment, or a payment is confirmed.

## Project structure

```
app/
  page.js                        Explore Marketplace (live query)
  about/, policy/                  CMS-rendered pages (edit from Admin)
  plaza/, plaza/[slug]/              Sub-marketplaces
  shop/[slug]/                        Shop storefront
  product/[id]/                        Product detail + custom inquiry form
  login/, signup/                        Auth (buyer/dealer; admins log in here too)
  dealer/dashboard/                        Account-fee gate → shop wizard → inventory/inquiries/analytics/dues
  admin/, admin/dashboard/                   Admin & Super Admin console
  api/
    inquiries/                                  Submit + update buyer inquiries
    checkout/                                    Stripe: account fee + webhook
    dealer/pay-due/                                Stripe: dynamic weekly-due amount
    super-admin/create-account/                     Super admin creates Admin/Dealer accounts
    setup/bootstrap-admin/                            One-time Super Admin creation
    admin/data, admin/update                            Console reads/writes (role-gated)
    notifications/                                        Bell dropdown data
lib/
  pricing.js      Flat 5% commission math
  dues.js          Weekly due status (current/due_soon/overdue), pure function
  notify.js         Lazy in-app notification creation
  authz.js           Real-session role checks (no more cookie-based admin auth)
supabase/schema.sql  Run once in Supabase SQL Editor
```

## What to test after deploying
1. Bootstrap the Super Admin, log in at `/admin`.
2. Sign up a test dealer, pay the account fee (Stripe test card `4242 4242 4242 4242` if using test mode, or a manual method).
3. Create a shop → approve it from Admin → Approvals → confirm `next_due_at` got set.
4. Add a product with 2–3 custom form fields.
5. In an incognito window, submit an inquiry as a guest.
6. As the dealer, walk it through New → Contacted → In Progress → Completed, entering an agreed amount → confirm `commission_owed_cents` increased on the shop.
7. Pay the weekly due → confirm the balance resets and `next_due_at` moves forward 7 days, and a "payment confirmed" notification appears.
