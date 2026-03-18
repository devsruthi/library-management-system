-- Allow librarians to update any member's profile
create policy "Librarians can update any profile"
  on public.profiles for update
  using (public.get_my_role() = 'librarian');
