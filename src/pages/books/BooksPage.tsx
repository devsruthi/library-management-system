import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, BookOpen, SlidersHorizontal, Pencil, Trash2, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useBooks } from "@/hooks/useBooks";
import { useDebounce } from "@/hooks/useDebounce";
import { bookService } from "@/services/bookService";
import { SearchBar } from "@/components/molecules/SearchBar";
import { EmptyState } from "@/components/molecules/EmptyState";
import { LoadingSpinner } from "@/components/molecules/LoadingSpinner";
import { Button } from "@/components/atoms/Button";
import { Badge } from "@/components/atoms/Badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/Select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/atoms/Dialog";
import type { Book } from "@/types";
import { toast } from "sonner";

export function BooksPage() {
  const navigate = useNavigate();
  const { isLibrarian } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const debouncedSearch = useDebounce(search, 350);

  const { books, genres, isLoading, refetch } = useBooks({
    search: debouncedSearch || undefined,
    genreId: selectedGenre !== "all" ? selectedGenre : undefined,
    availableOnly,
  });

  const activeFilters = [
    availableOnly && "Available only",
    selectedGenre !== "all" && genres.find((g) => g.id === selectedGenre)?.name,
  ].filter(Boolean);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await bookService.deleteBook(deleteTarget.id);
      toast.success(`"${deleteTarget.title}" deleted`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete book");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          {isLoading ? "Searching..." : `${books.length} ${books.length === 1 ? "book" : "books"} found`}
        </p>
        {isLibrarian && (
          <Button onClick={() => navigate("/books/new")} size="sm">
            <Plus className="h-4 w-4" />
            Add Book
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by title or author..."
          className="flex-1"
        />
        <Select value={selectedGenre} onValueChange={setSelectedGenre}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All genres" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All genres</SelectItem>
            {genres.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={availableOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setAvailableOnly(!availableOnly)}
          className="shrink-0"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Available only</span>
        </Button>
      </div>

      {/* Active filter pills */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((f) => (
            <Badge key={f as string} variant="secondary" className="gap-1">
              {f as string}
            </Badge>
          ))}
          <button
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            onClick={() => { setSelectedGenre("all"); setAvailableOnly(false); setSearch(""); }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Table / states */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" text="Loading books..." />
        </div>
      ) : books.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No books found"
          description="Try adjusting your search or filters."
          action={
            isLibrarian ? (
              <Button onClick={() => navigate("/books/new")}>
                <Plus className="h-4 w-4" />
                Add the first book
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium w-14">Cover</th>
                  <th className="px-4 py-3 text-left font-medium">Title</th>
                  <th className="px-4 py-3 text-left font-medium">Author</th>
                  <th className="px-4 py-3 text-left font-medium">Genre</th>
                  <th className="px-4 py-3 text-left font-medium">ISBN</th>
                  <th className="px-4 py-3 text-left font-medium">Year</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  {isLibrarian && (
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {books.map((book) => (
                  <tr
                    key={book.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    {/* Cover */}
                    <td className="px-4 py-3">
                      <div
                        className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 cursor-pointer"
                        onClick={() => navigate(`/books/${book.id}`)}
                      >
                        {book.cover_url ? (
                          <img
                            src={book.cover_url}
                            alt={book.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <BookOpen className="h-4 w-4 text-primary/40" />
                        )}
                      </div>
                    </td>

                    {/* Title */}
                    <td className="px-4 py-3 max-w-[220px]">
                      <p
                        className="font-medium leading-tight line-clamp-2 cursor-pointer hover:text-primary transition-colors"
                        onClick={() => navigate(`/books/${book.id}`)}
                      >
                        {book.title}
                      </p>
                    </td>

                    {/* Author */}
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {book.author}
                    </td>

                    {/* Genre */}
                    <td className="px-4 py-3">
                      {book.genre ? (
                        <Badge variant="secondary" className="whitespace-nowrap">
                          {book.genre.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* ISBN */}
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs whitespace-nowrap">
                      {book.isbn ?? "—"}
                    </td>

                    {/* Year */}
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {book.publication_year ?? "—"}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <Badge
                        variant={book.is_available ? "success" : "destructive"}
                      >
                        {book.is_available ? "Available" : "Unavailable"}
                      </Badge>
                    </td>

                    {/* Actions (librarian only) */}
                    {isLibrarian && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 shadow-sm"
                            onClick={() => navigate(`/books/${book.id}/edit`)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 shadow-sm text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(book)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete book?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>"{deleteTarget?.title}"</strong> from the
              catalogue. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Deleting...</>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
