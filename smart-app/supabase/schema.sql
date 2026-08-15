-- ============================================================
-- STUDENT MART — SUPABASE SCHEMA
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run
-- Safe to re-run: uses "create table if not exists" / "on conflict do nothing"
-- ============================================================

-- ---------- PROFILES (extends Supabase auth.users) ----------
create table if not exists profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  email             text not null,
  full_name         text,
  phone             text,
  role              text not null default 'buyer' check (role in ('buyer','seller')),
  seller_active     boolean not null default false,   -- true after $5 lifetime activation payment
  seller_activated_at timestamptz,
  created_at        timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles_select_own_or_public" on profiles
  for select using (true);  -- names are shown publicly on shop pages

create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);

-- Auto-create a profile row whenever someone signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), coalesce(new.raw_user_meta_data->>'role','buyer'))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ---------- PLAZAS (sub-marketplaces that group multiple shops) ----------
create table if not exists plazas (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text unique not null,
  description   text,
  banner_url    text,
  status        text not null default 'active' check (status in ('active','hidden')),
  created_at    timestamptz not null default now()
);

alter table plazas enable row level security;
create policy "plazas_public_read" on plazas for select using (status = 'active');
create policy "plazas_admin_write" on plazas for all using (auth.jwt() ->> 'role' = 'service_role');

-- ---------- SHOPS ----------
create table if not exists shops (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references profiles(id) on delete cascade,
  plaza_id        uuid references plazas(id) on delete set null,
  name            text not null,
  slug            text unique not null,
  logo_url        text not null,                 -- required at signup
  category        text not null check (category in ('physical','services','digital','idea')),
  description     text not null,                  -- required
  contact_email   text,
  contact_phone   text,
  status          text not null default 'pending' check (status in ('pending','approved','flagged','suspended')),

  -- subscription / product-limit tier
  tier            text not null default 'free' check (tier in ('free','monthly')),
  item_limit      int not null default 3,
  subscription_status text not null default 'inactive' check (subscription_status in ('inactive','active','past_due','cancelled')),
  subscription_renews_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,

  -- commission tracking (drives the 5% → 10% threshold at 50 completed sales)
  completed_sales_count int not null default 0,

  created_at      timestamptz not null default now(),
  approved_at     timestamptz
);

alter table shops enable row level security;
create policy "shops_public_read_approved" on shops for select using (status = 'approved');
create policy "shops_owner_read_own" on shops for select using (auth.uid() = owner_id);
create policy "shops_owner_insert" on shops for insert with check (auth.uid() = owner_id);
create policy "shops_owner_update_own" on shops for update using (auth.uid() = owner_id);

-- ---------- PRODUCTS ----------
create table if not exists products (
  id            uuid primary key default gen_random_uuid(),
  shop_id       uuid not null references shops(id) on delete cascade,
  title         text not null,
  description   text not null,
  price_cents   int not null check (price_cents >= 0),
  listing_type  text not null default 'product' check (listing_type in ('product','service','digital','idea')),
  stock         int,                       -- null = unlimited (service/digital)
  tags          text[] default '{}',
  images        text[] not null default '{}',  -- unlimited image URLs
  status        text not null default 'active' check (status in ('active','flagged','archived')),
  view_count    int not null default 0,
  order_count   int not null default 0,
  created_at    timestamptz not null default now()
);

alter table products enable row level security;
create policy "products_public_read_active" on products
  for select using (status = 'active' and exists (select 1 from shops s where s.id = shop_id and s.status = 'approved'));
create policy "products_owner_read_own" on products
  for select using (exists (select 1 from shops s where s.id = shop_id and s.owner_id = auth.uid()));
create policy "products_owner_write" on products
  for all using (exists (select 1 from shops s where s.id = shop_id and s.owner_id = auth.uid()));

