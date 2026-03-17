import { useState, useEffect } from "react";
import { reservationService } from "@/services/reservationService";
import type { Reservation } from "@/types";

export function useAllReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await reservationService.getAllReservations();
      setReservations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reservations");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  return { reservations, isLoading, error, refetch: fetch };
}

export function useMemberReservations(memberId: string | undefined) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!memberId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    reservationService
      .getMemberReservations(memberId)
      .then(setReservations)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [memberId]);

  return { reservations, isLoading, error };
}
