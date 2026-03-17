import { useState, useEffect, useCallback } from "react";
import { bookService, type BookFilters } from "@/services/bookService";
import type { Book, Genre } from "@/types";

export function useBooks(initialFilters: BookFilters = {}) {
  const [books, setBooks] = useState<Book[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<BookFilters>(initialFilters);

  const fetchBooks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await bookService.getBooks(filters);
      setBooks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load books");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const fetchGenres = useCallback(async () => {
    try {
      const data = await bookService.getGenres();
      setGenres(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  useEffect(() => {
    fetchGenres();
  }, [fetchGenres]);

  return {
    books,
    genres,
    isLoading,
    error,
    filters,
    setFilters,
    refetch: fetchBooks,
  };
}

export function useBook(id: string | undefined) {
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    bookService
      .getBookById(id)
      .then(setBook)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  return { book, isLoading, error };
}
