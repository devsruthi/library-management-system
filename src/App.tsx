import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/templates/DashboardLayout";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { BooksPage } from "@/pages/books/BooksPage";
import { BookDetailPage } from "@/pages/books/BookDetailPage";
import { BookFormPage } from "@/pages/books/BookFormPage";
import { MembersPage } from "@/pages/members/MembersPage";
import { MemberDetailPage } from "@/pages/members/MemberDetailPage";
import { BorrowingPage } from "@/pages/borrowing/BorrowingPage";
import { MyBorrowsPage } from "@/pages/borrowing/MyBorrowsPage";
import { ReservationsPage } from "@/pages/reservations/ReservationsPage";
import { MyReservationsPage } from "@/pages/reservations/MyReservationsPage";
import { LoadingSpinner } from "@/components/molecules/LoadingSpinner";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function LibrarianRoute({ children }: { children: React.ReactNode }) {
  const { isLibrarian, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (!isLibrarian) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  return (
    <Routes>
      {/* Auth routes */}
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />

      {/* Protected app routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="books" element={<BooksPage />} />
        <Route path="books/:id" element={<BookDetailPage />} />

        {/* Librarian only */}
        <Route
          path="books/new"
          element={
            <LibrarianRoute>
              <BookFormPage />
            </LibrarianRoute>
          }
        />
        <Route
          path="books/:id/edit"
          element={
            <LibrarianRoute>
              <BookFormPage />
            </LibrarianRoute>
          }
        />
        <Route
          path="members"
          element={
            <LibrarianRoute>
              <MembersPage />
            </LibrarianRoute>
          }
        />
        <Route
          path="members/:id"
          element={
            <LibrarianRoute>
              <MemberDetailPage />
            </LibrarianRoute>
          }
        />
        <Route
          path="borrowing"
          element={
            <LibrarianRoute>
              <BorrowingPage />
            </LibrarianRoute>
          }
        />
        <Route
          path="reservations"
          element={
            <LibrarianRoute>
              <ReservationsPage />
            </LibrarianRoute>
          }
        />

        {/* Member routes */}
        <Route path="my-borrows" element={<MyBorrowsPage />} />
        <Route path="my-reservations" element={<MyReservationsPage />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </BrowserRouter>
  );
}
