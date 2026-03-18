import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen, Users, BookMarked, Clock, AlertCircle, TrendingUp,
  IndianRupee, CalendarDays, ChevronRight, Trophy, Bookmark,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/Card";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { Skeleton } from "@/components/atoms/Skeleton";
import { supabase } from "@/lib/supabase";
import { formatDate, isOverdue, MEMBERSHIP_CONFIG } from "@/lib/utils";
import {
  differenceInDays, parseISO, format, subDays, startOfDay, eachDayOfInterval,
  startOfWeek, eachWeekOfInterval, subWeeks,
} from "date-fns";
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

interface ChartDay { label: string; count: number }
interface GenreSlice { name: string; value: number }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysOverdue(d: string) {
  const today = startOfDay(new Date());
  const due = startOfDay(parseISO(d));
  return Math.max(0, differenceInDays(today, due));
}
function daysLeft(d: string) {
  const today = startOfDay(new Date());
  const due = startOfDay(parseISO(d));
  return Math.max(0, differenceInDays(due, today));
}
function calcFine(dueDate: string, membershipType: string): number {
  const days = daysOverdue(dueDate);
  const cfg = MEMBERSHIP_CONFIG[membershipType as MembershipType];
  return days * (cfg?.finePerDay ?? 20);
}

// Build last-N-days borrow trend from borrow records
function buildBorrowTrend(borrows: ActiveBorrow[], days = 14): ChartDay[] {
  const today = startOfDay(new Date());
  const interval = eachDayOfInterval({ start: subDays(today, days - 1), end: today });
  return interval.map((d) => ({
    label: format(d, "dd MMM"),
    count: borrows.filter((b) => b.borrowed_at && startOfDay(parseISO(b.borrowed_at)).getTime() === d.getTime()).length,
  }));
}

// Build last-8-weeks member registration chart
function buildRegistrationTrend(dates: string[], weeksBack = 7): ChartDay[] {
  const today = new Date();
  const weeks = eachWeekOfInterval({ start: subWeeks(startOfWeek(today), weeksBack), end: today });
  return weeks.map((w, i) => {
    const nextWeek = weeks[i + 1] ?? new Date(w.getTime() + 7 * 86400000);
    return {
      label: format(w, "dd MMM"),
      count: dates.filter((d) => {
        const t = parseISO(d);
        return t >= w && t < nextWeek;
      }).length,
    };
  });
}

// Recharts ValueType can be undefined; this helper formats safely
function fmtBorrows(v: unknown) { const n = Number(v ?? 0); return [`${n} borrow${n !== 1 ? "s" : ""}`, ""] as [string, string]; }
function fmtMembers(v: unknown) { const n = Number(v ?? 0); return [`${n} new member${n !== 1 ? "s" : ""}`, ""] as [string, string]; }
function fmtBooks(v: unknown)   { const n = Number(v ?? 0); return [`${n} book${n !== 1 ? "s" : ""}`, ""] as [string, string]; }
function fmtGenre(v: unknown, _n: unknown, props: { payload?: { name?: string } }) {
  const n = Number(v ?? 0);
  return [`${n} book${n !== 1 ? "s" : ""}`, props?.payload?.name ?? ""] as [string, string];
}

// ─── Chart colours ────────────────────────────────────────────────────────────

