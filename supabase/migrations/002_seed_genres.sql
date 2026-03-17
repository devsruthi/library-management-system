-- ============================================================
-- 002_seed_genres.sql
-- Seed data: Book genres for the genre dropdown
-- ============================================================

insert into public.genres (name) values
  ('Fiction'),
  ('Non-Fiction'),
  ('Science Fiction'),
  ('Fantasy'),
  ('Mystery'),
  ('Thriller'),
  ('Romance'),
  ('Historical Fiction'),
  ('Biography'),
  ('Autobiography'),
  ('Self-Help'),
  ('Science & Nature'),
  ('Technology'),
  ('Philosophy'),
  ('Psychology'),
  ('Politics & Society'),
  ('Economics & Business'),
  ('Art & Photography'),
  ('Travel'),
  ('Children''s'),
  ('Young Adult'),
  ('Comics & Graphic Novels'),
  ('Horror'),
  ('Poetry'),
  ('Drama')
on conflict (name) do nothing;
