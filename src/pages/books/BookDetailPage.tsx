import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit, Trash2, BookOpen, Calendar, Hash, Tag, Layers, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useBook } from "@/hooks/useBooks";
import { bookService } from "@/services/bookService";
import { Button } from "@/components/atoms/Button";
import { Badge } from "@/components/atoms/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/Card";
import { PageLoader } from "@/components/molecules/LoadingSpinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/atoms/Dialog";
import { toast } from "sonner";

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isLibrarian } = useAuth();
  const { book, isLoading } = useBook(id);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (isLoading) return <PageLoader text="Loading book..." />;
  if (!book) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertCircle className="h-12 w-12 text-muted-foreground mb-3" />
      <h2 className="text-lg font-semibold">Book not found</h2>
      <Button className="mt-4" onClick={() => navigate("/books")}>Back to Books</Button>
    </div>
  );

  const isAvailable = book.available_copies > 0;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await bookService.deleteBook(book.id);
      toast.success("Book deleted");
      navigate("/books");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete book");
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        {isLibrarian && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/books/${id}/edit`)}>
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Cover */}
        <div className="flex h-52 w-36 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 self-start mx-auto sm:mx-0 overflow-hidden">
          {book.cover_url ? (
            <img src={book.cover_url} alt={book.title} className="h-full w-full object-cover" />
          ) : (
            <BookOpen className="h-16 w-16 text-primary/30" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 space-y-3">
          <div>
            <h2 className="text-2xl font-bold leading-tight">{book.title}</h2>
            <p className="text-lg text-muted-foreground">{book.author}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant={isAvailable ? "success" : "destructive"}>
              {isAvailable ? `${book.available_copies} of ${book.total_copies} available` : "Currently unavailable"}
            </Badge>
            {book.genre && <Badge variant="secondary">{book.genre.name}</Badge>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {book.isbn && (
              <InfoItem icon={Hash} label="ISBN" value={book.isbn} />
            )}
            {book.publication_year && (
              <InfoItem icon={Calendar} label="Published" value={book.publication_year.toString()} />
            )}
            <InfoItem icon={Layers} label="Total Copies" value={book.total_copies.toString()} />
            <InfoItem icon={Tag} label="Available" value={book.available_copies.toString()} />
          </div>

          {book.description && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">About this book</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{book.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Action card for librarians */}
      {isLibrarian && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Library Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              onClick={() => navigate(`/borrowing?bookId=${id}`)}
              disabled={!isAvailable}
            >
              Assign to Member
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/reservations?bookId=${id}`)}
            >
              Reserve for Member
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete book?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>"{book.title}"</strong> from the catalogue.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
