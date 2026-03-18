import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Loader2, BookOpen, User, Hash, Tag,
  CalendarDays, ImageIcon, AlignLeft, BookMarked,
} from "lucide-react";
import { bookService, type BookFormData } from "@/services/bookService";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Textarea } from "@/components/atoms/Textarea";
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
import { cn } from "@/lib/utils";

export function BookFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [genres, setGenres] = useState<Genre[]>([]);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof BookFormData, string>>>({});
  const [coverError, setCoverError] = useState(false);

  const [form, setForm] = useState<BookFormData>({
    title: "",
    author: "",
    isbn: "",
    genre_id: "",
    publication_year: undefined,
    description: "",
    cover_url: "",
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
          });
        }
      }).finally(() => setIsLoading(false));
    }
  }, [id, isEditing]);

  const set = (field: keyof BookFormData, value: string | number | undefined) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (field === "cover_url") setCoverError(false);
  };

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!form.title.trim()) newErrors.title = "Title is required";
    if (!form.author.trim()) newErrors.author = "Author is required";
    if (!form.genre_id) newErrors.genre_id = "Genre is required";
    if (
      form.publication_year &&
      (form.publication_year < 1 || form.publication_year > new Date().getFullYear() + 1)
    )
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
        description: form.description || undefined,
        cover_url: form.cover_url || undefined,
      };

      if (isEditing && id) {
        await bookService.updateBook(id, payload);
        toast.success("Book updated successfully");
        navigate(`/books/${id}`);
      } else {
        const created = await bookService.createBook(payload);
        toast.success("Book added successfully");
        navigate(`/books/${created.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save book");
    } finally {
      setIsSaving(false);
    }
  };

  const genreLabel = genres.find((g) => g.id === form.genre_id)?.name;
  const hasCover = form.cover_url && !coverError;

  if (isLoading) return <PageLoader text="Loading book..." />;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ── Back + Page header ── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookMarked className="h-6 w-6 text-primary" />
          {isEditing ? "Edit Book" : "Add New Book"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isEditing
            ? "Update the book's details in the catalogue."
            : "Fill in the details below to add a new book to the catalogue."}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* ── Left: Cover preview ── */}
          <div className="lg:sticky lg:top-6 space-y-4">
            <div className="rounded-2xl border bg-gradient-to-b from-muted/40 to-muted/10 p-5 flex flex-col items-center gap-4">
              {/* Cover image */}
              <div className="w-40 h-56 rounded-xl overflow-hidden shadow-md bg-muted flex items-center justify-center shrink-0 border">
                {hasCover ? (
                  <img
                    src={form.cover_url}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                    onError={() => setCoverError(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground/40 px-4 text-center">
                    <BookOpen className="h-10 w-10" />
                    <span className="text-xs">Cover preview</span>
                  </div>
                )}
              </div>

              {/* Live preview meta */}
              <div className="w-full text-center space-y-1">
                <p className={cn(
                  "font-semibold text-sm leading-snug line-clamp-2",
                  !form.title && "text-muted-foreground/50 italic"
                )}>
                  {form.title || "Book Title"}
                </p>
                <p className={cn(
                  "text-xs",
                  form.author ? "text-muted-foreground" : "text-muted-foreground/40 italic"
                )}>
                  {form.author || "Author"}
                </p>
                {genreLabel && (
                  <span className="inline-block mt-1 text-[10px] font-medium bg-primary/10 text-primary rounded-full px-2.5 py-0.5">
                    {genreLabel}
                  </span>
                )}
                {form.publication_year && (
                  <p className="text-[10px] text-muted-foreground">{form.publication_year}</p>
                )}
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              The preview updates as you fill in the form.
            </p>
          </div>

          {/* ── Right: Form sections ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Section: Book Identity */}
            <Section icon={BookOpen} title="Book Identity">
              <FormField label="Title" htmlFor="title" required error={errors.title}>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                    placeholder="e.g. The Pragmatic Programmer"
                    className={cn("pl-9", errors.title && "border-destructive")}
                  />
                </div>
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Author" htmlFor="author" required error={errors.author}>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="author"
                      value={form.author}
                      onChange={(e) => set("author", e.target.value)}
                      placeholder="Author name"
                      className={cn("pl-9", errors.author && "border-destructive")}
                    />
                  </div>
                </FormField>

                <FormField label="ISBN" htmlFor="isbn" error={errors.isbn}>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="isbn"
                      value={form.isbn}
                      onChange={(e) => set("isbn", e.target.value)}
                      placeholder="978-3-16-148410-0"
                      className="pl-9"
                    />
                  </div>
                </FormField>
              </div>
            </Section>

            {/* Section: Catalogue Details */}
            <Section icon={Tag} title="Catalogue Details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Genre" htmlFor="genre" required error={errors.genre_id}>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                    <Select
                      value={form.genre_id || ""}
                      onValueChange={(v) => set("genre_id", v)}
                    >
                      <SelectTrigger className={cn("pl-9", errors.genre_id && "border-destructive")}>
                        <SelectValue placeholder="Select genre" />
                      </SelectTrigger>
                      <SelectContent>
                        {genres.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </FormField>

                <FormField label="Publication Year" htmlFor="year" error={errors.publication_year}>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="year"
                      type="number"
                      value={form.publication_year ?? ""}
                      onChange={(e) =>
                        set("publication_year", e.target.value ? parseInt(e.target.value) : undefined)
                      }
                      placeholder="e.g. 2023"
                      min={1}
                      max={new Date().getFullYear() + 1}
                      className={cn("pl-9", errors.publication_year && "border-destructive")}
                    />
                  </div>
                </FormField>
              </div>
            </Section>

            {/* Section: Presentation */}
            <Section icon={ImageIcon} title="Presentation">
              <FormField label="Cover Image URL" htmlFor="coverUrl">
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="coverUrl"
                    value={form.cover_url}
                    onChange={(e) => set("cover_url", e.target.value)}
                    placeholder="https://example.com/cover.jpg"
                    className="pl-9"
                  />
                </div>
                {coverError && form.cover_url && (
                  <p className="text-xs text-amber-600 mt-1">Image URL could not be loaded — check the link.</p>
                )}
              </FormField>

              <FormField label="Description" htmlFor="description">
                <div className="relative">
                  <AlignLeft className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="A brief summary of what the book is about..."
                    rows={4}
                    className="pl-9 resize-none"
                  />
                </div>
              </FormField>
            </Section>

            {/* ── Actions ── */}
            <div className="flex items-center justify-between pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Fields marked <span className="text-destructive font-medium">*</span> are required.
              </p>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="min-w-28">
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : isEditing ? (
                    "Save Changes"
                  ) : (
                    "Add Book"
                  )}
                </Button>
              </div>
            </div>

          </div>
        </div>
      </form>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b bg-muted/30">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}
