import { describe, it, expect } from "vitest";
import { normalizeBdPhone, isValidBdPhone } from "./phone";

describe("normalizeBdPhone", () => {
  it("converts Bangla digits", () => expect(normalizeBdPhone("০১৭১২৩৪৫৬৭৮")).toBe("01712345678"));
  it("strips +88", () => expect(normalizeBdPhone("+8801712345678")).toBe("01712345678"));
  it("strips 88 without plus", () => expect(normalizeBdPhone("8801712345678")).toBe("01712345678"));
  it("removes spaces and dashes", () => expect(normalizeBdPhone("01712-345 678")).toBe("01712345678"));
  it("adds missing leading 0", () => expect(normalizeBdPhone("1712345678")).toBe("01712345678"));
  it("rejects invalid operator", () => expect(isValidBdPhone("01212345678")).toBe(false));
});
