import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Mail, Phone, MapPin, Calendar, BookMarked, Clock, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { memberService } from "@/services/memberService";
import { borrowService } from "@/services/borrowService";
import { reservationService } from "@/services/reservationService";
import { Button } from "@/components/atoms/Button";
import { Badge } from "@/components/atoms/Badge";
import { Avatar, AvatarFallback } from "@/components/atoms/Avatar";
import { Card, CardContent } from "@/components/atoms/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/atoms/Tabs";
import { PageLoader } from "@/components/molecules/LoadingSpinner";
import { formatDate, getInitials, isOverdue, MEMBERSHIP_CONFIG } from "@/lib/utils";
import type { Profile, BorrowRecord, Reservation } from "@/types";

export function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [member, setMember] = useState<Profile | null>(null);
  const [borrows, setBorrows] = useState<BorrowRecord[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      memberService.getMemberById(id),
      borrowService.getMemberBorrowRecords(id),
      reservationService.getMemberReservations(id),
    ])
      .then(([m, b, r]) => {
        setMember(m);
        setBorrows(b);
        setReservations(r);
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <PageLoader text="Loading member..." />;
  if (!member) return <div className="py-10 text-center">Member not found</div>;

  const activeBorrows = borrows.filter((b) => b.status === "borrowed");
  const overdueCount = activeBorrows.filter((b) => isOverdue(b.due_date)).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate(`/members/${id}/edit`)}>
          <Pencil className="h-4 w-4" />
          Edit Profile
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <Avatar className="h-16 w-16 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {getInitials(member.full_name ?? member.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-xl font-bold">{member.full_name || "Unnamed User"}</h2>
                <Badge variant={member.role === "librarian" ? "default" : "secondary"}>
                  {member.role}
                </Badge>
                <Badge variant="outline">
                  {MEMBERSHIP_CONFIG[member.membership_type as keyof typeof MEMBERSHIP_CONFIG]?.label ?? member.membership_type}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-4">
                {member.email && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    {member.email}
                  </div>
                )}
                {member.phone && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    {member.phone}
                  </div>
                )}
                {member.address && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {member.address}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Joined {formatDate(member.created_at)}
                </div>
              </div>
            </div>
            <div className="flex gap-2 sm:flex-col">
              <Button size="sm" onClick={() => navigate(`/borrowing?memberId=${id}`)}>
                <BookMarked className="h-4 w-4" />
                Assign Borrow
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate(`/reservations?memberId=${id}`)}>
                <Clock className="h-4 w-4" />
                Reserve Book
              </Button>
            </div>
          </div>

          {overdueCount > 0 && (
            <div className="mt-4 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              ⚠️ {overdueCount} overdue book{overdueCount > 1 ? "s" : ""}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="borrows">
        <TabsList>
          <TabsTrigger value="borrows">
            Borrows ({borrows.length})
          </TabsTrigger>
          <TabsTrigger value="reservations">
            Reservations ({reservations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="borrows" className="mt-4">
          {borrows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No borrow records</p>
          ) : (
            <div className="space-y-3">
              {borrows.map((record) => (
                <BorrowRow key={record.id} record={record} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reservations" className="mt-4">
          {reservations.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No reservations</p>
          ) : (
            <div className="space-y-3">
              {reservations.map((res) => (
                <ReservationRow key={res.id} reservation={res} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BorrowRow({ record }: { record: BorrowRecord }) {
  const overdue = record.status === "borrowed" && isOverdue(record.due_date);
  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{record.book?.title ?? "Unknown"}</p>
            <p className="text-xs text-muted-foreground">
              Borrowed {formatDate(record.borrowed_at)} · Due {formatDate(record.due_date)}
            </p>
          </div>
          <Badge
            variant={
              record.status === "returned" ? "success" :
              overdue ? "destructive" : "info"
            }
            className="shrink-0"
          >
            {record.status === "returned" ? "Returned" : overdue ? "Overdue" : "Active"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function ReservationRow({ reservation }: { reservation: Reservation }) {
  const statusVariant: Record<string, "info" | "success" | "warning" | "destructive" | "secondary"> = {
    pending: "warning",
    available: "success",
    fulfilled: "secondary",
    cancelled: "destructive",
  };
  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{reservation.book?.title ?? "Unknown"}</p>
            <p className="text-xs text-muted-foreground">
              Reserved {formatDate(reservation.reserved_at)}
            </p>
          </div>
          <Badge variant={statusVariant[reservation.status] ?? "secondary"} className="shrink-0 capitalize">
            {reservation.status}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
