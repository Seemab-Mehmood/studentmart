# Student Mart (SMart) — System Architecture & Database Spec

## 1. Product Summary
SMart is a campus marketplace platform consolidating three verticals into one ecosystem:
- **Physical Goods** (dorm resale, crafts, print-on-demand)
- **Freelance/Services** (tutoring, design, repair)
- **Digital Products** (templates, notes, software)
- **Idea Incubator/Pitch** (pre-revenue concepts seeking early customers/feedback)

Three primary surfaces: **Explore Marketplace** (buyers), **Merchant Portal** (student vendors), **Admin Console** (platform ops).

---

## 2. Recommended Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14 (App Router)** | SSR for public shop pages (SEO + shareability), API routes for backend logic, React Server Components for fast Explore feed |
| Styling | **Tailwind CSS + shadcn/ui** | Rapid, consistent design system; easy to theme with the navy/amber tokens below |
| Icons | **lucide-react** | Consistent stroke-based icon set, matches the logo's line-basket mark |
| Backend/DB | **Supabase (Postgres + Auth + Storage + Row Level Security)** | Auth (student email/.edu verification), Postgres for relational commerce data, Storage for shop logos/product images, RLS to enforce merchant/admin boundaries without a custom backend |
| Payments | **Stripe Connect (Express accounts)** | Each merchant becomes a connected account; platform takes an **application fee** = the commission rate, matching the Admin panel's dynamic fee control. Supports Campus Card / COD / P2P as manual/off-platform payment method *flags* stored per-order (see `payment_method` enum) |
| Realtime | **Supabase Realtime** | Order status updates pushed live to Merchant Portal's fulfillment tracker |
| Hosting | **Vercel** (app) + **Supabase Cloud** (data) | Zero-ops, generous free tier for a campus-scale launch |
| Analytics | **Postgres views + a lightweight events table** | Avoids a third-party analytics vendor for MVP; views power both Merchant and Admin dashboards from the same source of truth |

### High-level architecture

```
┌─────────────────┐      ┌──────────────────────┐      ┌───────────────────┐
│   Next.js App    │◄────►│   Supabase (Postgres) │◄────►│  Stripe Connect    │
│  /explore         │      │  Auth · RLS · Storage │      │  Merchant payouts  │
│  /merchant/*      │      │  Realtime channels    │      └───────────────────┘
│  /admin/*         │      └──────────────────────┘
└─────────────────┘
        ▲
        │  .edu-gated auth (Supabase Auth + email domain check)
        │
   Student browser
```

### Role model
- `student` — default role, can browse + purchase
- `merchant` — a student who has an approved `shops` row; portal access scoped via RLS to `shops.owner_id = auth.uid()`
- `admin` — platform staff; bypasses RLS via a Postgres role/claim, only source of truth for `platform_settings`

---

## 3. Database Schema (PostgreSQL / Supabase)

