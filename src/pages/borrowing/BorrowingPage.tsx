import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BookMarked, RotateCcw, AlertCircle, Loader2, Search,
  BookOpen, User, Clock, CheckCircle2, CalendarDays, IndianRupee,
} from "lucide-react";
import { useAllBorrows } from "@/hooks/useBorrows";
import { borrowService } from "@/services/borrowService";
import { bookService } from "@/services/bookService";
import { memberService } from "@/services/memberService";
import { Button } from "@/components/atoms/Button";
import { Badge } from "@/components/atoms/Badge";
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
import { formatDate, isOverdue, MEMBERSHIP_CONFIG } from "@/lib/utils";
import type { Book, Profile, BorrowRecord, MembershipType } from "@/types";
import { toast } from "sonner";
import { differenceInDays, parseISO } from "date-fns";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchesSearch(r: BorrowRecord, search: string): boolean {
  const s = search.toLowerCase();
  return (
    r.book?.title.toLowerCase().includes(s) ||
    r.member?.full_name?.toLowerCase().includes(s) ||
    r.member?.email?.toLowerCase().includes(s) ||
    false
  );
}

function daysOverdue(dueDate: string): number {
  return Math.max(0, differenceInDays(new Date(), parseISO(dueDate)));
}

function daysRemaining(dueDate: string): number {
  return Math.max(0, differenceInDays(parseISO(dueDate), new Date()));
}

