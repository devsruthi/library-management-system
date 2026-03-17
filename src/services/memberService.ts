import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types";

export const memberService = {
  async getMembers(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name");
    if (error) throw error;
    return (data ?? []) as Profile[];
  },

  async getMemberById(id: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as Profile | null;
  },

  async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile> {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as Profile;
  },
};