```sql
-- ============================================
-- USERS & AUTH
-- ============================================
create table users (
  id              uuid primary key default gen_random_uuid(),
  auth_id         uuid unique references auth.users(id) on delete cascade,
  full_name       text not null,
  email           text unique not null check (email ~* '@.*\.edu$'),
  avatar_url      text,
  role            text not null default 'student'
                    check (role in ('student','merchant','admin')),
  created_at      timestamptz not null default now()
);

-- ============================================
-- CATEGORIES (seeded, admin-editable)
-- ============================================
create table categories (
  id              serial primary key,
  slug            text unique not null,       -- 'physical-goods' | 'services' | 'digital' | 'idea-incubator'
  label           text not null,
  icon            text                          -- lucide icon key for UI
);

-- ============================================
-- SHOPS (merchant storefronts)
-- ============================================
create table shops (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references users(id) on delete cascade,
  name            text not null,
  slug            text unique not null,
  logo_url        text,
  category_id     int references categories(id),
  description     text,
  contact_email   text,
  contact_phone   text,
  status          text not null default 'pending'
                    check (status in ('pending','approved','flagged','suspended')),
  stripe_account_id text,                      -- Stripe Connect Express account
  rating_avg      numeric(2,1) default 0,
  rating_count    int default 0,
  created_at      timestamptz not null default now(),
  approved_at     timestamptz
);

create index idx_shops_owner on shops(owner_id);
create index idx_shops_status on shops(status);

-- ============================================
-- PRODUCTS / SERVICES / LISTINGS
-- ============================================
create table products (
  id              uuid primary key default gen_random_uuid(),
  shop_id         uuid not null references shops(id) on delete cascade,
  category_id     int references categories(id),
  title           text not null,
  description     text,
  price_cents     int not null check (price_cents >= 0),
  listing_type    text not null default 'product'
                    check (listing_type in ('product','service','digital','idea')),
  stock           int,                          -- null = unlimited (services/digital)
  tags            text[] default '{}',
  images          text[] default '{}',
  status          text not null default 'pending'
                    check (status in ('pending','active','flagged','archived')),
  view_count      int not null default 0,
  order_count     int not null default 0,
  created_at      timestamptz not null default now()
);

create index idx_products_shop on products(shop_id);
create index idx_products_status on products(status);
create index idx_products_tags on products using gin(tags);

-- ============================================
-- ORDERS & ORDER ITEMS
-- ============================================
create table orders (
  id              uuid primary key default gen_random_uuid(),
  buyer_id        uuid not null references users(id),
  shop_id         uuid not null references shops(id),
  status          text not null default 'pending'
                    check (status in ('pending','in_progress','completed','cancelled')),
  payment_method  text not null
                    check (payment_method in ('stripe','campus_card','cod','p2p')),
  subtotal_cents  int not null,
  commission_rate_snapshot numeric(4,2) not null,  -- % captured at time of order
  commission_cents int not null,                    -- platform take
  net_payout_cents int not null,                    -- subtotal - commission
  created_at      timestamptz not null default now(),
  fulfilled_at    timestamptz
);

create table order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references orders(id) on delete cascade,
  product_id      uuid not null references products(id),
  quantity        int not null default 1,
  unit_price_cents int not null
);

create index idx_orders_shop on orders(shop_id);
create index idx_orders_buyer on orders(buyer_id);
create index idx_orders_status on orders(status);

-- ============================================
-- REVIEWS (drives "Top Rated" sort)
-- ============================================
create table reviews (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid unique references orders(id),
  shop_id         uuid not null references shops(id),
  reviewer_id     uuid not null references users(id),
  rating          int not null check (rating between 1 and 5),
  comment         text,
  created_at      timestamptz not null default now()
);

-- ============================================
-- PLATFORM SETTINGS (Admin-controlled, single row)
-- ============================================
create table platform_settings (
  id                    int primary key default 1,
  commission_rate       numeric(4,2) not null default 5.00,   -- percent
  min_commission_rate   numeric(4,2) not null default 2.00,
  max_commission_rate   numeric(4,2) not null default 8.00,
  updated_by            uuid references users(id),
  updated_at            timestamptz not null default now(),
  constraint single_row check (id = 1)
);

create table payment_gateways (
  id              serial primary key,
  key             text unique not null,   -- 'stripe' | 'campus_card' | 'cod' | 'p2p'
  label           text not null,
  is_active       boolean not null default true
);

-- ============================================
-- ANALYTICS VIEWS (shared by Merchant + Admin dashboards)
-- ============================================
create view shop_analytics as
select
  s.id as shop_id,
  s.name,
  coalesce(sum(p.view_count), 0) as total_views,
  count(distinct o.id) filter (where o.status = 'completed') as total_orders,
  coalesce(sum(o.subtotal_cents) filter (where o.status = 'completed'), 0) as gross_earnings_cents,
  coalesce(sum(o.net_payout_cents) filter (where o.status = 'completed'), 0) as net_revenue_cents
from shops s
left join products p on p.shop_id = s.id
left join orders o on o.shop_id = s.id
group by s.id, s.name;

create view platform_analytics as
select
  (select count(*) from shops where status = 'approved') as active_merchants,
  (select count(*) from orders where status = 'completed') as completed_orders,
  (select coalesce(sum(subtotal_cents),0) from orders where status = 'completed') as total_volume_cents,
  (select coalesce(sum(commission_cents),0) from orders where status = 'completed') as platform_revenue_cents;
```

### Fee calculation (server-side, on order creation)
```
commission_cents = round(subtotal_cents * platform_settings.commission_rate / 100)
net_payout_cents = subtotal_cents - commission_cents
```
The rate is **snapshotted onto the order** (`commission_rate_snapshot`) so historical orders remain accurate even if admins later change the platform rate.

### Row Level Security (summary)
- `products`/`orders` on a shop: readable by anyone if `status = 'active'`/`shop.status = 'approved'`; writable only by `shops.owner_id = auth.uid()`.
- `platform_settings`, `payment_gateways`: writable only by role `admin`.
- `shops.status` transitions (`pending → approved/flagged`) restricted to `admin`.

---

## 4. API Surface (Next.js Route Handlers)
```
GET   /api/products               list + filter (category, search, sort)
GET   /api/products/:id           item detail
POST  /api/orders                 create order → triggers fee calc
GET   /api/shops/mine             merchant's own shop
POST  /api/shops                  shop setup wizard submit (status=pending)
POST  /api/shops/:id/products     add listing
GET   /api/shops/:id/analytics    merchant dashboard data (from shop_analytics view)
GET   /api/admin/settings         current commission + gateway config
PATCH /api/admin/settings         update commission rate / toggle gateways
POST  /api/admin/shops/:id/approve | /flag
GET   /api/admin/analytics        platform_analytics view
```

---

## 5. Frontend delivered
A production-styled single-page implementation of all three tabs (Explore, Merchant Portal, Admin Console) with mock data, working search/filter/sort, cart + request-service flow, shop setup wizard, inventory manager, analytics dashboards, and live commission-rate/fee-calculation logic — see `StudentMart.jsx`.
