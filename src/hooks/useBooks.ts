import { useState, useEffect, useCallback } from "react";
import { bookService } from "@/services/bookService";
import type { Book, Genre } from "@/types";

interface BookFilters {
  search?: string;
  genreId?: string;
  availableOnly?: boolean;
}

// Destructure filter primitives directly so useCallback can diff them properly.
// Passing the object literal itself would create a new reference every render,
// causing infinite refetch loops.
export function useBooks({ search, genreId, availableOnly }: BookFilters = {}) {
  const [books, setBooks] = useState<Book[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBooks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await bookService.getBooks({ search, genreId, availableOnly });
      setBooks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load books");
    } finally {
      setIsLoading(false);
    }
  // Primitive deps — stable comparison, re-fetches only when a filter value actually changes
  }, [search, genreId, availableOnly]);

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

  return { books, genres, isLoading, error, refetch: fetchBooks };
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
