import { supabase } from "@/lib/supabase";
import { normalizeSearch } from "@/lib/utils";
import type { Book, Genre } from "@/types";

export interface BookFilters {
  search?: string;
  genreId?: string;
  availableOnly?: boolean;
}

export interface BookFormData {
  title: string;
  author: string;
  isbn?: string;
  genre_id?: string;
  publication_year?: number;
  description?: string;
  cover_url?: string;
}

export const bookService = {
  async getBooks(filters: BookFilters = {}): Promise<Book[]> {
    // Step 1: if there's a search term, get matching IDs via the space-insensitive
    // RPC function. This handles "robertmartin" → "Robert Martin", etc.
    let matchingIds: string[] | null = null;
    if (filters.search && normalizeSearch(filters.search).length > 0) {
      const { data: idRows, error: searchErr } = await supabase.rpc(
        "search_book_ids",
        { p_search: filters.search }
      );
      if (searchErr) throw searchErr;
      matchingIds = ((idRows ?? []) as { id: string }[]).map((r) => r.id);
      // No IDs matched — return early, no point running the second query
      if (matchingIds.length === 0) return [];
    }

    // Step 2: fetch full book data with genre join, applying the ID filter + other filters
    let query = supabase
      .from("books")
      .select("*, genre:genres(id, name, created_at)")
      .order("title");

    if (matchingIds !== null) {
      query = query.in("id", matchingIds);
    }
    if (filters.genreId) {
      query = query.eq("genre_id", filters.genreId);
    }
    if (filters.availableOnly) {
      query = query.eq("is_available", true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Book[];
  },

  async getBookById(id: string): Promise<Book | null> {
    const { data, error } = await supabase
      .from("books")
      .select("*, genre:genres(id, name, created_at)")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as Book | null;
  },

  async createBook(book: BookFormData): Promise<Book> {
    const { data, error } = await supabase
      .from("books")
      .insert(book)
      .select("*, genre:genres(id, name, created_at)")
      .single();
    if (error) throw error;
    return data as Book;
  },

  async updateBook(id: string, book: Partial<BookFormData>): Promise<Book> {
    const { data, error } = await supabase
      .from("books")
      .update(book)
      .eq("id", id)
      .select("*, genre:genres(id, name, created_at)")
      .single();
    if (error) throw error;
    return data as Book;
  },

  async deleteBook(id: string): Promise<void> {
    const { error } = await supabase.from("books").delete().eq("id", id);
    if (error) throw error;
  },

  async getGenres(): Promise<Genre[]> {
    const { data, error } = await supabase
      .from("genres")
      .select("*")
      .order("name");
    if (error) throw error;
    return (data ?? []) as Genre[];
  },
};
