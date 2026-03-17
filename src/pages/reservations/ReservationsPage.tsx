import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Clock, BellRing, XCircle, Loader2, CheckCircle2 } from "lucide-react";
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
      toast.success("Reservation cancelled — copy released back to inventory");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel");
    }
  };

  if (isLoading) return <PageLoader text="Loading reservations..." />;

  return (
    <div className="space-y-6">
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

        <TabsContent value="pending" className="mt-4">
          {pending.length === 0 ? (
            <EmptyState icon={Clock} title="No pending reservations" />
          ) : (
            <div className="space-y-3">
              {pending.map((r) => (
                <ReservationCard
                  key={r.id}
                  reservation={r}
                  onNotify={() => handleNotify(r)}
                  onCancel={() => handleCancel(r)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="available" className="mt-4">
          {available.length === 0 ? (
            <EmptyState icon={BellRing} title="No books waiting for pickup" />
          ) : (
            <div className="space-y-3">
              {available.map((r) => (
                <ReservationCard
                  key={r.id}
                  reservation={r}
                  onFulfill={() => setFulfillTarget(r)}
                  onCancel={() => handleCancel(r)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="fulfilled" className="mt-4">
          {fulfilled.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No fulfilled reservations" />
          ) : (
            <div className="space-y-3">
              {fulfilled.map((r) => <ReservationCard key={r.id} reservation={r} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="mt-4">
          {cancelled.length === 0 ? (
            <EmptyState icon={XCircle} title="No cancelled reservations" />
          ) : (
            <div className="space-y-3">
              {cancelled.map((r) => <ReservationCard key={r.id} reservation={r} />)}
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

// ─── Sub-components ────────────────────────────────────────────────────────────

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

function ReservationCard({
  reservation,
  onNotify,
  onCancel,
  onFulfill,
}: {
  reservation: Reservation;
  onNotify?: () => void;
  onCancel?: () => void;
  onFulfill?: () => void;
}) {
  const statusVariant: Record<string, "info" | "success" | "warning" | "destructive" | "secondary"> = {
    pending: "warning",
    available: "success",
    fulfilled: "secondary",
    cancelled: "destructive",
  };

  return (
    <Card>
      <CardContent className="py-4 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <p className="font-semibold text-sm">{reservation.book?.title ?? "Unknown"}</p>
              <Badge variant={statusVariant[reservation.status] ?? "secondary"} className="capitalize">
                {reservation.status === "available" ? "Ready for Pickup" : reservation.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Reserved for{" "}
              <span className="font-medium text-foreground">
                {reservation.member?.full_name ?? reservation.member?.email ?? "Unknown"}
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Reserved on {formatDate(reservation.reserved_at)}
              {reservation.notified_at && ` · Notified ${formatDate(reservation.notified_at)}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {onNotify && (
              <Button size="sm" onClick={onNotify}>
                <BellRing className="h-3.5 w-3.5" />
                Notify Member
              </Button>
            )}
            {onFulfill && (
              <Button size="sm" onClick={onFulfill}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Member Picked Up
              </Button>
            )}
            {onCancel && (
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={onCancel}>
                <XCircle className="h-3.5 w-3.5" />
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Dialog shown when a member arrives to pick up their reserved book */
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
      // Only show books that actually have available copies to hold
      bookService.getBooks({ availableOnly: true }).then(setBooks);
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
      toast.success("Book reserved — copy is now held for this member");
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
            A copy will be held for the member immediately — the available count will decrease
            so it won't be assigned to someone else by mistake.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Book <span className="text-destructive">*</span>
            </label>
            <Select value={bookId || "none"} onValueChange={(v) => setBookId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select available book" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select a book...</SelectItem>
                {books.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.title}
                    <span className="ml-1 text-muted-foreground">
                      ({b.available_copies} available)
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {books.length === 0 && (
              <p className="text-xs text-destructive">No books with available copies right now.</p>
            )}
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
          <Button onClick={handleSubmit} disabled={isSaving || books.length === 0}>
            {isSaving
              ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
              : "Reserve & Hold Copy"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