const GENRE_COLORS = [
  "#6366f1", "#22c55e", "#f59e0b", "#ef4444",
  "#3b82f6", "#a855f7", "#14b8a6", "#f97316",
];

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
  const [pendingReservations, setPendingReservations] = useState(0);
  const [topBooks, setTopBooks] = useState<TopBook[]>([]);
  const [borrowTrend, setBorrowTrend] = useState<ChartDay[]>([]);
  const [registrationTrend, setRegistrationTrend] = useState<ChartDay[]>([]);
  const [genreData, setGenreData] = useState<GenreSlice[]>([]);

  // Member state
  const [memberBorrows, setMemberBorrows] = useState<MemberActiveBorrow[]>([]);
  const [memberReservations, setMemberReservations] = useState<MemberReservation[]>([]);
  const [memberBorrowHistory, setMemberBorrowHistory] = useState<ChartDay[]>([]);

  useEffect(() => {
    if (isLibrarian) fetchLibrarianData();
    else if (profile) fetchMemberData();
  }, [isLibrarian, profile]);

  const fetchLibrarianData = async () => {
    setIsLoading(true);
    try {
      const [booksRes, profilesRes, allBorrowsRes, reservationsRes, genreRes, memberDatesRes] =
        await Promise.all([
          supabase.from("books").select("id, is_available", { count: "exact" }),
          supabase.from("profiles").select("id", { count: "exact" }).eq("role", "member"),
          supabase.from("borrow_records").select(
            `id, book_id, status, due_date, borrowed_at, returned_at,
             book:books(title, author, cover_url),
             member:profiles(full_name, email, membership_type)`
          ).order("borrowed_at", { ascending: false }).limit(200),
          supabase.from("reservations").select("id", { count: "exact" }).eq("status", "pending"),
          supabase.from("books").select("genre:genres(name)"),
          supabase.from("profiles").select("created_at").eq("role", "member"),
        ]);

      const books = (booksRes.data ?? []) as Array<{ id: string; is_available: boolean }>;
      setTotalBooks(booksRes.count ?? 0);
      setAvailableBooks(books.filter((b) => b.is_available).length);
      setTotalMembers(profilesRes.count ?? 0);
      setPendingReservations(reservationsRes.count ?? 0);

      const allBorrows = (allBorrowsRes.data ?? []) as unknown as ActiveBorrow[];
      setActiveBorrows(allBorrows.filter((r) => r.status === "borrowed"));
      setBorrowTrend(buildBorrowTrend(allBorrows, 14));

      // Top books
      const countMap = new Map<string, { count: number; book: ActiveBorrow["book"]; book_id: string }>();
      for (const r of allBorrows) {
        if (!r.book_id) continue;
        const prev = countMap.get(r.book_id);
        if (prev) prev.count++;
        else countMap.set(r.book_id, { count: 1, book: r.book, book_id: r.book_id });
      }
      setTopBooks(
        Array.from(countMap.values()).sort((a, b) => b.count - a.count).slice(0, 5).map((e) => ({
          book_id: e.book_id,
          title: e.book?.title ?? "Unknown",
          author: e.book?.author ?? "",
          cover_url: e.book?.cover_url ?? null,
          count: e.count,
        }))
      );

      // Genre distribution
      const genreCountMap = new Map<string, number>();
      for (const b of (genreRes.data ?? []) as unknown as Array<{ genre: { name: string } | null }>) {
        const name = b.genre?.name ?? "Unknown";
        genreCountMap.set(name, (genreCountMap.get(name) ?? 0) + 1);
      }
      setGenreData(
        Array.from(genreCountMap.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([name, value]) => ({ name, value }))
      );

      // Member registration trend
      const dates = (memberDatesRes.data ?? []).map((p: { created_at: string }) => p.created_at);
      setRegistrationTrend(buildRegistrationTrend(dates, 4));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMemberData = async () => {
    if (!profile) return;
    setIsLoading(true);
    try {
      const [borrowsRes, reservationsRes, historyRes] = await Promise.all([
        supabase.from("borrow_records")
          .select("id, book_id, due_date, borrowed_at, book:books(title, author, cover_url)")
          .eq("member_id", profile.id).eq("status", "borrowed")
          .order("due_date", { ascending: true }),
        supabase.from("reservations")
          .select("id, status, reserved_at, book:books(title, author)")
          .eq("member_id", profile.id)
          .in("status", ["pending", "available"])
          .order("reserved_at", { ascending: false }),
        supabase.from("borrow_records")
          .select("id, borrowed_at")
          .eq("member_id", profile.id)
          .order("borrowed_at", { ascending: false })
          .limit(60),
      ]);
      setMemberBorrows((borrowsRes.data ?? []) as unknown as MemberActiveBorrow[]);
      setMemberReservations((reservationsRes.data ?? []) as unknown as MemberReservation[]);

      // Build last-8-weeks personal activity
      const hist = (historyRes.data ?? []) as Array<{ id: string; borrowed_at: string }>;
      const activityDates = hist.map((r) => r.borrowed_at);
      setMemberBorrowHistory(buildRegistrationTrend(activityDates, 4));
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
      {/* ── Welcome ── */}
      <div>
        <h2 className="text-2xl font-bold">
          Good {getGreeting()}, {profile?.full_name?.split(" ")[0] ?? "there"} 👋
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          {format(new Date(), "EEEE, MMMM d, yyyy")} ·{" "}
          {isLibrarian ? "Librarian Dashboard" : "Member Portal"}
        </p>
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
              <MiniStat label="Borrowed" value={activeBorrows.length} icon={BookMarked} color="text-blue-600" bg="bg-blue-50" />
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

          {/* ── Borrow activity + Genre pie ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Borrow trend – last 14 days */}
            <Card className="lg:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookMarked className="h-4 w-4 text-blue-600" />
                  Borrow Activity
                  <span className="text-xs font-normal text-muted-foreground ml-1">Last 14 days</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoading ? (
                  <Skeleton className="h-44 rounded-lg" />
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={borrowTrend} barSize={14} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                        interval={1} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                        formatter={fmtBorrows}
                        labelFormatter={(l) => l}
                      />
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Genre distribution */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-indigo-600" />
                  Genre Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 flex items-center justify-center">
                {isLoading ? (
                  <Skeleton className="h-44 w-full rounded-lg" />
                ) : genreData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-10 text-center">No genre data yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={genreData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={72}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {genreData.map((_, i) => (
                          <Cell key={i} fill={GENRE_COLORS[i % GENRE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                        formatter={fmtGenre as never}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
                        formatter={(value: string) => value.length > 12 ? value.slice(0, 12) + "…" : value}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Member registrations chart ── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                Member Registrations
                <span className="text-xs font-normal text-muted-foreground ml-1">Last 5 weeks</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <Skeleton className="h-40 rounded-lg" />
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={registrationTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                      formatter={fmtMembers}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#a855f7"
                      strokeWidth={2}
                      fill="url(#regGrad)"
                      dot={{ r: 3, fill: "#a855f7" }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* ── Overdue + Recent Returns | Top Picks ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-6">

              {/* Overdue */}
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
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center shrink-0 p-[3px]">
                              {r.book?.cover_url
                                ? <img src={r.book.cover_url} alt={r.book.title} className="h-full w-full object-cover rounded-full" />
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

            </div>

            {/* Top Picks */}
            <div className="lg:col-span-2">
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
                    <div className="space-y-1">
                      {topBooks.map((book, i) => (
                        <div key={book.book_id}
                          className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/40 transition-colors cursor-pointer"
                          onClick={() => navigate(`/books/${book.book_id}`)}>
                          <span className="text-sm w-6 text-center shrink-0">
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                          </span>
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 p-[3px]">
                            {book.cover_url
                              ? <img src={book.cover_url} alt={book.title} className="h-full w-full object-cover rounded-full" />
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

          {/* My reading activity chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                My Reading Activity
                <span className="text-xs font-normal text-muted-foreground ml-1">Books borrowed per week (last 5 weeks)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <Skeleton className="h-40 rounded-lg" />
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={memberBorrowHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="memberGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                      formatter={fmtBooks}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#memberGrad)"
                      dot={{ r: 3, fill: "#3b82f6" }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

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
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {memberBorrows.map((r) => {
                        const overdue = isOverdue(r.due_date);
                        const remaining = !overdue ? daysLeft(r.due_date) : 0;
                        return (
                          <div key={r.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${overdue ? "border-red-200 bg-red-50/50" : "bg-muted/20"}`}>
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 p-[3px]">
                              {r.book?.cover_url
                                ? <img src={r.book.cover_url} alt={r.book.title} className="h-full w-full object-cover rounded-full" />
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

            {/* Reservations */}
            <div className="lg:col-span-2">
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
