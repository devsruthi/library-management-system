-- ============================================================
-- 001_initial_schema.sql
-- Initial schema for Library Management System
-- ============================================================

-- Enable pgcrypto for UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
create type public.user_role as enum ('member', 'librarian');

-- ============================================================
-- PROFILES TABLE
-- Extends auth.users with role and additional info
-- ============================================================
create table if not exists public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  full_name   text,
  email       text,
  phone       text,
  address     text,
  membership_type text not null default 'standard',
  role        public.user_role not null default 'member',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create profile when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- GENRES TABLE
-- ============================================================
create table if not exists public.genres (
  id         uuid default gen_random_uuid() primary key,
  name       text not null unique,
  created_at timestamptz not null default now()
);

-- ============================================================
-- BOOKS TABLE
-- ============================================================
create table if not exists public.books (
  id               uuid default gen_random_uuid() primary key,
  title            text not null,
  author           text not null,
  isbn             text,
  genre_id         uuid references public.genres(id) on delete set null,
  publication_year integer,
  description      text,
  cover_url        text,
  is_available     boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ============================================================
-- BORROW RECORDS TABLE
-- ============================================================
create table if not exists public.borrow_records (
  id          uuid default gen_random_uuid() primary key,
  book_id     uuid not null references public.books(id) on delete restrict,
  member_id   uuid not null references public.profiles(id) on delete restrict,
  borrowed_at timestamptz not null default now(),
  due_date    timestamptz not null,
  returned_at timestamptz,
  status      text not null default 'borrowed' check (status in ('borrowed', 'returned', 'overdue')),
  created_at  timestamptz not null default now()
);

-- ============================================================
-- RESERVATIONS TABLE
-- ============================================================
create table if not exists public.reservations (
  id           uuid default gen_random_uuid() primary key,
  book_id      uuid not null references public.books(id) on delete restrict,
  member_id    uuid not null references public.profiles(id) on delete restrict,
  status       text not null default 'pending' check (status in ('pending', 'available', 'fulfilled', 'cancelled')),
  reserved_at  timestamptz not null default now(),
  notified_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
create table if not exists public.notifications (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  message    text not null,
  type       text not null default 'general' check (type in ('reservation_available', 'overdue', 'general', 'return_reminder')),
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- UPDATED_AT TRIGGER HELPER
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger set_books_updated_at
  before update on public.books
  for each row execute function public.set_updated_at();

create or replace trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table public.profiles      enable row level security;
alter table public.genres         enable row level security;
alter table public.books          enable row level security;
alter table public.borrow_records enable row level security;
alter table public.reservations   enable row level security;
alter table public.notifications  enable row level security;

-- Helper function: get current user's role
create or replace function public.get_my_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql security definer stable;

-- ---- PROFILES ----
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Librarians can view all profiles"
  on public.profiles for select
  using (public.get_my_role() = 'librarian');

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ---- GENRES ----
create policy "Anyone authenticated can view genres"
  on public.genres for select
  using (auth.role() = 'authenticated');

create policy "Librarians can manage genres"
  on public.genres for all
  using (public.get_my_role() = 'librarian');

-- ---- BOOKS ----
create policy "Anyone authenticated can view books"
  on public.books for select
  using (auth.role() = 'authenticated');

create policy "Librarians can insert books"
  on public.books for insert
  with check (public.get_my_role() = 'librarian');

create policy "Librarians can update books"
  on public.books for update
  using (public.get_my_role() = 'librarian');

create policy "Librarians can delete books"
  on public.books for delete
  using (public.get_my_role() = 'librarian');

-- ---- BORROW RECORDS ----
create policy "Members can view their own borrow records"
  on public.borrow_records for select
  using (auth.uid() = member_id);

create policy "Librarians can view all borrow records"
  on public.borrow_records for select
  using (public.get_my_role() = 'librarian');

create policy "Librarians can insert borrow records"
  on public.borrow_records for insert
  with check (public.get_my_role() = 'librarian');

create policy "Librarians can update borrow records"
  on public.borrow_records for update
  using (public.get_my_role() = 'librarian');

-- ---- RESERVATIONS ----
create policy "Members can view their own reservations"
  on public.reservations for select
  using (auth.uid() = member_id);

create policy "Librarians can view all reservations"
  on public.reservations for select
  using (public.get_my_role() = 'librarian');

create policy "Librarians can manage reservations"
  on public.reservations for all
  using (public.get_my_role() = 'librarian');

-- ---- NOTIFICATIONS ----
create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update their own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "Librarians can insert notifications"
  on public.notifications for insert
  with check (public.get_my_role() = 'librarian');
