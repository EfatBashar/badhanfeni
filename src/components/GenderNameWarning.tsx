import { looksFemale } from "@/lib/genderDetect";
import { useGenderPrediction } from "@/hooks/useGenderPrediction";
import { AlertTriangle, Loader2, Sparkles } from "lucide-react";

interface GenderNameWarningProps {
  name: string;
  gender: string;
  onFix: () => void;
  /** Called when AI suggests a gender (auto-applied at high confidence). */
  onSelectGender?: (gender: "male" | "female") => void;
}

const GenderNameWarning = ({ name, gender, onFix, onSelectGender }: GenderNameWarningProps) => {
  const apply = (g: "male" | "female") => {
    if (onSelectGender) onSelectGender(g);
    else if (g === "female") onFix();
  };

  const { prediction, loading } = useGenderPrediction(name, gender, apply);

  // Clearly female name from the local list.
  if (gender === "male" && looksFemale(name)) {
    return (
      <p className="flex flex-wrap items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>এইটা মহিলা নাম মনে হচ্ছে — লিঙ্গ কি মহিলা হবে?</span>
        <button type="button" onClick={onFix} className="font-semibold underline underline-offset-2">
          মহিলা করুন
        </button>
      </p>
    );
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 p-1 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> AI নাম যাচাই করছে...
      </p>
    );
  }

  if (!prediction || prediction.gender === "unknown") return null;

  const percent = Math.round(prediction.confidence * 100);
  const suggested = prediction.gender;
  const suggestedLabel = suggested === "female" ? "মহিলা" : "পুরুষ";
  const matches = suggested === gender;

  return (
    <p
      className={`flex flex-wrap items-center gap-2 rounded-md border p-2 text-xs ${
        matches
          ? "border-primary/30 bg-primary/5 text-muted-foreground"
          : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
      }`}
    >
      <Sparkles className="h-4 w-4 shrink-0" />
      <span>
        AI অনুমান: <strong>{suggestedLabel}</strong> ({percent}% confidence)
        {prediction.reason ? ` — ${prediction.reason}` : ""}
        {matches && percent >= 80 ? " · সিলেক্ট করা হয়েছে" : ""}
      </span>
      {!matches && (
        <button
          type="button"
          onClick={() => apply(suggested)}
          className="font-semibold underline underline-offset-2"
        >
          {suggestedLabel} করুন
        </button>
      )}
    </p>
  );
};

export default GenderNameWarning;
