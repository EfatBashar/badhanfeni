import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { looksFemale } from "@/lib/genderDetect";

export interface GenderPrediction {
  gender: "male" | "female" | "unknown";
  confidence: number;
  reason: string;
}

const AUTO_SELECT_THRESHOLD = 0.8;
const cache = new Map<string, GenderPrediction>();

/**
 * For ambiguous names (not caught by the local list) ask the AI Gateway for a
 * gender prediction with confidence, and auto-select it when confident enough.
 */
export const useGenderPrediction = (
  name: string,
  gender: string,
  onAutoSelect: (gender: "male" | "female") => void,
) => {
  const [prediction, setPrediction] = useState<GenderPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const autoSelectedFor = useRef<string | null>(null);
  const autoSelectRef = useRef(onAutoSelect);
  autoSelectRef.current = onAutoSelect;

  const trimmed = name.trim();
  // Local detector already handles clearly-female names; skip those.
  const ambiguous = trimmed.length >= 3 && !looksFemale(trimmed);

  useEffect(() => {
    if (!ambiguous) {
      setPrediction(null);
      setLoading(false);
      return;
    }

    const key = trimmed.toLowerCase();
    let cancelled = false;

    const apply = (result: GenderPrediction) => {
      if (cancelled) return;
      setPrediction(result);
      if (
        result.gender !== "unknown" &&
        result.confidence >= AUTO_SELECT_THRESHOLD &&
        result.gender !== gender &&
        autoSelectedFor.current !== key
      ) {
        autoSelectedFor.current = key;
        autoSelectRef.current(result.gender);
      }
    };

    const cached = cache.get(key);
    if (cached) {
      apply(cached);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("predict-gender", {
        body: { name: trimmed },
      });
      if (cancelled) return;
      setLoading(false);
      if (error || !data || data.error) {
        setPrediction(null);
        return;
      }
      const result: GenderPrediction = {
        gender: data.gender ?? "unknown",
        confidence: Number(data.confidence) || 0,
        reason: data.reason ?? "",
      };
      cache.set(key, result);
      apply(result);
    }, 700);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed, ambiguous]);

  return { prediction, loading };
};
