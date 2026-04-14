-- CivicResolve Supabase schema
-- Run in Supabase SQL Editor

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key,
  auth_id uuid unique,
  name text not null,
  email text not null unique,
  phone text not null default '',
  password_hash text not null default '',
  language text not null default 'en',
  created_at timestamptz not null default now(),
  last_login_at timestamptz,
  email_verified boolean not null default false,
  phone_verified boolean not null default false
);

create index if not exists profiles_auth_id_idx on public.profiles (auth_id);
create index if not exists profiles_phone_idx on public.profiles (phone);

create table if not exists public.complaints (
  id text primary key,
  title text not null,
  description text not null,
  category text not null,
  location text not null,
  ward text not null,
  priority text not null,
  status text not null,
  reported_at timestamptz not null,
  updated_at timestamptz not null,
  updates jsonb not null default '[]'::jsonb,
  support_count integer not null default 0,
  supporters jsonb not null default '[]'::jsonb,
  support_events jsonb not null default '[]'::jsonb,
  department text not null default '',
  ai_summary text not null default '',
  image_data_url text not null default '',
  image_name text not null default '',
  reporter_id text not null,
  reporter_name text not null,
  language text not null default 'en',
  latitude double precision,
  longitude double precision
);

create index if not exists complaints_reporter_id_idx on public.complaints (reporter_id);
create index if not exists complaints_reported_at_idx on public.complaints (reported_at desc);
create index if not exists complaints_status_idx on public.complaints (status);

create table if not exists public.otp_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  channel text not null check (channel in ('email', 'phone')),
  target text not null,
  code_hash text not null,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  used_at timestamptz
);

create index if not exists otp_challenges_user_channel_idx on public.otp_challenges (user_id, channel);
create index if not exists otp_challenges_expires_at_idx on public.otp_challenges (expires_at);

alter table public.profiles enable row level security;
alter table public.complaints enable row level security;
alter table public.otp_challenges enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'complaints' and policyname = 'Public can read complaints'
  ) then
    create policy "Public can read complaints" on public.complaints for select using (true);
  end if;
end $$;

