import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Donor {
  id: string;
  name: string;
  blood_group: string;
  phone: string | null;
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
 * Guests read the phone-free public view; authenticated users read the protected donor table.
 * RLS scopes the public list to visible donors and admin access to the existing admin policy.
 */
export const useDonors = () => {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthenticated(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return useQuery({
    queryKey: ["donors", authenticated],
    queryFn: async () => {
      const PAGE = 1000;
      const all: Donor[] = [];
      for (let from = 0; ; from += PAGE) {
        const query = authenticated
          ? supabase.from("donors").select("*")
          : supabase.from("donors_public").select("*");
        const { data, error } = await query
          .order("name")
          .order("id")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        all.push(...((data ?? []).map((row) => ({
          ...row,
          phone: authenticated && "phone" in row ? row.phone : null,
        })) as Donor[]));
        if (!data || data.length < PAGE) break;
      }
      return all;
    },
  });
};

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
