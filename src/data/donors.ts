import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Donor {
  id: string;
  name: string;
  blood_group: string;
  phone: string;
  gender: string;
  is_visible: boolean;
  last_donation: string | null;
  total_donations: number;
}

export interface CommitteeMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  blood_group: string;
  department: string | null;
  session: string | null;
}

export const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

/**
 * useDonors — public view returns only visible donors (RLS enforced).
 * Admin logged in as badhanfgcunit2018@gmail.com automatically sees hidden donors too
 * via the "Admin can view all donors" RLS policy.
 */
export const useDonors = () =>
  useQuery({
    queryKey: ["donors"],
    queryFn: async () => {
      const PAGE = 1000;
      const all: Donor[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from("donors")
          .select("*")
          .order("name")
          .order("id")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        all.push(...((data ?? []) as Donor[]));
        if (!data || data.length < PAGE) break;
      }
      return all;
    },
  });

export const useCommitteeMembers = () =>
  useQuery({
    queryKey: ["committee_members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("committee_members")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data as CommitteeMember[];
    },
  });
