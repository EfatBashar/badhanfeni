const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

/** Normalize any Bangladeshi phone input (Bangla digits, +88, spaces, dashes, missing 0) to 01XXXXXXXXX. */
export function normalizeBdPhone(input: string): string {
  let s = (input || "").replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
  s = s.replace(/\D/g, "");
  if (s.startsWith("0088")) s = s.slice(4);
  else if (s.startsWith("88") && s.length === 13) s = s.slice(2);
  if (s.length === 10 && s.startsWith("1")) s = "0" + s;
  return s;
}

export const BD_PHONE_REGEX = /^01[3-9][0-9]{8}$/;

export const isValidBdPhone = (input: string) => BD_PHONE_REGEX.test(normalizeBdPhone(input));
