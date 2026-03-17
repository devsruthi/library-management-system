import { supabase } from "@/lib/supabase";
import type { Reservation } from "@/types";

export const reservationService = {
  async getAllReservations(): Promise<Reservation[]> {
    const { data, error } = await supabase
      .from("reservations")
      .select(
        `*, 
        book:books(id, title, author, isbn, available_copies, total_copies, genre:genres(id, name, created_at)),
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
        `*, book:books(id, title, author, isbn, available_copies, total_copies, genre:genres(id, name, created_at))`
      )
      .eq("member_id", memberId)
      .order("reserved_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Reservation[];
  },

  async reserveBook(bookId: string, memberId: string): Promise<Reservation> {
    const { data, error } = await supabase
      .from("reservations")
      .insert({
        book_id: bookId,
        member_id: memberId,
        status: "pending",
      })
      .select(
        `*, 
        book:books(id, title, author, isbn, available_copies, total_copies, genre:genres(id, name, created_at)),
        member:profiles(id, full_name, email, role, membership_type, created_at, updated_at, phone, address)`
      )
      .single();
    if (error) throw error;
    return data as Reservation;
  },

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
      title: "Book Available!",
      message: `"${bookTitle}" is now available for pickup. Please visit the library to borrow it.`,
      type: "reservation_available",
      is_read: false,
    });
    if (notifErr) throw notifErr;
  },

  async cancelReservation(reservationId: string): Promise<void> {
    const { error } = await supabase
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", reservationId);
    if (error) throw error;
  },

  async fulfillReservation(reservationId: string): Promise<void> {
    const { error } = await supabase
      .from("reservations")
      .update({ status: "fulfilled" })
      .eq("id", reservationId);
    if (error) throw error;
  },
};
