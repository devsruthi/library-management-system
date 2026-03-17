import { supabase } from "@/lib/supabase";
import type { BorrowRecord } from "@/types";
import { calculateDueDate } from "@/lib/utils";

export const borrowService = {
  async getAllBorrowRecords(): Promise<BorrowRecord[]> {
    const { data, error } = await supabase
      .from("borrow_records")
      .select(
        `*, 
        book:books(id, title, author, isbn, available_copies, total_copies, genre:genres(id, name, created_at)),
        member:profiles(id, full_name, email, role, membership_type, created_at, updated_at, phone, address)`
      )
      .order("borrowed_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as BorrowRecord[];
  },

  async getMemberBorrowRecords(memberId: string): Promise<BorrowRecord[]> {
    const { data, error } = await supabase
      .from("borrow_records")
      .select(
        `*, book:books(id, title, author, isbn, available_copies, total_copies, genre:genres(id, name, created_at))`
      )
      .eq("member_id", memberId)
      .order("borrowed_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as BorrowRecord[];
  },

  async borrowBook(bookId: string, memberId: string, dueDays = 14): Promise<BorrowRecord> {
    const dueDate = calculateDueDate(new Date(), dueDays);

    // Decrement available_copies
    const { error: bookError } = await supabase.rpc("borrow_book", {
      p_book_id: bookId,
    });
    if (bookError) throw bookError;

    const { data, error } = await supabase
      .from("borrow_records")
      .insert({
        book_id: bookId,
        member_id: memberId,
        due_date: dueDate.toISOString(),
        status: "borrowed",
      })
      .select(
        `*, book:books(id, title, author, isbn, available_copies, total_copies, genre:genres(id, name, created_at)),
        member:profiles(id, full_name, email, role, membership_type, created_at, updated_at, phone, address)`
      )
      .single();
    if (error) throw error;
    return data as BorrowRecord;
  },

  async returnBook(borrowRecordId: string, bookId: string): Promise<BorrowRecord> {
    // Increment available_copies
    const { error: bookError } = await supabase.rpc("return_book", {
      p_book_id: bookId,
    });
    if (bookError) throw bookError;

    const { data, error } = await supabase
      .from("borrow_records")
      .update({
        returned_at: new Date().toISOString(),
        status: "returned",
      })
      .eq("id", borrowRecordId)
      .select(
        `*, book:books(id, title, author, isbn, available_copies, total_copies, genre:genres(id, name, created_at)),
        member:profiles(id, full_name, email, role, membership_type, created_at, updated_at, phone, address)`
      )
      .single();
    if (error) throw error;
    return data as BorrowRecord;
  },

  async getActiveBorrowsForBook(bookId: string): Promise<BorrowRecord[]> {
    const { data, error } = await supabase
      .from("borrow_records")
      .select(
        `*, member:profiles(id, full_name, email, role, membership_type, created_at, updated_at, phone, address)`
      )
      .eq("book_id", bookId)
      .eq("status", "borrowed");
    if (error) throw error;
    return (data ?? []) as BorrowRecord[];
  },
};
