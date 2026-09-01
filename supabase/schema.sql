-- ============================================================
-- STUDENT MART — SCHEMA v2
-- Inquiry-based marketplace: buyer submits a custom form per product,
-- dealer contacts them off-platform, dealer self-reports the sale,
-- commission accrues to a ledger cleared via a weekly due.
--
-- Run in Supabase → SQL Editor. Safe to re-run (if not exists / on conflict do nothing).
-- If you already ran the old schema.sql, run this AFTER it — it drops/recreates the
-- tables that changed shape (orders/order_items → inquiries) and adds new ones.
-- ============================================================

drop table if exists order_items cascade;
drop table if exists orders cascade;
drop view if exists shop_analytics cascade;
drop view if exists platform_analytics cascade;

-- ---------- PROFILES ----------
-- role hierarchy: buyer < dealer < admin < super_admin
create table if not exists profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  email             text not null,
  full_name         text,
  phone             text,
  role              text not null default 'buyer' check (role in ('buyer','dealer','admin','super_admin')),
  account_fee_paid  boolean not null default false,
  account_fee_paid_at timestamptz,
  created_by_admin  uuid references profiles(id),
  created_at        timestamptz not null default now()
);

alter table profiles enable row level security;
drop policy if exists "profiles_select_own_or_public" on profiles;
create policy "profiles_select_own_or_public" on profiles for select using (true);
drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);

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

-- ---------- PLAZAS ----------
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
drop policy if exists "plazas_public_read" on plazas;
create policy "plazas_public_read" on plazas for select using (status = 'active');
drop policy if exists "plazas_admin_write" on plazas;
create policy "plazas_admin_write" on plazas for all using (auth.jwt() ->> 'role' = 'service_role');

-- ---------- SHOPS (dealer storefronts) ----------
create table if not exists shops (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references profiles(id) on delete cascade,
  plaza_id        uuid references plazas(id) on delete set null,
  name            text not null,
  slug            text unique not null,
  logo_url        text not null,
  category        text not null check (category in ('physical','services','digital','idea')),
  description     text not null,
  contact_email   text,
  contact_phone   text,
  status          text not null default 'pending' check (status in ('pending','approved','flagged','suspended')),

  default_inquiry_form jsonb not null default '[]',

  commission_owed_cents int not null default 0,
  completed_sales_count int not null default 0,
  next_due_at           timestamptz,
  last_payment_at        timestamptz,

  created_at      timestamptz not null default now(),
  approved_at     timestamptz
);
alter table shops enable row level security;
drop policy if exists "shops_public_read_approved" on shops;
create policy "shops_public_read_approved" on shops for select using (status = 'approved');
drop policy if exists "shops_owner_read_own" on shops;
create policy "shops_owner_read_own" on shops for select using (auth.uid() = owner_id);
drop policy if exists "shops_owner_insert" on shops;
create policy "shops_owner_insert" on shops for insert with check (auth.uid() = owner_id);
drop policy if exists "shops_owner_update_own" on shops;
create policy "shops_owner_update_own" on shops for update using (auth.uid() = owner_id);

-- ---------- PRODUCTS ----------
create table if not exists products (
  id            uuid primary key default gen_random_uuid(),
  shop_id       uuid not null references shops(id) on delete cascade,
  title         text not null,
  description   text not null,
  price_cents   int not null check (price_cents >= 0),
  listing_type  text not null default 'product' check (listing_type in ('product','service','digital','idea')),
  tags          text[] default '{}',
  images        text[] not null default '{}',
  inquiry_form  jsonb not null default '[]',
  status        text not null default 'active' check (status in ('active','flagged','archived')),
  view_count    int not null default 0,
  inquiry_count int not null default 0,
  created_at    timestamptz not null default now()
);
alter table products enable row level security;
drop policy if exists "products_public_read_active" on products;
create policy "products_public_read_active" on products
  for select using (status = 'active' and exists (select 1 from shops s where s.id = shop_id and s.status = 'approved'));
drop policy if exists "products_owner_read_own" on products;
create policy "products_owner_read_own" on products
  for select using (exists (select 1 from shops s where s.id = shop_id and s.owner_id = auth.uid()));
