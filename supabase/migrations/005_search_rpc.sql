-- ============================================================
-- 005_search_rpc.sql
-- Space-insensitive book search function.
-- Strips all spaces from both the search query and the column
-- values before comparing, so "robertmartin" matches "Robert Martin",
-- "CleanCode" matches "Clean Code", etc.
-- ============================================================

create or replace function public.search_book_ids(p_search text)
returns table(id uuid) as $$
declare
  -- Normalize: lowercase + strip every space/tab character
  normalized text := replace(replace(lower(trim(p_search)), ' ', ''), '	', '');
begin
  return query
  select b.id
  from public.books b
  where
    -- Title match (space-stripped both sides)
    replace(lower(b.title), ' ', '') ilike '%' || normalized || '%'
    -- Author match (space-stripped both sides)
    or replace(lower(b.author), ' ', '') ilike '%' || normalized || '%'
    -- ISBN match (keep spaces, user usually types digits only)
    or replace(lower(coalesce(b.isbn, '')), '-', '') ilike '%' || normalized || '%';
end;
$$ language plpgsql security definer stable;