function calcFine(dueDate: string, membershipType: string): number {
  const days = daysOverdue(dueDate);
  const config = MEMBERSHIP_CONFIG[membershipType as MembershipType];
  return days * (config?.finePerDay ?? 20);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function BorrowingPage() {
  const [searchParams] = useSearchParams();
  const prefillBookId = searchParams.get("bookId");
  const prefillMemberId = searchParams.get("memberId");

  const { records, isLoading, refetch } = useAllBorrows();
  const [borrowDialogOpen, setBorrowDialogOpen] = useState(
    Boolean(prefillBookId || prefillMemberId)
  );
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BorrowRecord | null>(null);
  const [search, setSearch] = useState("");

  const activeRecords = records.filter((r) => r.status === "borrowed");
  const returnedRecords = records.filter((r) => r.status === "returned");
  const overdueRecords = activeRecords.filter((r) => isOverdue(r.due_date));

  // Total outstanding fine across all overdue records, respecting each member's type
  const totalOutstandingFine = overdueRecords.reduce((sum, r) => {
    return sum + calcFine(r.due_date, r.member?.membership_type ?? "standard");
  }, 0);

  const filteredActive = activeRecords.filter((r) => !search || matchesSearch(r, search));
  const filteredReturned = returnedRecords.filter((r) => !search || matchesSearch(r, search));

  const handleReturnClick = (record: BorrowRecord) => {
    setSelectedRecord(record);
    setReturnDialogOpen(true);
  };

  if (isLoading) return <PageLoader text="Loading borrow records..." />;

  return (
    <div className="space-y-6">

      {/* ── Stat banner ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Active"
          count={activeRecords.length}
          icon={BookMarked}
          color="bg-blue-50 text-blue-600 border-blue-100"
          iconBg="bg-blue-100"
        />
        <StatCard
          label="Overdue"
          count={overdueRecords.length}
          icon={AlertCircle}
          color="bg-red-50 text-red-600 border-red-100"
          iconBg="bg-red-100"
        />
        <StatCard
          label="Returned"
          count={returnedRecords.length}
          icon={CheckCircle2}
          color="bg-emerald-50 text-emerald-600 border-emerald-100"
          iconBg="bg-emerald-100"
        />
        {/* Total outstanding fine */}
        <div className="flex items-center gap-3 rounded-xl border px-4 py-3 bg-orange-50 text-orange-600 border-orange-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0 bg-orange-100">
            <IndianRupee className="h-4 w-4" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">₹{totalOutstandingFine}</p>
            <p className="text-xs font-medium mt-0.5 opacity-80">Total Fine Due</p>
          </div>
        </div>
      </div>

      {/* Fine breakdown by membership type (only when there are overdue records) */}
      {overdueRecords.length > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50/50 px-4 py-3">
          <p className="text-xs font-semibold text-orange-700 mb-2">Fine Breakdown by Membership</p>
          <div className="flex flex-wrap gap-4">
            {(["standard", "public"] as const).map((type) => {
              const typeRecords = overdueRecords.filter(
                (r) => (r.member?.membership_type ?? "standard") === type
              );
              if (typeRecords.length === 0) return null;
              const typeFine = typeRecords.reduce(
                (sum, r) => sum + calcFine(r.due_date, type), 0
              );
              const config = MEMBERSHIP_CONFIG[type];
              return (
                <div key={type} className="flex items-center gap-2 text-sm">
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                    {config.label}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {typeRecords.length} overdue · ₹{config.finePerDay}/day
                  </span>
                  <span className="font-semibold text-orange-700">= ₹{typeFine}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by book or member..."
            className="pl-9"
          />
        </div>
        <Button onClick={() => setBorrowDialogOpen(true)}>
          <BookMarked className="h-4 w-4" />
          Assign Borrow
        </Button>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({filteredActive.length})</TabsTrigger>
          <TabsTrigger value="returned">Returned ({filteredReturned.length})</TabsTrigger>
        </TabsList>

        {/* Active */}
        <TabsContent value="active" className="mt-4">
          {filteredActive.length === 0 ? (
            <EmptyState icon={BookMarked} title="No active borrows" description="All books are currently in the library." />
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium w-12">Cover</th>
                    <th className="px-4 py-3 text-left font-medium">Book</th>
                    <th className="px-4 py-3 text-left font-medium">Member</th>
                    <th className="px-4 py-3 text-left font-medium">Borrowed</th>
                    <th className="px-4 py-3 text-left font-medium">Due Date</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredActive.map((record) => (
                    <ActiveRow
                      key={record.id}
                      record={record}
                      onReturn={() => handleReturnClick(record)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Returned */}
        <TabsContent value="returned" className="mt-4">
          {filteredReturned.length === 0 ? (
            <EmptyState icon={RotateCcw} title="No returned books yet" />
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium w-12">Cover</th>
                    <th className="px-4 py-3 text-left font-medium">Book</th>
                    <th className="px-4 py-3 text-left font-medium">Member</th>
                    <th className="px-4 py-3 text-left font-medium">Borrowed</th>
                    <th className="px-4 py-3 text-left font-medium">Returned On</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredReturned.map((record) => (
                    <ReturnedRow key={record.id} record={record} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AssignBorrowDialog
        open={borrowDialogOpen}
        onClose={() => setBorrowDialogOpen(false)}
        onSuccess={() => { refetch(); setBorrowDialogOpen(false); }}
        prefillBookId={prefillBookId ?? undefined}
        prefillMemberId={prefillMemberId ?? undefined}
      />
      <ReturnDialog
        open={returnDialogOpen}
        record={selectedRecord}
        onClose={() => setReturnDialogOpen(false)}
        onSuccess={() => { refetch(); setReturnDialogOpen(false); }}
      />
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label, count, icon: Icon, color, iconBg,
}: {
  label: string; count: number; icon: React.ElementType;
  color: string; iconBg: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${color}`}>
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${iconBg}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none">{count}</p>
        <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
      </div>
    </div>
  );
}

// ─── ActiveRow ────────────────────────────────────────────────────────────────

function ActiveRow({ record, onReturn }: { record: BorrowRecord; onReturn: () => void }) {
  const overdue = isOverdue(record.due_date);
  const membershipType = record.member?.membership_type ?? "standard";
  const fine = overdue ? calcFine(record.due_date, membershipType) : 0;
  const remaining = !overdue ? daysRemaining(record.due_date) : 0;

  return (
    <tr className={`hover:bg-muted/30 transition-colors ${overdue ? "bg-red-50/40" : ""}`}>
      {/* Cover */}
      <td className="px-4 py-3">
        <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
          {record.book?.cover_url ? (
            <img src={record.book.cover_url} alt={record.book.title} className="h-full w-full object-cover" />
          ) : (
            <BookOpen className="h-4 w-4 text-primary/40" />
          )}
        </div>
      </td>

      {/* Book */}
      <td className="px-4 py-3 max-w-[180px]">
        <p className="font-semibold text-sm leading-tight line-clamp-1">
          {record.book?.title ?? "Unknown"}
        </p>
        {record.book?.author && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{record.book.author}</p>
        )}
      </td>

      {/* Member */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {record.member?.full_name ?? record.member?.email ?? "Unknown"}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {MEMBERSHIP_CONFIG[membershipType as MembershipType]?.label ?? membershipType}
            </p>
          </div>
        </div>
      </td>

      {/* Borrowed date */}
      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
        <div className="flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDate(record.borrowed_at)}
        </div>
      </td>

      {/* Due date */}
      <td className="px-4 py-3 whitespace-nowrap">
        <p className={`text-sm font-medium ${overdue ? "text-destructive" : "text-foreground"}`}>
          {formatDate(record.due_date)}
        </p>
        {overdue ? (
          <div className="flex flex-col gap-0.5 mt-0.5">
            <div className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              {daysOverdue(record.due_date)}d overdue
            </div>
            {fine > 0 && (
              <div className="flex items-center gap-1 text-xs text-destructive font-semibold">
                <IndianRupee className="h-2.5 w-2.5" />
                {fine}
                <span className="font-normal text-muted-foreground">
                  (₹{MEMBERSHIP_CONFIG[membershipType as MembershipType]?.finePerDay ?? 20}/day)
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <Clock className="h-3 w-3" />
            {remaining === 0 ? "Due today" : `${remaining}d left`}
          </div>
        )}
      </td>

      {/* Status badge */}
      <td className="px-4 py-3">
        <Badge variant={overdue ? "destructive" : "info"}>
          {overdue ? "Overdue" : "Active"}
        </Badge>
      </td>

      {/* Action */}
      <td className="px-4 py-3 text-right">
        <Button size="sm" variant="outline" onClick={onReturn} className="whitespace-nowrap">
          <RotateCcw className="h-3.5 w-3.5" />
          Mark Returned
        </Button>
      </td>
    </tr>
  );
}

// ─── ReturnedRow ──────────────────────────────────────────────────────────────

function ReturnedRow({ record }: { record: BorrowRecord }) {
  const returnedOnTime = record.returned_at
    ? !isOverdue(record.due_date) || new Date(record.returned_at) <= new Date(record.due_date)
    : true;

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      {/* Cover */}
      <td className="px-4 py-3">
        <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
          {record.book?.cover_url ? (
            <img src={record.book.cover_url} alt={record.book.title} className="h-full w-full object-cover" />
          ) : (
            <BookOpen className="h-4 w-4 text-primary/40" />
          )}
        </div>
      </td>

      {/* Book */}
      <td className="px-4 py-3 max-w-[180px]">
        <p className="font-semibold text-sm leading-tight line-clamp-1">
          {record.book?.title ?? "Unknown"}
        </p>
        {record.book?.author && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{record.book.author}</p>
        )}
      </td>

      {/* Member */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium truncate">
            {record.member?.full_name ?? record.member?.email ?? "Unknown"}
          </p>
        </div>
      </td>

      {/* Borrowed date */}
      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
        <div className="flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDate(record.borrowed_at)}
        </div>
      </td>

      {/* Returned on */}
      <td className="px-4 py-3 whitespace-nowrap">
        <p className="text-sm font-medium">{formatDate(record.returned_at)}</p>
        <p className={`text-xs mt-0.5 ${returnedOnTime ? "text-emerald-600" : "text-destructive"}`}>
          {returnedOnTime ? "Returned on time" : "Returned late"}
        </p>
      </td>

      {/* Status badge */}
      <td className="px-4 py-3">
        <Badge variant="success">Returned</Badge>
      </td>
    </tr>
  );
}

// ─── AssignBorrowDialog ───────────────────────────────────────────────────────

function AssignBorrowDialog({
  open, onClose, onSuccess, prefillBookId, prefillMemberId,
}: {
  open: boolean; onClose: () => void; onSuccess: () => void;
  prefillBookId?: string; prefillMemberId?: string;
}) {
  const [books, setBooks] = useState<Book[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [bookId, setBookId] = useState(prefillBookId ?? "");
  const [memberId, setMemberId] = useState(prefillMemberId ?? "");
  const [dueDays, setDueDays] = useState(14);
  const [isSaving, setIsSaving] = useState(false);

  const selectedMember = members.find((m) => m.id === memberId);
  const memberConfig = selectedMember
    ? MEMBERSHIP_CONFIG[selectedMember.membership_type as MembershipType]
    : null;

  useEffect(() => {
    if (open) {
      bookService.getBooks({ availableOnly: true }).then(setBooks);
      memberService.getMembers().then(setMembers);
    }
  }, [open]);

  // Auto-set loan days based on membership type when member changes
  useEffect(() => {
    if (memberConfig) setDueDays(memberConfig.loanDays);
  }, [memberId]);

  const handleSubmit = async () => {
    if (!bookId || !memberId) {
      toast.error("Please select both a book and a member");
      return;
    }
    setIsSaving(true);
    try {
      await borrowService.borrowBook(bookId, memberId, dueDays);
      toast.success("Book assigned successfully");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign borrow");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Book to Member</DialogTitle>
          <DialogDescription>
            Select an available book and a member. Loan duration is pre-filled based on membership type.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Book <span className="text-destructive">*</span></label>
            <Select value={bookId || "none"} onValueChange={(v) => setBookId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select available book" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select a book...</SelectItem>
                {books.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Member <span className="text-destructive">*</span></label>
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
            {/* Membership info */}
            {memberConfig && (
              <div className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                {memberConfig.label} · Max {memberConfig.loanDays} days · ₹{memberConfig.finePerDay}/day fine
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Loan Duration (days)</label>
            <Input
              type="number"
              value={dueDays}
              onChange={(e) => setDueDays(parseInt(e.target.value) || 14)}
              min={1}
              max={memberConfig?.loanDays ?? 60}
            />
            {memberConfig && dueDays > memberConfig.loanDays && (
              <p className="text-xs text-destructive">
                Exceeds the {memberConfig.loanDays}-day limit for {memberConfig.label} members.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : "Assign Borrow"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── ReturnDialog ─────────────────────────────────────────────────────────────

function ReturnDialog({
  open, record, onClose, onSuccess,
}: {
  open: boolean; record: BorrowRecord | null; onClose: () => void; onSuccess: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const overdue = record ? isOverdue(record.due_date) : false;
  const membershipType = record?.member?.membership_type ?? "standard";
  const fine = overdue && record ? calcFine(record.due_date, membershipType) : 0;

  const handleReturn = async () => {
    if (!record) return;
    setIsLoading(true);
    try {
      await borrowService.returnBook(record.id, record.book_id);
      toast.success("Book marked as returned");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to process return");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Return</DialogTitle>
          <DialogDescription>
            Mark <strong>"{record?.book?.title}"</strong> as returned by{" "}
            <strong>{record?.member?.full_name ?? "this member"}</strong>?
          </DialogDescription>
        </DialogHeader>

        {/* Summary card */}
        {record && (
          <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Borrowed on</span>
              <span className="font-medium">{formatDate(record.borrowed_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Due date</span>
              <span className={`font-medium ${overdue ? "text-destructive" : ""}`}>
                {formatDate(record.due_date)}
              </span>
            </div>
            {overdue && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Days overdue</span>
                  <span className="font-medium text-destructive">{daysOverdue(record.due_date)} days</span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-1">
                  <span className="text-muted-foreground font-medium">Fine to collect</span>
                  <span className="font-bold text-destructive flex items-center gap-0.5">
                    <IndianRupee className="h-3.5 w-3.5" />{fine}
                  </span>
                </div>
              </>
            )}
            {!overdue && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium text-emerald-600">Returned on time ✓</span>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleReturn} disabled={isLoading}>
            {isLoading
              ? <><Loader2 className="h-4 w-4 animate-spin" />Processing...</>
              : "Confirm Return"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
