import { useAuth } from "@/context/AuthContext";
import { useMemberReservations } from "@/hooks/useReservations";
import { Badge } from "@/components/atoms/Badge";
import { Card, CardContent } from "@/components/atoms/Card";
import { PageLoader } from "@/components/molecules/LoadingSpinner";
import { EmptyState } from "@/components/molecules/EmptyState";
import { BookMarked } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Reservation } from "@/types";

export function MyReservationsPage() {
  const { profile } = useAuth();
  const { reservations, isLoading } = useMemberReservations(profile?.id);

  if (isLoading) return <PageLoader text="Loading your reservations..." />;

  return (
    <div className="space-y-4">
      {reservations.length === 0 ? (
        <EmptyState
          icon={BookMarked}
          title="No reservations"
          description="Your book reservations will appear here. Ask a librarian to reserve a book for you."
        />
      ) : (
        reservations.map((r) => <ReservationCard key={r.id} reservation={r} />)
      )}
    </div>
  );
}

function ReservationCard({ reservation }: { reservation: Reservation }) {
  const statusVariant: Record<string, "info" | "success" | "warning" | "destructive" | "secondary"> = {
    pending: "warning",
    available: "success",
    fulfilled: "secondary",
    cancelled: "destructive",
  };

  return (
    <Card className={reservation.status === "available" ? "border-emerald-300 bg-emerald-50" : ""}>
      <CardContent className="py-4 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{reservation.book?.title ?? "Unknown"}</p>
            <p className="text-sm text-muted-foreground">{reservation.book?.author}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Reserved on {formatDate(reservation.reserved_at)}
            </p>
            {reservation.status === "available" && (
              <p className="text-sm text-emerald-700 font-medium mt-1">
                🎉 This book is now available! Visit the library to pick it up.
              </p>
            )}
          </div>
          <Badge variant={statusVariant[reservation.status] ?? "secondary"} className="shrink-0 capitalize">
            {reservation.status}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
