import { looksFemale } from "@/lib/genderDetect";
import { AlertTriangle } from "lucide-react";

interface GenderNameWarningProps {
  name: string;
  gender: string;
  onFix: () => void;
}

const GenderNameWarning = ({ name, gender, onFix }: GenderNameWarningProps) => {
  if (gender !== "male" || !looksFemale(name)) return null;
  return (
    <p className="flex flex-wrap items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>এইটা মহিলা নাম মনে হচ্ছে — লিঙ্গ কি মহিলা হবে?</span>
      <button type="button" onClick={onFix} className="font-semibold underline underline-offset-2">
        মহিলা করুন
      </button>
    </p>
  );
};

export default GenderNameWarning;
