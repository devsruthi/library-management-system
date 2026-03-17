-- ============================================================
-- 003_rpc_functions.sql
-- All RPC functions for atomic inventory operations
-- ============================================================

-- Decrement available_copies when a book is borrowed
create or replace function public.borrow_book(p_book_id uuid)
returns void as $$
begin
  update public.books
  set available_copies = available_copies - 1
  where id = p_book_id and available_copies > 0;

  if not found then
    raise exception 'Book is not available for borrowing';
  end if;
end;
$$ language plpgsql security definer;

-- Increment available_copies when a borrowed book is returned
create or replace function public.return_book(p_book_id uuid)
returns void as $$
begin
  update public.books
  set available_copies = available_copies + 1
  where id = p_book_id and available_copies < total_copies;

  if not found then
    raise exception 'Cannot increment copies beyond total';
  end if;
end;
$$ language plpgsql security definer;

-- Decrement available_copies when a book is reserved (holds the copy for a member)
create or replace function public.reserve_book(p_book_id uuid)
returns void as $$
begin
  update public.books
  set available_copies = available_copies - 1
  where id = p_book_id and available_copies > 0;

  if not found then
    raise exception 'No available copies to reserve for this book';
  end if;
end;
$$ language plpgsql security definer;

-- Increment available_copies when a reservation is cancelled (releases the held copy)
create or replace function public.release_reservation(p_book_id uuid)
returns void as $$
begin
  update public.books
  set available_copies = available_copies + 1
  where id = p_book_id and available_copies < total_copies;
end;
$$ language plpgsql security definer;
