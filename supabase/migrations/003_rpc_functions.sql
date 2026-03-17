-- ============================================================
-- 003_rpc_functions.sql
-- RPC functions for atomic book availability operations.
-- Each book is a single physical item tracked by is_available.
-- ============================================================

-- Mark a book as borrowed (unavailable)
create or replace function public.borrow_book(p_book_id uuid)
returns void as $$
begin
  update public.books
  set is_available = false
  where id = p_book_id and is_available = true;

  if not found then
    raise exception 'Book is not available for borrowing';
  end if;
end;
$$ language plpgsql security definer;

-- Mark a book as returned (available again)
create or replace function public.return_book(p_book_id uuid)
returns void as $$
begin
  update public.books
  set is_available = true
  where id = p_book_id;
end;
$$ language plpgsql security definer;

-- Mark a book as reserved/held (unavailable)
create or replace function public.reserve_book(p_book_id uuid)
returns void as $$
begin
  update public.books
  set is_available = false
  where id = p_book_id and is_available = true;

  if not found then
    raise exception 'Book is not available to reserve';
  end if;
end;
$$ language plpgsql security definer;

-- Release a reservation — mark book available again
create or replace function public.release_reservation(p_book_id uuid)
returns void as $$
begin
  update public.books
  set is_available = true
  where id = p_book_id;
end;
$$ language plpgsql security definer;
