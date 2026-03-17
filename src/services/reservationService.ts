import { supabase } from "@/lib/supabase";
import type { Reservation } from "@/types";
import { calculateDueDate } from "@/lib/utils";

export const reservationService = {
  async getAllReservations(): Promise<Reservation[]> {
    const { data, error } = await supabase
      .from("reservations")
      .select(
        `*, 
        book:books(id, title, author, isbn, is_available, genre:genres(id, name, created_at)),
        member:profiles(id, full_name, email, role, membership_type, created_at, updated_at, phone, address)`
      )
      .order("reserved_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Reservation[];
  },

  async getMemberReservations(memberId: string): Promise<Reservation[]> {
    const { data, error } = await supabase
      .from("reservations")
      .select(
        `*, book:books(id, title, author, isbn, is_available, genre:genres(id, name, created_at))`
      )
      .eq("member_id", memberId)
      .order("reserved_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Reservation[];
  },

  /**
   * Reserve a book for a member.
   * Marks the book unavailable atomically so it can't be assigned to someone else.
   */
  async reserveBook(bookId: string, memberId: string): Promise<Reservation> {
    // Hold the copy first — fails if no copies available
    const { error: rpcErr } = await supabase.rpc("reserve_book", {
      p_book_id: bookId,
    });
    if (rpcErr) throw rpcErr;

    const { data, error } = await supabase
      .from("reservations")
      .insert({ book_id: bookId, member_id: memberId, status: "pending" })
      .select(
        `*, 
        book:books(id, title, author, isbn, is_available, genre:genres(id, name, created_at)),
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
   * Cancel a reservation and release the held copy back to inventory.
   */
  async cancelReservation(reservationId: string, bookId: string): Promise<void> {
    const { error: resErr } = await supabase
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", reservationId);
    if (resErr) throw resErr;

    // Release the held copy back
    const { error: rpcErr } = await supabase.rpc("release_reservation", {
      p_book_id: bookId,
    });
    if (rpcErr) throw rpcErr;
  },

  /**
   * Fulfill a reservation — the member has arrived and is taking the book.
   * Creates a borrow_record for the member. The book stays unavailable until returned.
   */
  async fulfillReservation(
    reservationId: string,
    bookId: string,
    memberId: string,
    dueDays = 14
  ): Promise<void> {
    const dueDate = calculateDueDate(new Date(), dueDays);

    // Mark reservation fulfilled
    const { error: resErr } = await supabase
      .from("reservations")
      .update({ status: "fulfilled" })
      .eq("id", reservationId);
    if (resErr) throw resErr;

    // Create the borrow record (no copy change — already held from reserve step)
    const { error: borrowErr } = await supabase.from("borrow_records").insert({
      book_id: bookId,
      member_id: memberId,
      due_date: dueDate.toISOString(),
      status: "borrowed",
    });
    if (borrowErr) throw borrowErr;
  },
};
