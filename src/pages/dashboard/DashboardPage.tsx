import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Users, BookMarked, Clock, AlertCircle, TrendingUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { StatCard } from "@/components/molecules/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/Card";
import { Button } from "@/components/atoms/Button";
import { Skeleton } from "@/components/atoms/Skeleton";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

interface DashboardStats {
  totalBooks: number;
  availableBooks: number;
  totalMembers: number;
  activeBorrows: number;
  overdueCount: number;
  pendingReservations: number;
}

interface RecentActivity {
  id: string;
  type: "borrow" | "return" | "reservation";
  description: string;
  date: string;
}

export function DashboardPage() {
  const { profile, isLibrarian } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isLibrarian) {
      fetchLibrarianStats();
    } else {
      fetchMemberStats();
    }
  }, [isLibrarian, profile]);

  const fetchLibrarianStats = async () => {
    setIsLoading(true);
    try {
      const [booksRes, profilesRes, borrowsRes, reservationsRes] = await Promise.all([
        supabase.from("books").select("id, available_copies", { count: "exact" }),
        supabase.from("profiles").select("id", { count: "exact" }),
        supabase.from("borrow_records").select("id, status, due_date, book:books(title), member:profiles(full_name)").eq("status", "borrowed"),
        supabase.from("reservations").select("id").eq("status", "pending"),
      ]);

      const books = (booksRes.data ?? []) as Array<{ id: string; available_copies: number }>;
      const totalBooks = booksRes.count ?? 0;
      const availableBooks = books.filter((b) => (b.available_copies ?? 0) > 0).length;
      const now = new Date();
      const borrowData = (borrowsRes.data ?? []) as Array<{
        id: string; due_date: string;
        member: { full_name?: string } | null;
        book: { title?: string } | null;
      }>;
      const overdueCount = borrowData.filter((r) => r.due_date && new Date(r.due_date) < now).length;

      setStats({
        totalBooks,
        availableBooks,
        totalMembers: profilesRes.count ?? 0,
        activeBorrows: borrowData.length,
        overdueCount,
        pendingReservations: reservationsRes.count ?? 0,
      });

      const activity: RecentActivity[] = borrowData.slice(0, 5).map((r) => ({
        id: r.id,
        type: "borrow" as const,
        description: `${r.member?.full_name ?? "A member"} borrowed "${r.book?.title ?? "a book"}"`,
        date: r.due_date ?? "",
      }));
      setRecentActivity(activity);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMemberStats = async () => {
    if (!profile) return;
    setIsLoading(true);
    try {
      const [borrowsRes, reservationsRes] = await Promise.all([
        supabase
          .from("borrow_records")
          .select("id, status, due_date, book:books(title)")
          .eq("member_id", profile.id)
          .eq("status", "borrowed"),
        supabase
          .from("reservations")
          .select("id, status, book:books(title), reserved_at")
          .eq("member_id", profile.id)
          .in("status", ["pending", "available"]),
      ]);

      type BorrowItem = { id: string; due_date: string; book: { title?: string } | null };
      type ResItem = { id: string; reserved_at: string; book: { title?: string } | null };

      const borrowData = (borrowsRes.data ?? []) as BorrowItem[];
      const resData = (reservationsRes.data ?? []) as ResItem[];
      const now = new Date();
      const overdueCount = borrowData.filter(
        (r) => r.due_date && new Date(r.due_date) < now
      ).length;

      setStats({
        totalBooks: 0,
        availableBooks: 0,
        totalMembers: 0,
        activeBorrows: borrowData.length,
        overdueCount,
        pendingReservations: resData.length,
      });

      const activity: RecentActivity[] = [
        ...borrowData.slice(0, 3).map((r) => ({
          id: r.id,
          type: "borrow" as const,
          description: `Currently borrowing "${r.book?.title ?? "a book"}"`,
          date: r.due_date ?? "",
        })),
        ...resData.slice(0, 2).map((r) => ({
          id: r.id,
          type: "reservation" as const,
          description: `Reserved "${r.book?.title ?? "a book"}"`,
          date: r.reserved_at ?? "",
        })),
      ];
      setRecentActivity(activity);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold">
          Good {getGreeting()}, {profile?.full_name?.split(" ")[0] ?? "there"} 👋
        </h2>
        <p className="text-muted-foreground mt-1">
          {isLibrarian
            ? "Here's what's happening in your library today."
            : "Here's an overview of your library activity."}
        </p>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: isLibrarian ? 4 : 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {isLibrarian ? (
            <>
              <StatCard title="Total Books" value={stats?.totalBooks ?? 0} icon={BookOpen} description="In catalogue" />
              <StatCard title="Available Now" value={stats?.availableBooks ?? 0} icon={TrendingUp} description="Ready to borrow" iconClassName="bg-emerald-100" />
              <StatCard title="Active Borrows" value={stats?.activeBorrows ?? 0} icon={BookMarked} description="Currently checked out" iconClassName="bg-blue-100" />
              <StatCard title="Members" value={stats?.totalMembers ?? 0} icon={Users} description="Registered members" iconClassName="bg-purple-100" />
            </>
          ) : (
            <>
              <StatCard title="Books Borrowed" value={stats?.activeBorrows ?? 0} icon={BookMarked} description="Currently with you" iconClassName="bg-blue-100" />
              <StatCard title="Overdue" value={stats?.overdueCount ?? 0} icon={AlertCircle} description="Needs return" iconClassName="bg-red-100" />
              <StatCard title="Reservations" value={stats?.pendingReservations ?? 0} icon={Clock} description="In waitlist" iconClassName="bg-amber-100" />
            </>
          )}
        </div>
      )}

      {/* Overdue alert */}
      {!isLoading && (stats?.overdueCount ?? 0) > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">
              {isLibrarian
                ? `${stats?.overdueCount} overdue book${stats!.overdueCount > 1 ? "s" : ""} need attention`
                : `You have ${stats?.overdueCount} overdue book${stats!.overdueCount > 1 ? "s" : ""}. Please return them soon.`}
            </p>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => navigate(isLibrarian ? "/borrowing" : "/my-borrows")}
          >
            View
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded-lg" />
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${
                      item.type === "borrow" ? "bg-blue-100 text-blue-700" :
                      item.type === "return" ? "bg-emerald-100 text-emerald-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>
                      {item.type === "borrow" ? "B" : item.type === "return" ? "R" : "W"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-tight">{item.description}</p>
                      {item.date && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.type === "borrow" ? "Due: " : ""}{formatDate(item.date)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {isLibrarian ? (
                <>
                  <QuickAction icon="📚" label="Add New Book" onClick={() => navigate("/books/new")} />
                  <QuickAction icon="👤" label="View Members" onClick={() => navigate("/members")} />
                  <QuickAction icon="📖" label="Borrow & Return" onClick={() => navigate("/borrowing")} />
                  <QuickAction icon="🕐" label="Waitlists" onClick={() => navigate("/reservations")} />
                </>
              ) : (
                <>
                  <QuickAction icon="🔍" label="Browse Books" onClick={() => navigate("/books")} />
                  <QuickAction icon="📖" label="My Borrows" onClick={() => navigate("/my-borrows")} />
                  <QuickAction icon="🕐" label="Reservations" onClick={() => navigate("/my-reservations")} />
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-xl border bg-muted/30 p-4 text-sm font-medium hover:bg-muted/60 transition-colors"
    >
      <span className="text-2xl">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
