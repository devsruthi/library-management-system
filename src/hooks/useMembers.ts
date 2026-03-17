import { useState, useEffect } from "react";
import { memberService } from "@/services/memberService";
import type { Profile } from "@/types";

export function useMembers() {
  const [members, setMembers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await memberService.getMembers();
      setMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  return { members, isLoading, error, refetch: fetchMembers };
}
