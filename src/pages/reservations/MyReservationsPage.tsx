import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useMemberReservations } from "@/hooks/useReservations";
import { Badge } from "@/components/atoms/Badge";
import { Card, CardContent } from "@/components/atoms/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/atoms/Tabs";
import { PageLoader } from "@/components/molecules/LoadingSpinner";
import { EmptyState } from "@/components/molecules/EmptyState";
import { BookOpen, BookMarked, Clock, CheckCircle2, XCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Reservation } from "@/types";
import { cn } from "@/lib/utils";

export function MyReservationsPage() {
  const { profile } = useAuth();
  const { reservations, isLoading } = useMemberReservations(profile?.id);

  const active = reservations.filter((r) => ["pending", "available"].includes(r.status));
  const history = reservations.filter((r) => ["fulfilled", "cancelled"].includes(r.status));
  const availableCount = reservations.filter((r) => r.status === "available").length;

  if (isLoading) return <PageLoader text="Loading your reservations..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookMarked className="h-6 w-6 text-primary" />
          My Reservations
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track your book reservations and pick up status.
        </p>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-11 p-1 bg-muted/60">
          <TabsTrigger value="active" className="gap-1.5 data-[state=active]:shadow-sm">
            <Clock className="h-4 w-4" />
            Active ({active.length})
            {availableCount > 0 && (
              <span className="ml-1 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                {availableCount} ready
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 data-[state=active]:shadow-sm">
            <CheckCircle2 className="h-4 w-4" />
            History ({history.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6 space-y-4">
          {active.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12">
                <EmptyState
                  icon={BookMarked}
                  title="No active reservations"
                  description="Your book reservations will appear here. Ask a librarian to reserve a book for you."
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {active.map((r) => (
                <ActiveReservationCard key={r.id} reservation={r} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6 space-y-4">
          {history.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12">
                <EmptyState
                  icon={CheckCircle2}
                  title="No reservation history"
                  description="Fulfilled or cancelled reservations will appear here."
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {history.map((r) => (
                <HistoryReservationCard key={r.id} reservation={r} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Active reservation card (pending / available) ─────────────────────────────

function ActiveReservationCard({ reservation }: { reservation: Reservation }) {
  const navigate = useNavigate();
  const isReady = reservation.status === "available";

  return (
    <Card
      className={cn(
        "overflow-hidden transition-shadow hover:shadow-md",
        isReady && "border-emerald-300 bg-emerald-50/50"
      )}
    >
      <CardContent className="p-0">
        <div className="flex items-stretch gap-4 p-4">
          {/* Cover */}
          <div
            className="h-20 w-14 shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center cursor-pointer"
            onClick={() => reservation.book_id && navigate(`/books/${reservation.book_id}`)}
          >
            {reservation.book?.cover_url ? (
              <img
                src={reservation.book.cover_url}
                alt={reservation.book.title}
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
                onClick={() => reservation.book_id && navigate(`/books/${reservation.book_id}`)}
              >
                {reservation.book?.title ?? "Unknown"}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">{reservation.book?.author}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Reserved on {formatDate(reservation.reserved_at)}
            </p>
            {isReady && (
              <p className="text-sm text-emerald-700 font-medium mt-1.5 flex items-center gap-1.5">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Ready to pick up! Visit the library to collect your book.
              </p>
            )}
          </div>

          {/* Status */}
          <div className="flex flex-col items-end justify-center shrink-0">
            <Badge
              variant={isReady ? "success" : "warning"}
              className="shadow-sm capitalize"
            >
              {isReady ? "Ready!" : "Pending"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── History reservation card (fulfilled / cancelled) ─────────────────────────

function HistoryReservationCard({ reservation }: { reservation: Reservation }) {
  const navigate = useNavigate();
  const isFulfilled = reservation.status === "fulfilled";

  return (
    <Card
      className={cn(
        "overflow-hidden transition-shadow hover:shadow-md border-muted/60",
        reservation.status === "cancelled" && "opacity-75"
      )}
    >
      <CardContent className="p-0">
        <div className="flex items-stretch gap-4 p-4">
          {/* Cover */}
          <div
            className={cn(
              "h-20 w-14 shrink-0 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer",
              reservation.status === "cancelled"
                ? "bg-muted/50"
                : "bg-gradient-to-br from-muted to-muted/50"
            )}
            onClick={() => reservation.book_id && navigate(`/books/${reservation.book_id}`)}
          >
            {reservation.book?.cover_url ? (
              <img
                src={reservation.book.cover_url}
                alt={reservation.book.title}
                className={cn(
                  "h-full w-full object-cover",
                  reservation.status === "cancelled" && "opacity-60"
                )}
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
                onClick={() => reservation.book_id && navigate(`/books/${reservation.book_id}`)}
              >
                {reservation.book?.title ?? "Unknown"}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">{reservation.book?.author}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Reserved on {formatDate(reservation.reserved_at)}
            </p>
          </div>

          {/* Status */}
          <div className="flex flex-col items-end justify-center shrink-0 gap-1">
            <Badge
              variant={isFulfilled ? "success" : "destructive"}
              className="shadow-sm capitalize"
            >
              {reservation.status}
            </Badge>
            {isFulfilled ? (
              <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                <CheckCircle2 className="h-3 w-3" />
                Picked up
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <XCircle className="h-3 w-3" />
                Cancelled
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
