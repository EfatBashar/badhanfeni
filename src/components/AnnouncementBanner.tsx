import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AUTO_MS = 4000;
const PAUSE_MS = 8000;

const AnnouncementBanner = () => {
  const queryClient = useQueryClient();

  const { data: announcement } = useQuery({
    queryKey: ["active_announcement"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("announcements-banner")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcements" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["active_announcement"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const images = useMemo(() => {
    if (!announcement) return [] as string[];
    const list = (announcement as { image_urls?: string[] | null }).image_urls;
    const legacy = (announcement as { image_url?: string | null }).image_url;
    const arr = Array.isArray(list) && list.length > 0 ? list : legacy ? [legacy] : [];
    return arr.filter((u): u is string => typeof u === "string" && u.length > 0);
  }, [announcement]);

  const message = announcement?.message ?? "";

  const [idx, setIdx] = useState(0);
  const pauseUntilRef = useRef(0);

  useEffect(() => {
    setIdx(0);
  }, [images.length]);

  useEffect(() => {
    if (images.length < 2) return;
    const t = setInterval(() => {
      if (Date.now() < pauseUntilRef.current) return;
      setIdx((i) => (i + 1) % images.length);
    }, AUTO_MS);
    return () => clearInterval(t);
  }, [images.length]);

  if (!announcement) return null;
  if (images.length === 0 && !message) return null;

  const go = (next: number) => {
    pauseUntilRef.current = Date.now() + PAUSE_MS;
    setIdx((next + images.length) % images.length);
  };

  return (
    <div className="w-full bg-white">
      {images.length > 0 ? (
        <div className="relative w-full">
          {/* Sizer keeps auto height matching current image */}
          <img
            src={images[idx]}
            alt={message || "ব্যানার"}
            className="block h-auto w-full opacity-0"
            aria-hidden="true"
          />
          {images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={message || "ব্যানার"}
              className={`absolute inset-0 block h-full w-full object-contain transition-opacity duration-700 ${
                i === idx ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(idx - 1)}
                aria-label="আগের ছবি"
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/60"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => go(idx + 1)}
                aria-label="পরের ছবি"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/60"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`ছবি ${i + 1}`}
                    className={`h-2 rounded-full transition-all ${
                      i === idx ? "w-5 bg-white" : "w-2 bg-white/60"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="group relative flex overflow-hidden py-3">
          <div className="flex shrink-0 animate-marquee whitespace-nowrap text-lg font-bold text-primary [animation-play-state:running] group-hover:[animation-play-state:paused] group-active:[animation-play-state:paused] md:text-xl">
            <span className="px-8">{message}</span>
            <span className="px-8" aria-hidden="true">★</span>
            <span className="px-8" aria-hidden="true">{message}</span>
            <span className="px-8" aria-hidden="true">★</span>
          </div>
          <div
            className="flex shrink-0 animate-marquee whitespace-nowrap text-lg font-bold text-primary [animation-play-state:running] group-hover:[animation-play-state:paused] group-active:[animation-play-state:paused] md:text-xl"
            aria-hidden="true"
          >
            <span className="px-8">{message}</span>
            <span className="px-8">★</span>
            <span className="px-8">{message}</span>
            <span className="px-8">★</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementBanner;
