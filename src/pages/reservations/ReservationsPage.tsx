import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Clock, BellRing, XCircle, Loader2, CheckCircle2, BookOpen, User } from "lucide-react";
import { useAllReservations } from "@/hooks/useReservations";
import { reservationService } from "@/services/reservationService";
import { bookService } from "@/services/bookService";
import { memberService } from "@/services/memberService";
import { Button } from "@/components/atoms/Button";
import { Badge } from "@/components/atoms/Badge";
import { Card, CardContent } from "@/components/atoms/Card";
import { Input } from "@/components/atoms/Input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/atoms/Tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/atoms/Dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/atoms/Select";
import { PageLoader } from "@/components/molecules/LoadingSpinner";
import { EmptyState } from "@/components/molecules/EmptyState";
import { formatDate } from "@/lib/utils";
import type { Book, Profile, Reservation } from "@/types";
import { toast } from "sonner";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function groupByBook(reservations: Reservation[]): Reservation[][] {
  const map = new Map<string, Reservation[]>();
  for (const r of reservations) {
    const key = r.book_id;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  // Sort each group by reserved_at ascending (first come, first served)
  return Array.from(map.values()).map((group) =>
    [...group].sort(
      (a, b) => new Date(a.reserved_at).getTime() - new Date(b.reserved_at).getTime()
    )
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function ReservationsPage() {
  const [searchParams] = useSearchParams();
  const prefillBookId = searchParams.get("bookId");
  const prefillMemberId = searchParams.get("memberId");

  const { reservations, isLoading, refetch } = useAllReservations();
  const [addDialogOpen, setAddDialogOpen] = useState(Boolean(prefillBookId || prefillMemberId));
  const [fulfillTarget, setFulfillTarget] = useState<Reservation | null>(null);

  const pending = reservations.filter((r) => r.status === "pending");
  const available = reservations.filter((r) => r.status === "available");
  const fulfilled = reservations.filter((r) => r.status === "fulfilled");
  const cancelled = reservations.filter((r) => r.status === "cancelled");

  const pendingGroups = groupByBook(pending);
  const availableGroups = groupByBook(available);

  const handleNotify = async (reservation: Reservation) => {
    try {
      await reservationService.notifyReservationAvailable(
        reservation.id,
        reservation.member_id,
        reservation.book?.title ?? "A book"
      );
      toast.success("Member notified — book marked as ready for pickup");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to notify member");
    }
  };

  const handleCancel = async (reservation: Reservation) => {
    try {
      await reservationService.cancelReservation(reservation.id, reservation.book_id);
      toast.success("Reservation cancelled");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel");
    }
  };

  if (isLoading) return <PageLoader text="Loading reservations..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-3">
          <StatPill label="Pending" count={pending.length} color="amber" />
          <StatPill label="Ready for Pickup" count={available.length} color="green" />
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Clock className="h-4 w-4" />
          Add Reservation
        </Button>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="available">Ready for Pickup ({available.length})</TabsTrigger>
          <TabsTrigger value="fulfilled">Fulfilled ({fulfilled.length})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({cancelled.length})</TabsTrigger>
        </TabsList>

        {/* ── Pending ── */}
        <TabsContent value="pending" className="mt-4">
          {pendingGroups.length === 0 ? (
            <EmptyState icon={Clock} title="No pending reservations" />
          ) : (
            <div className="space-y-4">
              {pendingGroups.map((group) => {
                const book = group[0].book;
                const bookIsAvailable = book?.is_available ?? false;
                return (
                  <BookReservationGroup
                    key={group[0].book_id}
                    book={book}
                    reservations={group}
                    renderActions={(r, index) => (
                      <div className="flex items-center gap-2">
                        {/* Notify only for first in queue AND only when book is available */}
                        {index === 0 && bookIsAvailable && (
                          <Button size="sm" onClick={() => handleNotify(r)}>
                            <BellRing className="h-3.5 w-3.5" />
                            Notify Member
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleCancel(r)}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Ready for Pickup ── */}
        <TabsContent value="available" className="mt-4">
          {availableGroups.length === 0 ? (
            <EmptyState icon={BellRing} title="No books waiting for pickup" />
          ) : (
            <div className="space-y-4">
              {availableGroups.map((group) => (
                <BookReservationGroup
                  key={group[0].book_id}
                  book={group[0].book}
                  reservations={group}
                  renderActions={(r, index) => (
                    <div className="flex items-center gap-2">
                      {index === 0 && (
                        <Button size="sm" onClick={() => setFulfillTarget(r)}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Member Picked Up
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleCancel(r)}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancel
                      </Button>
                    </div>
                  )}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Fulfilled ── */}
        <TabsContent value="fulfilled" className="mt-4">
          {fulfilled.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No fulfilled reservations" />
          ) : (
            <div className="space-y-3">
              {fulfilled.map((r) => <FlatReservationRow key={r.id} reservation={r} />)}
            </div>
          )}
        </TabsContent>

        {/* ── Cancelled ── */}
        <TabsContent value="cancelled" className="mt-4">
          {cancelled.length === 0 ? (
            <EmptyState icon={XCircle} title="No cancelled reservations" />
          ) : (
            <div className="space-y-3">
              {cancelled.map((r) => <FlatReservationRow key={r.id} reservation={r} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AddReservationDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSuccess={() => { refetch(); setAddDialogOpen(false); }}
        prefillBookId={prefillBookId ?? undefined}
        prefillMemberId={prefillMemberId ?? undefined}
      />

      <FulfillDialog
        reservation={fulfillTarget}
        onClose={() => setFulfillTarget(null)}
        onSuccess={() => { refetch(); setFulfillTarget(null); }}
      />
    </div>
  );
}

// ─── BookReservationGroup ──────────────────────────────────────────────────────

function BookReservationGroup({
  book,
  reservations,
  renderActions,
}: {
  book: Book | undefined;
  reservations: Reservation[];
  renderActions: (r: Reservation, index: number) => React.ReactNode;
}) {
  const isAvailable = book?.is_available ?? false;

  return (
    <Card className="overflow-hidden">
      {/* Book header */}
      <div className="flex items-center gap-4 px-5 py-4 border-b bg-muted/30">
        <div className="h-12 w-12 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
          {book?.cover_url ? (
            <img src={book.cover_url} alt={book.title} className="h-full w-full object-cover" />
          ) : (
            <BookOpen className="h-5 w-5 text-primary/40" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight">{book?.title ?? "Unknown Book"}</p>
          <p className="text-xs text-muted-foreground">{book?.author}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={isAvailable ? "success" : "destructive"}>
            {isAvailable ? "Available" : "Unavailable"}
          </Badge>
          <span className="text-xs text-muted-foreground font-medium">
            {reservations.length} {reservations.length === 1 ? "request" : "requests"}
          </span>
        </div>
      </div>

      {/* Queue list */}
      <div className="divide-y">
        {reservations.map((r, index) => (
          <div
            key={r.id}
            className={`flex items-center gap-4 px-5 py-3 ${index === 0 ? "bg-primary/[0.03]" : ""}`}
          >
            {/* Position badge */}
            <div
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                index === 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {index + 1}
            </div>

            {/* Member avatar + info */}
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-tight">
                {r.member?.full_name ?? r.member?.email ?? "Unknown"}
                {index === 0 && (
                  <span className="ml-2 text-xs font-normal text-primary">Next in line</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Reserved {formatDate(r.reserved_at)}
                {r.notified_at && ` · Notified ${formatDate(r.notified_at)}`}
              </p>
            </div>

            {/* Actions */}
            {renderActions(r, index)}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── FlatReservationRow (fulfilled / cancelled) ────────────────────────────────

function FlatReservationRow({ reservation }: { reservation: Reservation }) {
  const statusVariant: Record<string, "success" | "destructive" | "secondary"> = {
    fulfilled: "success",
    cancelled: "destructive",
  };

  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
            {reservation.book?.cover_url ? (
              <img src={reservation.book.cover_url} alt={reservation.book.title} className="h-full w-full object-cover" />
            ) : (
              <BookOpen className="h-4 w-4 text-primary/40" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">{reservation.book?.title ?? "Unknown"}</p>
              <Badge variant={statusVariant[reservation.status] ?? "secondary"} className="capitalize">
                {reservation.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {reservation.member?.full_name ?? reservation.member?.email} · {formatDate(reservation.reserved_at)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── StatPill ─────────────────────────────────────────────────────────────────

function StatPill({ label, count, color }: { label: string; count: number; color: string }) {
  const colorMap: Record<string, string> = {
    amber: "bg-amber-100 text-amber-800",
    green: "bg-emerald-100 text-emerald-800",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${colorMap[color]}`}>
      <span className="text-base font-bold">{count}</span>
      {label}
    </span>
  );
}

// ─── FulfillDialog ────────────────────────────────────────────────────────────

function FulfillDialog({
  reservation,
  onClose,
  onSuccess,
}: {
  reservation: Reservation | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [dueDays, setDueDays] = useState(14);
  const [isLoading, setIsLoading] = useState(false);

  if (!reservation) return null;

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await reservationService.fulfillReservation(
        reservation.id,
        reservation.book_id,
        reservation.member_id,
        dueDays
      );
      toast.success("Book handed to member — borrow record created");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fulfill reservation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={Boolean(reservation)} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Member Picked Up Book</DialogTitle>
          <DialogDescription>
            Confirm that{" "}
            <strong>{reservation.member?.full_name ?? reservation.member?.email}</strong>{" "}
            has picked up <strong>"{reservation.book?.title}"</strong>. This will create a borrow
            record and start the loan period.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 py-2">
          <label className="text-sm font-medium">Loan Duration (days)</label>
          <Input
            type="number"
            value={dueDays}
            onChange={(e) => setDueDays(parseInt(e.target.value) || 14)}
            min={1}
            max={60}
          />
          <p className="text-xs text-muted-foreground">
            The book will be due back in {dueDays} day{dueDays !== 1 ? "s" : ""}.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading
              ? <><Loader2 className="h-4 w-4 animate-spin" />Processing...</>
              : "Confirm Pickup"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── AddReservationDialog ─────────────────────────────────────────────────────

function AddReservationDialog({
  open,
  onClose,
  onSuccess,
  prefillBookId,
  prefillMemberId,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefillBookId?: string;
  prefillMemberId?: string;
}) {
  const [books, setBooks] = useState<Book[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [bookId, setBookId] = useState(prefillBookId ?? "");
  const [memberId, setMemberId] = useState(prefillMemberId ?? "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      bookService.getBooks().then(setBooks);
      memberService.getMembers().then(setMembers);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!bookId || !memberId) {
      toast.error("Please select both a book and a member");
      return;
    }
    setIsSaving(true);
    try {
      await reservationService.reserveBook(bookId, memberId);
      toast.success("Reservation created successfully");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create reservation");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reserve Book for Member</DialogTitle>
          <DialogDescription>
            This book will be reserved for the member. Once it becomes available, they will be notified to come and pick it up.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Book <span className="text-destructive">*</span>
            </label>
            <Select value={bookId || "none"} onValueChange={(v) => setBookId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a book" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select a book...</SelectItem>
                {books.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Member <span className="text-destructive">*</span>
            </label>
            <Select value={memberId || "none"} onValueChange={(v) => setMemberId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select a member...</SelectItem>
                {members.filter((m) => m.role === "member").map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.full_name ?? m.email ?? m.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving
              ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
              : "Reserve"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
