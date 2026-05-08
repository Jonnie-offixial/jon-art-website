-- ============================================================
-- JonArt Galleries — Supabase PostgreSQL Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. COMMISSIONS
create table commissions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  name text not null,
  email text not null,
  phone text,
  location text,
  artwork_type text not null,
  medium text,
  canvas_size text,
  budget_range text,
  deadline text,
  description text,
  reference_photos text[],        -- array of Supabase Storage URLs
  status text default 'new'       -- new | in_review | accepted | in_progress | completed | declined
    check (status in ('new','in_review','accepted','in_progress','completed','declined')),
  admin_notes text,
  quoted_price numeric(12,2),
  deposit_paid boolean default false,
  final_paid boolean default false
);

-- 2. CONTACT MESSAGES
create table contacts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  status text default 'unread'
    check (status in ('unread','read','replied'))
);

-- 3. NEWSLETTER SUBSCRIBERS
create table subscribers (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  email text unique not null,
  active boolean default true
);

-- 4. STUDIO VISIT BOOKINGS
create table studio_visits (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  name text not null,
  email text not null,
  visit_date date not null,
  visit_time text not null,
  purpose text,
  notes text,
  status text default 'pending'
    check (status in ('pending','confirmed','cancelled'))
);

-- 5. PRINT ORDERS
create table print_orders (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  print_name text not null,
  size text,
  quantity int default 1,
  customer_name text,
  customer_email text not null,
  shipping_address text,
  amount_ugx numeric(12,2),
  status text default 'pending'
    check (status in ('pending','paid','shipped','delivered'))
);

-- 6. GIFT CARD ORDERS
create table gift_cards (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  amount_ugx numeric(12,2) not null,
  recipient_name text not null,
  recipient_email text not null,
  sender_name text,
  personal_message text,
  code text unique default upper(substring(gen_random_uuid()::text, 1, 12)),
  redeemed boolean default false,
  redeemed_at timestamptz,
  expires_at timestamptz default now() + interval '24 months'
);

-- 7. ARTWORKS (gallery management)
create table artworks (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  title text not null,
  category text,       -- portrait | charcoal | oil | mixed
  medium text,
  dimensions text,
  year int,
  price_ugx numeric(12,2),
  description text,
  image_url text,
  available boolean default true,
  featured boolean default false,
  sort_order int default 0
);

-- ── ROW LEVEL SECURITY ──
-- Public can INSERT (submit forms), only authenticated (admin) can SELECT/UPDATE/DELETE

alter table commissions enable row level security;
alter table contacts enable row level security;
alter table subscribers enable row level security;
alter table studio_visits enable row level security;
alter table print_orders enable row level security;
alter table gift_cards enable row level security;
alter table artworks enable row level security;

-- Anyone can insert (submit forms)
create policy "Public insert commissions" on commissions for insert to anon with check (true);
create policy "Public insert contacts" on contacts for insert to anon with check (true);
create policy "Public insert subscribers" on subscribers for insert to anon with check (true);
create policy "Public insert studio_visits" on studio_visits for insert to anon with check (true);
create policy "Public insert print_orders" on print_orders for insert to anon with check (true);
create policy "Public insert gift_cards" on gift_cards for insert to anon with check (true);

-- Public can read artworks (gallery)
create policy "Public read artworks" on artworks for select to anon using (true);

-- Authenticated admin can do everything
create policy "Admin all commissions" on commissions for all to authenticated using (true);
create policy "Admin all contacts" on contacts for all to authenticated using (true);
create policy "Admin all subscribers" on subscribers for all to authenticated using (true);
create policy "Admin all visits" on studio_visits for all to authenticated using (true);
create policy "Admin all prints" on print_orders for all to authenticated using (true);
create policy "Admin all gifts" on gift_cards for all to authenticated using (true);
create policy "Admin all artworks" on artworks for all to authenticated using (true);

-- ── SEED: sample artworks ──
insert into artworks (title, category, medium, dimensions, year, price_ugx, description, available, featured) values
  ('Ancestral Gaze', 'portrait', 'Oil on Canvas', '60 × 80 cm', 2024, 2800000, 'A study in timeless dignity.', true, true),
  ('Silhouette No. 7', 'charcoal', 'Charcoal on Paper', '100 × 70 cm', 2023, 1500000, 'Light against shadow.', true, false),
  ('Golden Hour', 'oil', 'Oil on Canvas', '50 × 70 cm', 2024, 2200000, 'Warm afternoon light.', true, false),
  ('The Elder', 'charcoal', 'Charcoal on Paper', '45 × 60 cm', 2022, 1200000, 'Every line, a testament.', true, false),
  ('Study in Midnight', 'mixed', 'Mixed Media', '55 × 75 cm', 2023, 1900000, 'Solitude and inner life.', true, false),
  ('Emergence', 'mixed', 'Mixed Media', '65 × 90 cm', 2024, 3100000, 'Awakening and becoming.', true, false);