drop policy if exists "products_owner_write" on products;
create policy "products_owner_write" on products
  for all using (exists (select 1 from shops s where s.id = shop_id and s.owner_id = auth.uid()));

-- ---------- INQUIRIES (replaces cart/orders — the buyer's submitted form) ----------
create table if not exists inquiries (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null references products(id),
  shop_id           uuid not null references shops(id),
  buyer_id          uuid references profiles(id),

  buyer_name        text not null,
  buyer_email       text not null,
  buyer_phone       text not null,
  custom_responses  jsonb not null default '{}',

  status            text not null default 'new' check (status in ('new','contacted','in_progress','completed','cancelled')),

  agreed_amount_cents      int,
  commission_rate_snapshot numeric(4,2),
  commission_cents          int,

  created_at        timestamptz not null default now(),
  completed_at       timestamptz
);
alter table inquiries enable row level security;
drop policy if exists "inquiries_owner_shop_read" on inquiries;
create policy "inquiries_owner_shop_read" on inquiries
  for select using (exists (select 1 from shops s where s.id = shop_id and s.owner_id = auth.uid()));
drop policy if exists "inquiries_buyer_read_own" on inquiries;
create policy "inquiries_buyer_read_own" on inquiries for select using (auth.uid() = buyer_id);
drop policy if exists "inquiries_insert_anyone" on inquiries;
create policy "inquiries_insert_anyone" on inquiries for insert with check (true);
drop policy if exists "inquiries_owner_shop_update" on inquiries;
create policy "inquiries_owner_shop_update" on inquiries
  for update using (exists (select 1 from shops s where s.id = shop_id and s.owner_id = auth.uid()));

-- ---------- NOTIFICATIONS ----------
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  shop_id     uuid references shops(id) on delete cascade,
  type        text not null check (type in ('due_soon','overdue','approval','payment_confirmed','general')),
  message     text not null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table notifications enable row level security;
drop policy if exists "notifications_owner_read" on notifications;
create policy "notifications_owner_read" on notifications for select using (auth.uid() = profile_id);
drop policy if exists "notifications_owner_update" on notifications;
create policy "notifications_owner_update" on notifications for update using (auth.uid() = profile_id);
drop policy if exists "notifications_service_write" on notifications;
create policy "notifications_service_write" on notifications for insert with check (true);

-- ---------- CMS PAGES ----------
create table if not exists cms_pages (
  slug          text primary key,
  title         text not null,
  content_md    text not null,
  updated_by    uuid references profiles(id),
  updated_at    timestamptz not null default now()
);
alter table cms_pages enable row level security;
drop policy if exists "cms_public_read" on cms_pages;
create policy "cms_public_read" on cms_pages for select using (true);
drop policy if exists "cms_admin_write" on cms_pages;
create policy "cms_admin_write" on cms_pages for all using (auth.jwt() ->> 'role' = 'service_role');

insert into cms_pages (slug, title, content_md) values
('about', 'What is Student Mart?', E'## What is Student Mart?\n\nStudent Mart (SMart) is a campus marketplace where student entrepreneurs list physical goods, freelance services, digital products, and early-stage startup ideas.\n\n## How it works\n\n1. **Dealers** (sellers) open a shop and pay a one-time account fee.\n2. Each product can have its own **custom inquiry form** — the dealer decides what they need to know from a buyer.\n3. A **buyer fills that form** — no account required. The dealer gets the submission and contacts the buyer directly to arrange payment and delivery.\n4. Student Mart takes **5% of every completed sale**, collected as part of the dealer''s **weekly platform due** alongside a flat weekly fee.\n\nThis page is editable by the Student Mart team at any time.'),
('policy', 'Student Mart Policy & Who We Are', E'## Who We Are\n\nStudent Mart was founded by **Seemab Mehmood**, a final-year medical student at Fatima Jinnah Medical University, Lahore, to give student entrepreneurs a single, trustworthy place to launch and grow their campus businesses.\n\n## Platform Policy\n\n- All buyer inquiries must be submitted through Student Mart.\n- Dealers pay a one-time account-opening fee to activate their shop.\n- Student Mart takes 5% of every completed sale, tracked as a running balance and settled through the dealer''s weekly platform due.\n- Dealers must keep their weekly due current to remain visible in Explore; overdue accounts may be suspended.\n- Every shop requires a logo and description before it can be listed.\n\nThis page is editable by the Student Mart team at any time.')
on conflict (slug) do nothing;

-- ---------- PAYMENT SETTINGS ----------
-- Methods DEALERS use to pay Student Mart (account fee + weekly dues) — there is no
-- buyer-facing checkout anymore since sales happen off-platform.
create table if not exists payment_settings (
  id                serial primary key,
  stripe_enabled    boolean not null default false,
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
drop policy if exists "payment_settings_public_read" on payment_settings;
create policy "payment_settings_public_read" on payment_settings for select using (true);
drop policy if exists "payment_settings_admin_write" on payment_settings;
create policy "payment_settings_admin_write" on payment_settings for all using (auth.jwt() ->> 'role' = 'service_role');
insert into payment_settings (id) values (1) on conflict (id) do nothing;

-- ---------- PLATFORM SETTINGS ----------
create table if not exists platform_settings (
  id                    int primary key default 1,
  commission_rate       numeric(4,2) not null default 5.00,
  account_opening_fee_cents int not null default 500,
  weekly_due_cents          int not null default 200,
  due_grace_days            int not null default 2,
  updated_at            timestamptz not null default now(),
  constraint single_row check (id = 1)
);
alter table platform_settings enable row level security;
drop policy if exists "platform_settings_public_read" on platform_settings;
create policy "platform_settings_public_read" on platform_settings for select using (true);
drop policy if exists "platform_settings_admin_write" on platform_settings;
create policy "platform_settings_admin_write" on platform_settings for all using (auth.jwt() ->> 'role' = 'service_role');
insert into platform_settings (id) values (1) on conflict (id) do nothing;

-- ---------- STORAGE BUCKETS ----------
insert into storage.buckets (id, name, public) values ('shop-logos','shop-logos', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('product-images','product-images', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('payment-proofs','payment-proofs', true) on conflict (id) do nothing;

drop policy if exists "public read shop-logos" on storage.objects;
create policy "public read shop-logos" on storage.objects for select using (bucket_id = 'shop-logos');
drop policy if exists "public read product-images" on storage.objects;
create policy "public read product-images" on storage.objects for select using (bucket_id = 'product-images');
drop policy if exists "public read payment-proofs" on storage.objects;
create policy "public read payment-proofs" on storage.objects for select using (bucket_id = 'payment-proofs');
drop policy if exists "authenticated upload shop-logos" on storage.objects;
create policy "authenticated upload shop-logos" on storage.objects for insert with check (bucket_id = 'shop-logos' and auth.role() = 'authenticated');
drop policy if exists "authenticated upload product-images" on storage.objects;
create policy "authenticated upload product-images" on storage.objects for insert with check (bucket_id = 'product-images' and auth.role() = 'authenticated');
drop policy if exists "anyone upload payment-proofs" on storage.objects;
create policy "anyone upload payment-proofs" on storage.objects for insert with check (bucket_id = 'payment-proofs');

-- ---------- VIEWS ----------
create or replace view shop_analytics as
select
  s.id as shop_id,
  coalesce(sum(p.view_count), 0) as total_views,
  coalesce(sum(p.inquiry_count), 0) as total_inquiries,
  count(distinct i.id) filter (where i.status = 'completed') as completed_sales,
  coalesce(sum(i.agreed_amount_cents) filter (where i.status = 'completed'), 0) as gross_earnings_cents,
  coalesce(sum(i.commission_cents) filter (where i.status = 'completed'), 0) as commission_paid_cents
from shops s
left join products p on p.shop_id = s.id
left join inquiries i on i.shop_id = s.id
group by s.id;

create or replace view platform_analytics as
select
  (select count(*) from shops where status = 'approved') as active_dealers,
  (select count(*) from inquiries where status = 'completed') as completed_sales,
  (select coalesce(sum(agreed_amount_cents),0) from inquiries where status = 'completed') as total_volume_cents,
  (select coalesce(sum(commission_cents),0) from inquiries where status = 'completed') as commission_earned_cents,
  (select coalesce(sum(commission_owed_cents),0) from shops) as commission_outstanding_cents,
  (select count(*) from shops where status = 'pending') as pending_approvals,
  (select count(*) from shops where status = 'approved' and next_due_at < now()) as dealers_overdue;
