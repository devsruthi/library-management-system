import { useAuth } from "@/context/AuthContext";
import { useMemberBorrows } from "@/hooks/useBorrows";
import { Badge } from "@/components/atoms/Badge";
import { Card, CardContent } from "@/components/atoms/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/atoms/Tabs";
import { PageLoader } from "@/components/molecules/LoadingSpinner";
import { EmptyState } from "@/components/molecules/EmptyState";
import { BookMarked, RotateCcw } from "lucide-react";
import { formatDate, isOverdue } from "@/lib/utils";
import type { BorrowRecord } from "@/types";

export function MyBorrowsPage() {
  const { profile } = useAuth();
  const { records, isLoading } = useMemberBorrows(profile?.id);

  const active = records.filter((r) => r.status === "borrowed");
  const returned = records.filter((r) => r.status === "returned");

  if (isLoading) return <PageLoader text="Loading your borrows..." />;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="history">History ({returned.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {active.length === 0 ? (
            <EmptyState
              icon={BookMarked}
              title="No active borrows"
              description="You haven't borrowed any books currently."
            />
          ) : (
            <div className="space-y-3">
              {active.map((r) => <BorrowCard key={r.id} record={r} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {returned.length === 0 ? (
            <EmptyState icon={RotateCcw} title="No borrow history" description="Returned books will appear here." />
          ) : (
            <div className="space-y-3">
              {returned.map((r) => <BorrowCard key={r.id} record={r} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BorrowCard({ record }: { record: BorrowRecord }) {
  const overdue = record.status === "borrowed" && isOverdue(record.due_date);

  return (
    <Card className={overdue ? "border-destructive/40 bg-destructive/5" : ""}>
      <CardContent className="py-4 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{record.book?.title ?? "Unknown"}</p>
            <p className="text-sm text-muted-foreground">{record.book?.author}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Borrowed: {formatDate(record.borrowed_at)}
              {" · "}
              Due: {formatDate(record.due_date)}
            </p>
            {record.returned_at && (
              <p className="text-xs text-muted-foreground">Returned: {formatDate(record.returned_at)}</p>
            )}
          </div>
          <Badge
            variant={
              record.status === "returned"
                ? "success"
                : overdue
                ? "destructive"
                : "info"
            }
            className="shrink-0"
          >
            {record.status === "returned" ? "Returned" : overdue ? "Overdue!" : "Active"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
