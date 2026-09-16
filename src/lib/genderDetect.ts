// Detects names that look female (Bangladeshi context).
// Used to warn when someone selects "পুরুষ" with a clearly female name.

const FEMALE_SUFFIXES = [
  "akter",
  "aktar",
  "akhter",
  "jahan",
  "sultana",
  "parvin",
  "parbeen",
  "begum",
  "khatun",
  "binte",
  "bint",
  "nazneen",
  "afroj",
  "afroze",
  "yasmin",
  "yasmeen",
  "nahar",
  "tabassum",
  "jannat",
  "ferdous",
  "ferdaus",
  "afrin",
  "tasnim",
  "mumtaz",
];

const FEMALE_FIRST_NAMES = new Set([
  "afia",
  "aklima",
  "ankita",
  "fabiha",
  "fahima",
  "fahmida",
  "farhana",
  "farzana",
  "fatima",
  "fawzia",
  "humaira",
  "ilma",
  "israt",
  "jamia",
  "jannatul",
  "lamia",
  "maria",
  "mariyam",
  "muntaha",
  "nasrin",
  "nazia",
  "nusrat",
  "rubaina",
  "sabikun",
  "sadia",
  "saima",
  "sajeda",
  "salma",
  "sarika",
  "sayeza",
  "suraiya",
  "susmita",
  "tahera",
  "tajia",
  "tanzia",
  "tanzina",
  "puja",
  "pujarani",
  "khadija",
  "ayesha",
  "sumaiya",
  "sharmin",
  "rumana",
  "rupa",
  "rekha",
  "mim",
  "priya",
  "priyanka",
  "tanha",
]);

export const looksFemale = (name: string): boolean => {
  const words = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return false;
  if (FEMALE_FIRST_NAMES.has(words[0])) return true;
  return words.some((w) => FEMALE_SUFFIXES.includes(w));
};
