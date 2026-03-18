import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useMemberBorrows } from "@/hooks/useBorrows";
import { Badge } from "@/components/atoms/Badge";
import { Card, CardContent } from "@/components/atoms/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/atoms/Tabs";
import { PageLoader } from "@/components/molecules/LoadingSpinner";
import { EmptyState } from "@/components/molecules/EmptyState";
import { BookOpen, BookMarked, RotateCcw, CalendarDays, Clock, CheckCircle2 } from "lucide-react";
import { formatDate, isOverdue } from "@/lib/utils";
import { differenceInDays, parseISO } from "date-fns";
import type { BorrowRecord } from "@/types";
import { cn } from "@/lib/utils";

function daysOverdue(d: string) {
  return Math.max(0, differenceInDays(new Date(), parseISO(d)));
}
function daysLeft(d: string) {
  return Math.max(0, differenceInDays(parseISO(d), new Date()));
}

export function MyBorrowsPage() {
  const { profile } = useAuth();
  const { records, isLoading } = useMemberBorrows(profile?.id);

  const active = records.filter((r) => r.status === "borrowed");
  const returned = records.filter((r) => r.status === "returned");

  if (isLoading) return <PageLoader text="Loading your borrows..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookMarked className="h-6 w-6 text-primary" />
          My Borrows
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          View your active loans and borrowing history.
        </p>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-11 p-1 bg-muted/60">
          <TabsTrigger value="active" className="gap-1.5 data-[state=active]:shadow-sm">
            <BookMarked className="h-4 w-4" />
            Active ({active.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 data-[state=active]:shadow-sm">
            <RotateCcw className="h-4 w-4" />
            History ({returned.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6 space-y-4">
          {active.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12">
                <EmptyState
                  icon={BookMarked}
                  title="No active borrows"
                  description="You haven't borrowed any books currently."
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {active.map((r) => (
                <ActiveBorrowCard key={r.id} record={r} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6 space-y-4">
          {returned.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12">
                <EmptyState
                  icon={RotateCcw}
                  title="No borrow history"
                  description="Returned books will appear here."
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {returned.map((r) => (
                <HistoryBorrowCard key={r.id} record={r} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Active borrow card ─────────────────────────────────────────────────────────

function ActiveBorrowCard({ record }: { record: BorrowRecord }) {
  const navigate = useNavigate();
  const overdue = isOverdue(record.due_date);
  const remaining = !overdue ? daysLeft(record.due_date) : 0;
  const days = overdue ? daysOverdue(record.due_date) : 0;

  return (
    <Card
      className={cn(
        "overflow-hidden transition-shadow hover:shadow-md",
        overdue && "border-red-200 bg-red-50/30"
      )}
    >
      <CardContent className="p-0">
        <div className="flex items-stretch gap-4 p-4">
          {/* Cover */}
          <div
            className="h-20 w-14 shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center cursor-pointer"
            onClick={() => record.book_id && navigate(`/books/${record.book_id}`)}
          >
            {record.book?.cover_url ? (
              <img
                src={record.book.cover_url}
                alt={record.book.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <BookOpen className="h-6 w-6 text-primary/40" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <p
                className="font-semibold text-base leading-tight cursor-pointer hover:text-primary transition-colors line-clamp-1"
                onClick={() => record.book_id && navigate(`/books/${record.book_id}`)}
              >
                {record.book?.title ?? "Unknown"}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">{record.book?.author}</p>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                Borrowed {formatDate(record.borrowed_at)}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Due {formatDate(record.due_date)}
              </span>
            </div>
          </div>

          {/* Status & badge */}
          <div className="flex flex-col items-end justify-between shrink-0">
            <Badge
              variant={overdue ? "destructive" : "info"}
              className="shadow-sm"
            >
              {overdue ? `${days}d overdue` : remaining === 0 ? "Due today" : `${remaining}d left`}
            </Badge>
            <span className="text-[10px] text-muted-foreground mt-1">Active</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── History (returned) borrow card ─────────────────────────────────────────────

function HistoryBorrowCard({ record }: { record: BorrowRecord }) {
  const navigate = useNavigate();
  const returnedOnTime =
    record.returned_at &&
    (!isOverdue(record.due_date) || new Date(record.returned_at) <= new Date(record.due_date));

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md border-muted/60">
      <CardContent className="p-0">
        <div className="flex items-stretch gap-4 p-4">
          {/* Cover */}
          <div
            className="h-20 w-14 shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center cursor-pointer opacity-90"
            onClick={() => record.book_id && navigate(`/books/${record.book_id}`)}
          >
            {record.book?.cover_url ? (
              <img
                src={record.book.cover_url}
                alt={record.book.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <BookOpen className="h-6 w-6 text-muted-foreground/50" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <p
                className="font-semibold text-base leading-tight cursor-pointer hover:text-primary transition-colors line-clamp-1"
                onClick={() => record.book_id && navigate(`/books/${record.book_id}`)}
              >
                {record.book?.title ?? "Unknown"}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">{record.book?.author}</p>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>Borrowed {formatDate(record.borrowed_at)}</span>
              <span>·</span>
              <span>Returned {formatDate(record.returned_at)}</span>
            </div>
          </div>

          {/* Status */}
          <div className="flex flex-col items-end justify-center shrink-0 gap-1">
            <Badge variant="success" className="shadow-sm">
              Returned
            </Badge>
            {returnedOnTime ? (
              <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                <CheckCircle2 className="h-3 w-3" />
                On time
              </span>
            ) : (
              <span className="text-[10px] text-amber-600">Returned late</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