-- ---------- ORDERS (guest checkout allowed — buyer_id nullable) ----------
create table if not exists orders (
  id                uuid primary key default gen_random_uuid(),
  buyer_id          uuid references profiles(id),
  shop_id           uuid not null references shops(id),

  -- guest checkout contact/delivery details (collected every time, even if logged in)
  buyer_name        text not null,
  buyer_email       text not null,
  buyer_phone       text not null,
  buyer_address     text,
  delivery_mode     text not null check (delivery_mode in ('online_remote','in_home')),
  payment_method    text not null check (payment_method in ('cash','card','easypaisa','jazzcash','bank_transfer')),
  vendor_contact_shown boolean not null default true,

  status            text not null default 'pending' check (status in ('pending','in_progress','completed','cancelled')),
  payment_status    text not null default 'unpaid' check (payment_status in ('unpaid','proof_submitted','paid','failed')),
  payment_proof_url text,   -- screenshot for manual easypaisa/jazzcash/bank transfer

  subtotal_cents        int not null,
  commission_rate_snapshot numeric(4,2) not null,  -- 5.00 or 10.00, captured at order time
  commission_cents      int not null,
  net_payout_cents      int not null,

  created_at        timestamptz not null default now(),
  fulfilled_at       timestamptz
);

create table if not exists order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references orders(id) on delete cascade,
  product_id      uuid not null references products(id),
  title_snapshot  text not null,
  quantity        int not null default 1,
  unit_price_cents int not null
);

alter table orders enable row level security;
alter table order_items enable row level security;

create policy "orders_owner_shop_read" on orders
  for select using (exists (select 1 from shops s where s.id = shop_id and s.owner_id = auth.uid()));
create policy "orders_buyer_read_own" on orders
  for select using (auth.uid() = buyer_id);
create policy "orders_insert_anyone" on orders
  for insert with check (true);  -- guest checkout: no auth required to place an order
create policy "orders_owner_shop_update" on orders
  for update using (exists (select 1 from shops s where s.id = shop_id and s.owner_id = auth.uid()));

create policy "order_items_read" on order_items
  for select using (exists (
    select 1 from orders o join shops s on s.id = o.shop_id
    where o.id = order_id and (s.owner_id = auth.uid() or o.buyer_id = auth.uid())
  ));
create policy "order_items_insert_anyone" on order_items for insert with check (true);

-- ---------- CMS PAGES (admin-editable: About/How-it-Works, Policy & Who We Are) ----------
create table if not exists cms_pages (
  slug          text primary key,           -- 'about' | 'policy'
  title         text not null,
  content_md    text not null,              -- markdown, rendered on the public page
  updated_by    uuid references profiles(id),
  updated_at    timestamptz not null default now()
);

alter table cms_pages enable row level security;
create policy "cms_public_read" on cms_pages for select using (true);
create policy "cms_admin_write" on cms_pages for all using (auth.jwt() ->> 'role' = 'service_role');

insert into cms_pages (slug, title, content_md) values
('about', 'What is Student Mart?', E'## What is Student Mart?\n\nStudent Mart (SMart) is a campus marketplace where student entrepreneurs open real shops for physical goods, freelance services, digital products, and early-stage startup ideas — all in one place.\n\n## How it works\n\n1. **Sign up** as a buyer or seller.\n2. **Sellers activate** their seller account with a one-time $5 lifetime fee.\n3. **Open your shop for free** — add up to 3 products with a required logo and description.\n4. **Grow**: upgrade to the $3/month plan to list up to 15 products.\n5. **Sell**: Student Mart takes 5% commission on your first 50 completed sales, then 10% on every sale after that.\n6. **Buyers** can check out as a guest — no account required — and pay by card, Easypaisa, JazzCash, bank transfer, or cash on delivery.\n\nThis page is editable by the Student Mart admin team at any time.'),
('policy', 'Student Mart Policy & Who We Are', E'## Who We Are\n\nStudent Mart was founded by **Seemab Mehmood**, a final-year medical student at Fatima Jinnah Medical University, Lahore, to give student entrepreneurs a single, trustworthy place to launch and grow their campus businesses.\n\n## Platform Policy\n\n- All orders must be placed through the Student Mart platform. Orders arranged outside the platform are not covered by Student Mart and are strictly discouraged.\n- Sellers must provide an honest description and required logo/images for every shop and listing.\n- Commission: 5% platform fee on a shop''s first 50 completed sales; 10% on every completed sale after that.\n- Free tier: up to 3 active listings. Monthly ($3) tier: up to 15 active listings.\n- Seller account activation is a one-time $5 lifetime fee.\n- Buyers may check out as guests; accurate contact and delivery details are required to fulfil orders.\n\nThis page is editable by the Student Mart admin team at any time.')
on conflict (slug) do nothing;

