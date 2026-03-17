import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BookMarked, RotateCcw, AlertCircle, Loader2, Search } from "lucide-react";
import { useAllBorrows } from "@/hooks/useBorrows";
import { borrowService } from "@/services/borrowService";
import { bookService } from "@/services/bookService";
import { memberService } from "@/services/memberService";
import { Button } from "@/components/atoms/Button";
import { Badge } from "@/components/atoms/Badge";
import { Card, CardContent } from "@/components/atoms/Card";
import { Input } from "@/components/atoms/Input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/atoms/Tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from "@/components/atoms/Dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/atoms/Select";
import { PageLoader } from "@/components/molecules/LoadingSpinner";
import { EmptyState } from "@/components/molecules/EmptyState";
import { formatDate, isOverdue } from "@/lib/utils";
import type { Book, Profile, BorrowRecord } from "@/types";
import { toast } from "sonner";

export function BorrowingPage() {
  const [searchParams] = useSearchParams();
  const prefillBookId = searchParams.get("bookId");
  const prefillMemberId = searchParams.get("memberId");

  const { records, isLoading, refetch } = useAllBorrows();
  const [borrowDialogOpen, setBorrowDialogOpen] = useState(Boolean(prefillBookId || prefillMemberId));
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BorrowRecord | null>(null);
  const [search, setSearch] = useState("");

  const activeRecords = records.filter((r) => r.status === "borrowed");
  const returnedRecords = records.filter((r) => r.status === "returned");
  const overdueRecords = activeRecords.filter((r) => isOverdue(r.due_date));

  const filteredActive = activeRecords.filter((r) =>
    !search || matchesSearch(r, search)
  );
  const filteredReturned = returnedRecords.filter((r) =>
    !search || matchesSearch(r, search)
  );

  const handleReturnClick = (record: BorrowRecord) => {
    setSelectedRecord(record);
    setReturnDialogOpen(true);
  };

  if (isLoading) return <PageLoader text="Loading borrow records..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          <StatPill label="Active" count={activeRecords.length} color="blue" />
          <StatPill label="Overdue" count={overdueRecords.length} color="red" />
          <StatPill label="Returned" count={returnedRecords.length} color="green" />
        </div>
        <Button onClick={() => setBorrowDialogOpen(true)}>
          <BookMarked className="h-4 w-4" />
          Assign Borrow
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by book or member..."
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({filteredActive.length})</TabsTrigger>
          <TabsTrigger value="returned">Returned ({filteredReturned.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {filteredActive.length === 0 ? (
            <EmptyState icon={BookMarked} title="No active borrows" description="All books are in." />
          ) : (
            <div className="space-y-3">
              {filteredActive.map((record) => (
                <BorrowRecordCard
                  key={record.id}
                  record={record}
                  onReturn={() => handleReturnClick(record)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="returned" className="mt-4">
          {filteredReturned.length === 0 ? (
            <EmptyState icon={RotateCcw} title="No returned books yet" />
          ) : (
            <div className="space-y-3">
              {filteredReturned.map((record) => (
                <BorrowRecordCard key={record.id} record={record} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

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

function matchesSearch(r: BorrowRecord, search: string): boolean {
  const s = search.toLowerCase();
  return (
    r.book?.title.toLowerCase().includes(s) ||
    r.member?.full_name?.toLowerCase().includes(s) ||
    r.member?.email?.toLowerCase().includes(s) ||
    false
  );
}

function StatPill({ label, count, color }: { label: string; count: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-800",
    red: "bg-red-100 text-red-800",
    green: "bg-emerald-100 text-emerald-800",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${colorMap[color]}`}>
      <span className="text-base font-bold">{count}</span>
      {label}
    </span>
  );
}

function BorrowRecordCard({ record, onReturn }: { record: BorrowRecord; onReturn?: () => void }) {
  const overdue = record.status === "borrowed" && isOverdue(record.due_date);

  return (
    <Card className={overdue ? "border-destructive/40" : ""}>
      <CardContent className="py-4 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <p className="font-semibold text-sm">{record.book?.title ?? "Unknown"}</p>
              {overdue && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Overdue
                </Badge>
              )}
              {record.status === "returned" && <Badge variant="success">Returned</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              Borrowed by <span className="font-medium text-foreground">{record.member?.full_name ?? record.member?.email ?? "Unknown"}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDate(record.borrowed_at)} → Due {formatDate(record.due_date)}
              {record.returned_at && ` · Returned ${formatDate(record.returned_at)}`}
            </p>
          </div>
          {onReturn && (
            <Button size="sm" variant="outline" onClick={onReturn}>
              <RotateCcw className="h-3.5 w-3.5" />
              Mark Returned
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AssignBorrowDialog({
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
  const [dueDays, setDueDays] = useState(14);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
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
          <DialogDescription>Select a book and member to create a borrow record.</DialogDescription>
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
                  <SelectItem key={b.id} value={b.id}>
                    {b.title} ({b.available_copies} left)
                  </SelectItem>
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
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Loan Duration (days)</label>
            <Input
              type="number"
              value={dueDays}
              onChange={(e) => setDueDays(parseInt(e.target.value) || 14)}
              min={1}
              max={60}
            />
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

function ReturnDialog({
  open,
  record,
  onClose,
  onSuccess,
}: {
  open: boolean;
  record: BorrowRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Return</DialogTitle>
          <DialogDescription>
            Mark <strong>"{record?.book?.title}"</strong> as returned by{" "}
            <strong>{record?.member?.full_name ?? "this member"}</strong>?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleReturn} disabled={isLoading}>
            {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Processing...</> : "Confirm Return"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
