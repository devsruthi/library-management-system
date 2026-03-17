import { useState, useEffect } from "react";
import { borrowService } from "@/services/borrowService";
import type { BorrowRecord } from "@/types";

export function useAllBorrows() {
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await borrowService.getAllBorrowRecords();
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load borrow records");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  return { records, isLoading, error, refetch: fetch };
}

export function useMemberBorrows(memberId: string | undefined) {
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!memberId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    borrowService
      .getMemberBorrowRecords(memberId)
      .then(setRecords)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [memberId]);

  return { records, isLoading, error };
}
