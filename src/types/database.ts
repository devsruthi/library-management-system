export type UserRole = "member" | "librarian"; // mirrors public.user_role enum in Supabase
export type BorrowStatus = "borrowed" | "returned" | "overdue";
export type ReservationStatus = "pending" | "available" | "fulfilled" | "cancelled";
export type NotificationType = "reservation_available" | "overdue" | "general" | "return_reminder";
export type MembershipType = "standard" | "premium";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  membership_type: MembershipType;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Genre {
  id: string;
  name: string;
  created_at: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  genre_id: string | null;
  publication_year: number | null;
  description: string | null;
  cover_url: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  genre?: Genre;
}

export interface BorrowRecord {
  id: string;
  book_id: string;
  member_id: string;
  borrowed_at: string;
  due_date: string;
  returned_at: string | null;
  status: BorrowStatus;
  created_at: string;
  book?: Book;
  member?: Profile;
}

export interface Reservation {
  id: string;
  book_id: string;
  member_id: string;
  status: ReservationStatus;
  reserved_at: string;
  notified_at: string | null;
  created_at: string;
  book?: Book;
  member?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
}

// Supabase Database type shape (used by the typed client)
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
      };
      genres: {
        Row: Genre;
        Insert: Omit<Genre, "id" | "created_at"> & { id?: string };
        Update: Partial<Genre>;
      };
      books: {
        Row: Book;
        Insert: Omit<Book, "id" | "created_at" | "updated_at" | "genre"> & { id?: string };
        Update: Partial<Omit<Book, "genre">>;
      };
      borrow_records: {
        Row: BorrowRecord;
        Insert: Omit<BorrowRecord, "id" | "created_at" | "book" | "member"> & { id?: string };
        Update: Partial<Omit<BorrowRecord, "book" | "member">>;
      };
      reservations: {
        Row: Reservation;
        Insert: Omit<Reservation, "id" | "created_at" | "book" | "member"> & { id?: string };
        Update: Partial<Omit<Reservation, "book" | "member">>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, "id" | "created_at"> & { id?: string };
        Update: Partial<Notification>;
      };
    };
  };
}
