import { supabase } from "@/lib/supabase";
import type { Reservation } from "@/types";
import { calculateDueDate } from "@/lib/utils";

export const reservationService = {
  async getAllReservations(): Promise<Reservation[]> {
    const { data, error } = await supabase
      .from("reservations")
      .select(
        `*, 
        book:books(id, title, author, isbn, cover_url, is_available, genre:genres(id, name, created_at)),
        member:profiles(id, full_name, email, role, membership_type, created_at, updated_at, phone, address)`
      )
      .order("reserved_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Reservation[];
  },

  async getMemberReservations(memberId: string): Promise<Reservation[]> {
    const { data, error } = await supabase
      .from("reservations")
      .select(
        `*, book:books(id, title, author, isbn, cover_url, is_available, genre:genres(id, name, created_at))`
      )
      .eq("member_id", memberId)
      .order("reserved_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Reservation[];
  },

  /**
   * Reserve a book for a member.
   * If the book is currently available, hold it immediately (mark unavailable).
   * If it is already unavailable (borrowed/held), just queue the reservation as a waitlist entry.
   */
  async reserveBook(bookId: string, memberId: string): Promise<Reservation> {
    // Check current availability first
    const { data: bookData } = await supabase
      .from("books")
      .select("is_available")
      .eq("id", bookId)
      .single();

    const bookIsAvailable = (bookData as { is_available: boolean } | null)?.is_available ?? false;

    // Only call the RPC when the book is free — marks it unavailable to hold the copy
    if (bookIsAvailable) {
      const { error: rpcErr } = await supabase.rpc("reserve_book", { p_book_id: bookId });
      if (rpcErr) throw rpcErr;
    }

    const { data, error } = await supabase
      .from("reservations")
      .insert({ book_id: bookId, member_id: memberId, status: "pending" })
      .select(
        `*, 
        book:books(id, title, author, isbn, cover_url, is_available, genre:genres(id, name, created_at)),
        member:profiles(id, full_name, email, role, membership_type, created_at, updated_at, phone, address)`
      )
      .single();
    if (error) throw error;
    return data as Reservation;
  },

  /**
   * Notify member that their reserved book is ready for pickup.
   * Copies are already held — no inventory change needed.
   */
  async notifyReservationAvailable(
    reservationId: string,
    userId: string,
    bookTitle: string
  ): Promise<void> {
    const { error: resErr } = await supabase
      .from("reservations")
      .update({ status: "available", notified_at: new Date().toISOString() })
      .eq("id", reservationId);
    if (resErr) throw resErr;

    const { error: notifErr } = await supabase.from("notifications").insert({
      user_id: userId,
      title: "Book Ready for Pickup!",
      message: `"${bookTitle}" is reserved for you and ready to pick up at the library.`,
      type: "reservation_available",
      is_read: false,
    });
    if (notifErr) throw notifErr;
  },

  /**
   * Cancel a reservation.
   * Only releases the book back to available if it is not currently borrowed —
   * i.e. the reservation itself was the one holding the copy.
   */
  async cancelReservation(reservationId: string, bookId: string): Promise<void> {
    const { error: resErr } = await supabase
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", reservationId);
    if (resErr) throw resErr;

    // Check if the book is currently out on an active borrow
    const { data: activeBorrows } = await supabase
      .from("borrow_records")
      .select("id")
      .eq("book_id", bookId)
      .eq("status", "borrowed")
      .limit(1);

    const isBorrowed = ((activeBorrows ?? []) as { id: string }[]).length > 0;

    // Only release the copy if no active borrow exists (reservation was holding it)
    if (!isBorrowed) {
      const { error: rpcErr } = await supabase.rpc("release_reservation", { p_book_id: bookId });
      if (rpcErr) throw rpcErr;
    }
  },

  /**
   * Fulfill a reservation — the member has arrived and is taking the book.
   * Always marks the book unavailable, creates a borrow record, and closes the reservation.
   * Handles both cases: book was held at reservation time OR book was a waitlist entry.
   */
  async fulfillReservation(
    reservationId: string,
    bookId: string,
    memberId: string,
    dueDays = 14
  ): Promise<void> {
    const dueDate = calculateDueDate(new Date(), dueDays);

    // Always mark the book as unavailable — covers both the "held at reservation" and
    // "waitlist entry where book became free later" scenarios.
    const { error: bookErr } = await supabase
      .from("books")
      .update({ is_available: false })
      .eq("id", bookId);
    if (bookErr) throw bookErr;

    // Mark reservation fulfilled
    const { error: resErr } = await supabase
      .from("reservations")
      .update({ status: "fulfilled" })
      .eq("id", reservationId);
    if (resErr) throw resErr;

    // Create the borrow record
    const { error: borrowErr } = await supabase.from("borrow_records").insert({
      book_id: bookId,
      member_id: memberId,
      due_date: dueDate.toISOString(),
      status: "borrowed",
    });
    if (borrowErr) throw borrowErr;
  },
};
