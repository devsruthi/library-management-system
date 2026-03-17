import { supabase } from "@/lib/supabase";
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
  total_copies: number;
  available_copies: number;
}

export const bookService = {
  async getBooks(filters: BookFilters = {}): Promise<Book[]> {
    let query = supabase
      .from("books")
      .select("*, genre:genres(id, name, created_at)")
      .order("title");

    if (filters.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,author.ilike.%${filters.search}%,isbn.ilike.%${filters.search}%`
      );
    }
    if (filters.genreId) {
      query = query.eq("genre_id", filters.genreId);
    }
    if (filters.availableOnly) {
      query = query.gt("available_copies", 0);
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
