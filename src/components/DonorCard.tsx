import { Phone, CheckCircle, AlertCircle, Calendar, User, Copy, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Donor } from "@/data/donors";

const FOUR_MONTHS_MS = 4 * 30 * 24 * 60 * 60 * 1000;

const isEligible = (lastDonation: string | null): boolean => {
  if (!lastDonation) return true;
  const last = new Date(lastDonation);
  return Date.now() - last.getTime() >= FOUR_MONTHS_MS;
};

const getNextEligibleDate = (lastDonation: string): Date => {
  const last = new Date(lastDonation);
  return new Date(last.getTime() + FOUR_MONTHS_MS);
};

const DonorCard = ({ donor }: { donor: Donor }) => {
  const eligible = isEligible(donor.last_donation);
  const [showContact, setShowContact] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setLoggedIn(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setLoggedIn(!!s));
    return () => subscription.unsubscribe();
  }, []);

  const handleCopy = async () => {
    if (!donor.phone) return;
    const textToCopy = `${donor.name}: ${donor.phone}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement("textarea");
      el.value = textToCopy;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      {/* Avatar + Blood Group Badge */}
      <div className="flex flex-col items-center">
        <div className="relative mb-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <User className="h-10 w-10 text-muted-foreground/50" />
          </div>
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground shadow">
            {donor.blood_group}
          </span>
        </div>

        {/* Name */}
        <h3 className="mt-2 text-xl font-bold text-foreground">{donor.name}</h3>

        {/* Last Donation */}
        {donor.last_donation && (
          <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 text-primary/70" />
            শেষ দান: {new Date(donor.last_donation).toLocaleDateString("bn-BD")}
          </div>
        )}

        {/* Total Donations */}
        {donor.total_donations > 0 && (
          <span className="mt-2 inline-block rounded-full border border-border px-3 py-0.5 text-xs font-medium text-muted-foreground">
            মোট দান: {donor.total_donations.toLocaleString("bn-BD")} বার
          </span>
        )}

        {/* Eligibility */}
        <div className="mt-3">
          {eligible ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
              <CheckCircle className="h-3.5 w-3.5" /> রক্তদানে সক্ষম
            </span>
          ) : (
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                <AlertCircle className="h-3.5 w-3.5" /> রক্তদানে অক্ষম
              </span>
              <p className="mt-1 text-[11px] text-red-500">
                চার মাস পূর্ণ হতে আরও সময় বাকি। পরবর্তী তারিখ: {getNextEligibleDate(donor.last_donation!).toLocaleDateString("bn-BD")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Contact Button */}
      <div className="mt-5 space-y-2">
        {!showContact ? (
          <button
            onClick={() => setShowContact(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow transition-transform hover:scale-[1.02]"
          >
            <Phone className="h-4 w-4" /> যোগাযোগ
          </button>
        ) : loggedIn !== true || !donor.phone ? (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
            <p className="text-sm font-semibold text-foreground">🔒 নম্বর দেখতে লগইন / সাইন-আপ করুন</p>
            <p className="mt-1 text-xs text-muted-foreground">সাইন-আপের পর আপনার ইমেইলে আসা লিংকে ক্লিক করে account confirm করুন।</p>
            <Link
              to="/login"
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow"
            >
              লগইন / সাইন-আপ
            </Link>
          </div>
        ) : (
          <>
            {/* Phone number with copy */}
            <button
              onClick={handleCopy}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-accent"
            >
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
              {donor.name}: {donor.phone}
              {copied && <span className="text-xs text-primary">কপি হয়েছে!</span>}
            </button>

            {/* Call button */}
            <a
              href={`tel:${donor.phone}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow transition-transform hover:scale-[1.02]"
            >
              <Phone className="h-4 w-4" /> কল করুন
            </a>
          </>
        )}
      </div>
    </div>
  );
};

export default DonorCard;
