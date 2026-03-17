import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, BookOpen, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useBooks } from "@/hooks/useBooks";
import { SearchBar } from "@/components/molecules/SearchBar";
import { BookCard } from "@/components/molecules/BookCard";
import { EmptyState } from "@/components/molecules/EmptyState";
import { PageLoader } from "@/components/molecules/LoadingSpinner";
import { Button } from "@/components/atoms/Button";
import { Badge } from "@/components/atoms/Badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/Select";

export function BooksPage() {
  const navigate = useNavigate();
  const { isLibrarian } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [availableOnly, setAvailableOnly] = useState(false);

  const { books, genres, isLoading } = useBooks({
    search: search || undefined,
    genreId: selectedGenre !== "all" ? selectedGenre : undefined,
    availableOnly,
  });

  const activeFilters = [
    availableOnly && "Available only",
    selectedGenre !== "all" && genres.find((g) => g.id === selectedGenre)?.name,
  ].filter(Boolean);

  if (isLoading) return <PageLoader text="Loading books..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">
            {books.length} {books.length === 1 ? "book" : "books"} found
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isLibrarian && (
            <Button onClick={() => navigate("/books/new")} size="sm">
              <Plus className="h-4 w-4" />
              Add Book
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by title, author, or ISBN..."
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

      {/* Active filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((f) => (
            <Badge key={f as string} variant="secondary" className="gap-1">
              {f as string}
            </Badge>
          ))}
          <button
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            onClick={() => {
              setSelectedGenre("all");
              setAvailableOnly(false);
              setSearch("");
            }}
          >
            Clear all
          </button>
        </div>
      )}

      {books.length === 0 ? (
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onClick={() => navigate(`/books/${book.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
