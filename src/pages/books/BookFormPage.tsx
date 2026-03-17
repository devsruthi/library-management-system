import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { bookService, type BookFormData } from "@/services/bookService";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Textarea } from "@/components/atoms/Textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/Card";
import { FormField } from "@/components/molecules/FormField";
import { PageLoader } from "@/components/molecules/LoadingSpinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/Select";
import type { Genre } from "@/types";
import { toast } from "sonner";

export function BookFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [genres, setGenres] = useState<Genre[]>([]);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof BookFormData, string>>>({});

  const [form, setForm] = useState<BookFormData>({
    title: "",
    author: "",
    isbn: "",
    genre_id: "",
    publication_year: undefined,
    description: "",
    cover_url: "",
    total_copies: 1,
    available_copies: 1,
  });

  useEffect(() => {
    bookService.getGenres().then(setGenres);
    if (isEditing && id) {
      bookService.getBookById(id).then((book) => {
        if (book) {
          setForm({
            title: book.title,
            author: book.author,
            isbn: book.isbn ?? "",
            genre_id: book.genre_id ?? "",
            publication_year: book.publication_year ?? undefined,
            description: book.description ?? "",
            cover_url: book.cover_url ?? "",
            total_copies: book.total_copies,
            available_copies: book.available_copies,
          });
        }
      }).finally(() => setIsLoading(false));
    }
  }, [id, isEditing]);

  const set = (field: keyof BookFormData, value: string | number | undefined) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!form.title.trim()) newErrors.title = "Title is required";
    if (!form.author.trim()) newErrors.author = "Author is required";
    if (form.total_copies < 1) newErrors.total_copies = "Must have at least 1 copy";
    if (form.available_copies < 0) newErrors.available_copies = "Cannot be negative";
    if (form.available_copies > form.total_copies)
      newErrors.available_copies = "Cannot exceed total copies";
    if (form.publication_year && (form.publication_year < 1 || form.publication_year > new Date().getFullYear() + 1))
      newErrors.publication_year = "Invalid year";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      const payload: BookFormData = {
        ...form,
        isbn: form.isbn || undefined,
        genre_id: form.genre_id || undefined,
        description: form.description || undefined,
        cover_url: form.cover_url || undefined,
      };

      if (isEditing && id) {
        await bookService.updateBook(id, payload);
        toast.success("Book updated successfully");
      } else {
        const created = await bookService.createBook(payload);
        toast.success("Book added successfully");
        navigate(`/books/${created.id}`);
        return;
      }
      navigate(`/books/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save book");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <PageLoader text="Loading book..." />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Book" : "Add New Book"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Title" htmlFor="title" required error={errors.title} className="sm:col-span-2">
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="Enter book title"
                />
              </FormField>

              <FormField label="Author" htmlFor="author" required error={errors.author}>
                <Input
                  id="author"
                  value={form.author}
                  onChange={(e) => set("author", e.target.value)}
                  placeholder="Author name"
                />
              </FormField>

              <FormField label="ISBN" htmlFor="isbn" error={errors.isbn}>
                <Input
                  id="isbn"
                  value={form.isbn}
                  onChange={(e) => set("isbn", e.target.value)}
                  placeholder="ISBN number"
                />
              </FormField>

              <FormField label="Genre" htmlFor="genre">
                <Select
                  value={form.genre_id || "none"}
                  onValueChange={(v) => set("genre_id", v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select genre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No genre</SelectItem>
                    {genres.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Publication Year" htmlFor="year" error={errors.publication_year}>
                <Input
                  id="year"
                  type="number"
                  value={form.publication_year ?? ""}
                  onChange={(e) => set("publication_year", e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="e.g. 2023"
                  min={1}
                  max={new Date().getFullYear() + 1}
                />
              </FormField>

              <FormField label="Total Copies" htmlFor="totalCopies" required error={errors.total_copies}>
                <Input
                  id="totalCopies"
                  type="number"
                  value={form.total_copies}
                  onChange={(e) => set("total_copies", parseInt(e.target.value) || 0)}
                  min={1}
                />
              </FormField>

              <FormField label="Available Copies" htmlFor="availableCopies" required error={errors.available_copies}>
                <Input
                  id="availableCopies"
                  type="number"
                  value={form.available_copies}
                  onChange={(e) => set("available_copies", parseInt(e.target.value) || 0)}
                  min={0}
                  max={form.total_copies}
                />
              </FormField>

              <FormField label="Cover Image URL" htmlFor="coverUrl" className="sm:col-span-2">
                <Input
                  id="coverUrl"
                  value={form.cover_url}
                  onChange={(e) => set("cover_url", e.target.value)}
                  placeholder="https://..."
                />
              </FormField>

              <FormField label="Description" htmlFor="description" className="sm:col-span-2">
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Brief description of the book..."
                  rows={4}
                />
              </FormField>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : isEditing ? (
                  "Save Changes"
                ) : (
                  "Add Book"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