-- ---------- PAYMENT GATEWAY SETTINGS (admin-editable) ----------
create table if not exists payment_settings (
  id                serial primary key,
  stripe_enabled    boolean not null default false,
  cash_enabled      boolean not null default true,
  easypaisa_enabled boolean not null default false,
  easypaisa_account_title  text,
  easypaisa_account_number text,
  easypaisa_instructions   text,
  jazzcash_enabled  boolean not null default false,
  jazzcash_account_title  text,
  jazzcash_account_number text,
  jazzcash_instructions   text,
  bank_transfer_enabled boolean not null default false,
  bank_account_title   text,
  bank_account_number  text,
  bank_iban             text,
  bank_name              text,
  bank_instructions      text,
  updated_at         timestamptz not null default now(),
  constraint single_row check (id = 1)
);

alter table payment_settings enable row level security;
create policy "payment_settings_public_read" on payment_settings for select using (true);
create policy "payment_settings_admin_write" on payment_settings for all using (auth.jwt() ->> 'role' = 'service_role');

insert into payment_settings (id, cash_enabled) values (1, true) on conflict (id) do nothing;

-- ---------- PLATFORM SETTINGS (commission thresholds, subscription price — admin editable) ----------
create table if not exists platform_settings (
  id                    int primary key default 1,
  commission_rate_early numeric(4,2) not null default 5.00,   -- % for sales 1..threshold
  commission_rate_late  numeric(4,2) not null default 10.00,  -- % after threshold
  commission_sale_threshold int not null default 50,
  seller_activation_fee_cents int not null default 500,        -- $5 one-time
  free_tier_item_limit  int not null default 3,
  monthly_tier_item_limit int not null default 15,
  monthly_subscription_fee_cents int not null default 300,     -- $3/month
  updated_at            timestamptz not null default now(),
  constraint single_row check (id = 1)
);

alter table platform_settings enable row level security;
create policy "platform_settings_public_read" on platform_settings for select using (true);
create policy "platform_settings_admin_write" on platform_settings for all using (auth.jwt() ->> 'role' = 'service_role');

insert into platform_settings (id) values (1) on conflict (id) do nothing;

-- ---------- STORAGE BUCKETS ----------
-- Run once (or create via Dashboard → Storage → New bucket, set Public ON):
--   shop-logos        (public)
--   product-images     (public)
--   payment-proofs      (public or signed — screenshots of manual transfers)
insert into storage.buckets (id, name, public) values ('shop-logos','shop-logos', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('product-images','product-images', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('payment-proofs','payment-proofs', true) on conflict (id) do nothing;

create policy "public read shop-logos" on storage.objects for select using (bucket_id = 'shop-logos');
create policy "public read product-images" on storage.objects for select using (bucket_id = 'product-images');
create policy "public read payment-proofs" on storage.objects for select using (bucket_id = 'payment-proofs');
create policy "authenticated upload shop-logos" on storage.objects for insert with check (bucket_id = 'shop-logos' and auth.role() = 'authenticated');
create policy "authenticated upload product-images" on storage.objects for insert with check (bucket_id = 'product-images' and auth.role() = 'authenticated');
create policy "anyone upload payment-proofs" on storage.objects for insert with check (bucket_id = 'payment-proofs');

-- ---------- VIEWS: real analytics (no fabricated numbers, ever) ----------
create or replace view shop_analytics as
select
  s.id as shop_id,
  coalesce(sum(p.view_count), 0) as total_views,
  count(distinct o.id) filter (where o.status = 'completed') as total_orders,
  coalesce(sum(o.subtotal_cents) filter (where o.status = 'completed'), 0) as gross_earnings_cents,
  coalesce(sum(o.net_payout_cents) filter (where o.status = 'completed'), 0) as net_revenue_cents
from shops s
left join products p on p.shop_id = s.id
left join orders o on o.shop_id = s.id
group by s.id;

create or replace view platform_analytics as
select
  (select count(*) from shops where status = 'approved') as active_merchants,
  (select count(*) from orders where status = 'completed') as completed_orders,
  (select coalesce(sum(subtotal_cents),0) from orders where status = 'completed') as total_volume_cents,
  (select coalesce(sum(commission_cents),0) from orders where status = 'completed') as platform_revenue_cents,
  (select count(*) from shops where status = 'pending') as pending_approvals;
