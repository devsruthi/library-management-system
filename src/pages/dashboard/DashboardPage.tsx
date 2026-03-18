import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen, Users, BookMarked, Clock, AlertCircle, TrendingUp,
  RotateCcw, IndianRupee, CalendarDays, ChevronRight, Trophy,
  BookPlus, Bookmark,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/Card";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { Skeleton } from "@/components/atoms/Skeleton";
import { supabase } from "@/lib/supabase";
import { formatDate, isOverdue, MEMBERSHIP_CONFIG } from "@/lib/utils";
import { differenceInDays, parseISO, format } from "date-fns";
import type { MembershipType } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActiveBorrow {
  id: string;
  book_id: string;
  due_date: string;
  borrowed_at: string;
  returned_at: string | null;
  status: string;
  book: { title: string; author: string; cover_url: string | null } | null;
  member: { full_name: string | null; email: string | null; membership_type: string } | null;
}

interface TopBook {
  book_id: string;
  title: string;
  author: string;
  cover_url: string | null;
  count: number;
}

interface MemberActiveBorrow {
  id: string;
  book_id: string;
  due_date: string;
  borrowed_at: string;
  book: { title: string; author: string; cover_url: string | null } | null;
}

interface MemberReservation {
  id: string;
  status: string;
  reserved_at: string;
  book: { title: string; author: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysOverdue(d: string) {
  return Math.max(0, differenceInDays(new Date(), parseISO(d)));
}
function daysLeft(d: string) {
  return Math.max(0, differenceInDays(parseISO(d), new Date()));
}
function calcFine(dueDate: string, membershipType: string): number {
  const days = daysOverdue(dueDate);
  const cfg = MEMBERSHIP_CONFIG[membershipType as MembershipType];
  return days * (cfg?.finePerDay ?? 20);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { profile, isLibrarian } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  // Librarian state
  const [totalBooks, setTotalBooks] = useState(0);
  const [availableBooks, setAvailableBooks] = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);
  const [activeBorrows, setActiveBorrows] = useState<ActiveBorrow[]>([]);
  const [recentReturns, setRecentReturns] = useState<ActiveBorrow[]>([]);
  const [pendingReservations, setPendingReservations] = useState(0);
  const [topBooks, setTopBooks] = useState<TopBook[]>([]);

  // Member state
  const [memberBorrows, setMemberBorrows] = useState<MemberActiveBorrow[]>([]);
  const [memberReservations, setMemberReservations] = useState<MemberReservation[]>([]);

  useEffect(() => {
    if (isLibrarian) fetchLibrarianData();
    else if (profile) fetchMemberData();
  }, [isLibrarian, profile]);

  const fetchLibrarianData = async () => {
    setIsLoading(true);
    try {
      const [booksRes, profilesRes, allBorrowsRes, reservationsRes] = await Promise.all([
        supabase.from("books").select("id, is_available", { count: "exact" }),
        supabase.from("profiles").select("id", { count: "exact" }).eq("role", "member"),
        supabase.from("borrow_records").select(
          `id, book_id, status, due_date, borrowed_at, returned_at,
           book:books(title, author, cover_url),
           member:profiles(full_name, email, membership_type)`
        ).order("borrowed_at", { ascending: false }).limit(100),
        supabase.from("reservations").select("id", { count: "exact" }).eq("status", "pending"),
      ]);

      const books = (booksRes.data ?? []) as Array<{ id: string; is_available: boolean }>;
      setTotalBooks(booksRes.count ?? 0);
      setAvailableBooks(books.filter((b) => b.is_available).length);
      setTotalMembers(profilesRes.count ?? 0);
      setPendingReservations(reservationsRes.count ?? 0);

      const allBorrows = (allBorrowsRes.data ?? []) as unknown as ActiveBorrow[];
      const active = allBorrows.filter((r) => r.status === "borrowed");
      const returned = allBorrows.filter((r) => r.status === "returned").slice(0, 5);
      setActiveBorrows(active);
      setRecentReturns(returned);

      // Top 5 most borrowed books
      const countMap = new Map<string, { count: number; book: ActiveBorrow["book"]; book_id: string }>();
      for (const r of allBorrows) {
        if (!r.book_id) continue;
        const prev = countMap.get(r.book_id);
        if (prev) prev.count++;
        else countMap.set(r.book_id, { count: 1, book: r.book, book_id: r.book_id });
      }
      const top = Array.from(countMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map((e) => ({
          book_id: e.book_id,
          title: e.book?.title ?? "Unknown",
          author: e.book?.author ?? "",
          cover_url: e.book?.cover_url ?? null,
          count: e.count,
        }));
      setTopBooks(top);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMemberData = async () => {
    if (!profile) return;
    setIsLoading(true);
    try {
      const [borrowsRes, reservationsRes] = await Promise.all([
        supabase.from("borrow_records")
          .select("id, book_id, due_date, borrowed_at, book:books(title, author, cover_url)")
          .eq("member_id", profile.id).eq("status", "borrowed")
          .order("due_date", { ascending: true }),
        supabase.from("reservations")
          .select("id, status, reserved_at, book:books(title, author)")
          .eq("member_id", profile.id)
          .in("status", ["pending", "available"])
          .order("reserved_at", { ascending: false }),
      ]);
      setMemberBorrows((borrowsRes.data ?? []) as unknown as MemberActiveBorrow[]);
      setMemberReservations((reservationsRes.data ?? []) as unknown as MemberReservation[]);
    } finally {
      setIsLoading(false);
    }
  };

  const overdueRecords = activeBorrows.filter((r) => isOverdue(r.due_date));
  const totalFine = overdueRecords.reduce(
    (sum, r) => sum + calcFine(r.due_date, r.member?.membership_type ?? "standard"), 0
  );
  const memberOverdue = memberBorrows.filter((r) => isOverdue(r.due_date));

  return (
    <div className="space-y-6">
      {/* ── Welcome banner ── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            Good {getGreeting()}, {profile?.full_name?.split(" ")[0] ?? "there"} 👋
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {format(new Date(), "EEEE, MMMM d, yyyy")} ·{" "}
            {isLibrarian ? "Librarian Dashboard" : "Member Portal"}
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          LIBRARIAN VIEW
      ══════════════════════════════════════════════════ */}
      {isLibrarian && (
        <>
          {/* ── Stat cards ── */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <MiniStat label="Total Books" value={totalBooks} icon={BookOpen} color="text-indigo-600" bg="bg-indigo-50" />
              <MiniStat label="Available" value={availableBooks} icon={TrendingUp} color="text-emerald-600" bg="bg-emerald-50" />
              <MiniStat label="Checked Out" value={activeBorrows.length} icon={BookMarked} color="text-blue-600" bg="bg-blue-50" />
              <MiniStat label="Overdue" value={overdueRecords.length} icon={AlertCircle} color="text-red-600" bg="bg-red-50" />
              <MiniStat label="Members" value={totalMembers} icon={Users} color="text-purple-600" bg="bg-purple-50" />
              <MiniStat label="Waitlisted" value={pendingReservations} icon={Clock} color="text-amber-600" bg="bg-amber-50" />
            </div>
          )}

          {/* ── Fine alert ── */}
          {!isLoading && totalFine > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
              <IndianRupee className="h-5 w-5 text-orange-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-orange-800">
                  ₹{totalFine} total outstanding fine across {overdueRecords.length} overdue book{overdueRecords.length > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-orange-600 mt-0.5">Standard: ₹20/day · Public: ₹50/day</p>
              </div>
              <Button size="sm" variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100"
                onClick={() => navigate("/borrowing")}>
                View All
              </Button>
            </div>
          )}

          {/* ── Main content grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* Left col (3/5): Overdue + Recent Returns */}
            <div className="lg:col-span-3 space-y-6">

              {/* Overdue records */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      Overdue Books
                      {overdueRecords.length > 0 && (
                        <Badge variant="destructive" className="ml-1">{overdueRecords.length}</Badge>
                      )}
                    </CardTitle>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate("/borrowing")}>
                      View all <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {isLoading ? (
                    <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
                  ) : overdueRecords.length === 0 ? (
                    <div className="flex flex-col items-center py-6 text-center">
                      <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center mb-2">
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                      </div>
                      <p className="text-sm font-medium text-emerald-700">No overdue books!</p>
                      <p className="text-xs text-muted-foreground mt-0.5">All loans are within due date.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {overdueRecords.slice(0, 5).map((r) => {
                        const membership = r.member?.membership_type ?? "standard";
                        const fine = calcFine(r.due_date, membership);
                        const days = daysOverdue(r.due_date);
                        return (
                          <div key={r.id} className="flex items-center gap-3 rounded-lg bg-red-50/60 border border-red-100 px-3 py-2.5">
                            <div className="h-9 w-9 rounded-full overflow-hidden bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center shrink-0">
                              {r.book?.cover_url
                                ? <img src={r.book.cover_url} alt={r.book.title} className="h-full w-full object-cover" />
                                : <BookOpen className="h-4 w-4 text-red-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{r.book?.title ?? "Unknown"}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {r.member?.full_name ?? r.member?.email ?? "Unknown"}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-semibold text-destructive">{days}d overdue</p>
                              <p className="text-xs text-destructive flex items-center justify-end gap-0.5">
                                <IndianRupee className="h-2.5 w-2.5" />{fine}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent returns */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <RotateCcw className="h-4 w-4 text-emerald-600" />
                      Recent Returns
                    </CardTitle>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate("/borrowing")}>
                      View all <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {isLoading ? (
                    <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
                  ) : recentReturns.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No returns yet</p>
                  ) : (
                    <div className="divide-y">
                      {recentReturns.map((r) => (
                        <div key={r.id} className="flex items-center gap-3 py-2.5">
                          <div className="h-8 w-8 rounded-full overflow-hidden bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center shrink-0">
                            {r.book?.cover_url
                              ? <img src={r.book.cover_url} alt={r.book.title} className="h-full w-full object-cover" />
                              : <BookOpen className="h-3.5 w-3.5 text-emerald-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{r.book?.title ?? "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">
                              {r.member?.full_name ?? r.member?.email} · returned {formatDate(r.returned_at)}
                            </p>
                          </div>
                          <Badge variant="success" className="shrink-0">Returned</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right col (2/5): Top picks + Quick actions */}
            <div className="lg:col-span-2 space-y-6">

              {/* Top picks */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    Top Picks
                    <span className="text-xs font-normal text-muted-foreground ml-1">Most borrowed</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {isLoading ? (
                    <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
                  ) : topBooks.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No borrow history yet</p>
                  ) : (
                    <div className="space-y-2">
                      {topBooks.map((book, i) => (
                        <div key={book.book_id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/40 transition-colors cursor-pointer"
                          onClick={() => navigate(`/books/${book.book_id}`)}>
                          <span className={`text-xs font-bold w-5 text-center shrink-0 ${
                            i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-orange-400" : "text-muted-foreground"
                          }`}>
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                          </span>
                          <div className="h-9 w-9 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                            {book.cover_url
                              ? <img src={book.cover_url} alt={book.title} className="h-full w-full object-cover" />
                              : <BookOpen className="h-4 w-4 text-primary/40" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{book.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                          </div>
                          <span className="text-xs font-semibold text-muted-foreground shrink-0 bg-muted rounded-full px-2 py-0.5">
                            {book.count}×
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick actions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {[
                      { icon: BookPlus, label: "Add New Book", to: "/books/new", color: "text-indigo-600 bg-indigo-50" },
                      { icon: Users, label: "View Members", to: "/members", color: "text-purple-600 bg-purple-50" },
                      { icon: BookMarked, label: "Borrow & Return", to: "/borrowing", color: "text-blue-600 bg-blue-50" },
                      { icon: Clock, label: "Manage Waitlists", to: "/reservations", color: "text-amber-600 bg-amber-50" },
                    ].map(({ icon: Icon, label, to, color }) => (
                      <button key={to} onClick={() => navigate(to)}
                        className="w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium hover:bg-muted/40 transition-colors text-left group">
                        <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="group-hover:text-primary transition-colors">{label}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════
          MEMBER VIEW
      ══════════════════════════════════════════════════ */}
      {!isLibrarian && (
        <>
          {/* Stat cards */}
          {isLoading ? (
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <MiniStat label="Borrowed" value={memberBorrows.length} icon={BookMarked} color="text-blue-600" bg="bg-blue-50" />
              <MiniStat label="Overdue" value={memberOverdue.length} icon={AlertCircle} color="text-red-600" bg="bg-red-50" />
              <MiniStat label="Reservations" value={memberReservations.length} icon={Bookmark} color="text-amber-600" bg="bg-amber-50" />
            </div>
          )}

          {/* Overdue alert */}
          {!isLoading && memberOverdue.length > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm font-medium text-destructive flex-1">
                You have {memberOverdue.length} overdue book{memberOverdue.length > 1 ? "s" : ""}. Please return them to avoid fines.
              </p>
              <Button size="sm" variant="destructive" onClick={() => navigate("/my-borrows")}>View</Button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Active borrows */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookMarked className="h-4 w-4 text-blue-600" />
                      My Active Borrows
                    </CardTitle>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate("/my-borrows")}>
                      View all <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {isLoading ? (
                    <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
                  ) : memberBorrows.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-center">
                      <BookOpen className="h-8 w-8 text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">No books currently borrowed</p>
                      <Button size="sm" className="mt-3" onClick={() => navigate("/books")}>Browse Books</Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {memberBorrows.map((r) => {
                        const overdue = isOverdue(r.due_date);
                        const remaining = !overdue ? daysLeft(r.due_date) : 0;
                        return (
                          <div key={r.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${overdue ? "border-red-200 bg-red-50/50" : "bg-muted/20"}`}>
                            <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                              {r.book?.cover_url
                                ? <img src={r.book.cover_url} alt={r.book.title} className="h-full w-full object-cover" />
                                : <BookOpen className="h-4 w-4 text-primary/40" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{r.book?.title}</p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                <CalendarDays className="h-3 w-3" />
                                Due {formatDate(r.due_date)}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              {overdue ? (
                                <Badge variant="destructive">{daysOverdue(r.due_date)}d late</Badge>
                              ) : (
                                <Badge variant={remaining <= 2 ? "warning" : "info"}>
                                  {remaining === 0 ? "Due today" : `${remaining}d left`}
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Reservations + Quick actions */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-600" />
                      My Reservations
                    </CardTitle>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate("/my-reservations")}>
                      View all <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {isLoading ? (
                    <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
                  ) : memberReservations.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No active reservations</p>
                  ) : (
                    <div className="space-y-2">
                      {memberReservations.map((r) => (
                        <div key={r.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{r.book?.title}</p>
                            <p className="text-xs text-muted-foreground">{r.book?.author}</p>
                          </div>
                          <Badge variant={r.status === "available" ? "success" : "warning"} className="shrink-0 capitalize">
                            {r.status === "available" ? "Ready!" : "Pending"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {[
                      { icon: BookOpen, label: "Browse Books", to: "/books", color: "text-indigo-600 bg-indigo-50" },
                      { icon: BookMarked, label: "My Borrows", to: "/my-borrows", color: "text-blue-600 bg-blue-50" },
                      { icon: Clock, label: "My Reservations", to: "/my-reservations", color: "text-amber-600 bg-amber-50" },
                    ].map(({ icon: Icon, label, to, color }) => (
                      <button key={to} onClick={() => navigate(to)}
                        className="w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium hover:bg-muted/40 transition-colors text-left group">
                        <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="group-hover:text-primary transition-colors">{label}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── MiniStat ─────────────────────────────────────────────────────────────────

function MiniStat({
  label, value, icon: Icon, color, bg,
}: {
  label: string; value: number; icon: React.ElementType; color: string; bg: string;
}) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3 flex items-center gap-3">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
