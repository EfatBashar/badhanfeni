import { supabase } from "@/integrations/supabase/client";

export interface DonorRegistration {
  name: string;
  phone: string;
  blood_group: string;
  gender: "male" | "female";
}

interface QueuedDonor extends DonorRegistration {
  queuedAt: string;
}

export type DonorSubmitResult = "success" | "duplicate";

const QUEUE_KEY = "badhon-pending-donor-registrations";
import { normalizeBdPhone } from "./phone";
const phoneRegex = /^01[3-9][0-9]{8}$/;

export const validateDonor = (donor: DonorRegistration): string | null => {
  if (!donor.name.trim() || !normalizeBdPhone(donor.phone) || !donor.blood_group) return "সব তথ্য পূরণ করুন";
  if (donor.name.trim().length < 2) return "নাম কমপক্ষে ২ অক্ষরের হতে হবে";
  if (!phoneRegex.test(normalizeBdPhone(donor.phone))) return "সঠিক ফোন নম্বর দিন (01XXXXXXXXX)";
  return null;
};

export const submitDonor = async (donor: DonorRegistration): Promise<DonorSubmitResult> => {
  const phone = normalizeBdPhone(donor.phone);
  const { data: existing, error: lookupError } = await supabase
    .from("donors")
    .select("id")
    .eq("phone", phone)
    .limit(1);

  if (lookupError) throw lookupError;
  if (existing && existing.length > 0) return "duplicate";

  const { error } = await supabase.from("donors").insert({
    name: donor.name.trim(),
    phone,
    blood_group: donor.blood_group,
    gender: donor.gender,
  });
  if (error) throw error;
  return "success";
};

export const getQueuedDonors = (): QueuedDonor[] => {
  try {
    const stored = localStorage.getItem(QUEUE_KEY);
    return stored ? (JSON.parse(stored) as QueuedDonor[]) : [];
  } catch {
    return [];
  }
};

export const queueDonor = (donor: DonorRegistration) => {
  const queue = getQueuedDonors().filter((item) => item.phone !== normalizeBdPhone(donor.phone));
  queue.push({ ...donor, name: donor.name.trim(), phone: normalizeBdPhone(donor.phone), queuedAt: new Date().toISOString() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event("donor-queue-change"));
};

export const flushDonorQueue = async () => {
  const queue = getQueuedDonors();
  const remaining: QueuedDonor[] = [];
  let synced = 0;
  let duplicates = 0;

  for (const donor of queue) {
    try {
      const result = await submitDonor(donor);
      if (result === "success") synced += 1;
      else duplicates += 1;
    } catch {
      remaining.push(donor);
    }
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  window.dispatchEvent(new Event("donor-queue-change"));
  return { synced, duplicates, pending: remaining.length };
};