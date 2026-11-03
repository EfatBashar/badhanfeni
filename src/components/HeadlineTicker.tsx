import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const HeadlineTicker = () => {
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
      .channel("announcements-ticker")
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

  if (!announcement?.message) return null;

  const text = announcement.message;

  return (
    <div className="group relative flex overflow-hidden">
      <div className="flex animate-marquee whitespace-nowrap py-1.5 text-base font-semibold text-primary-foreground [animation-play-state:running] group-hover:[animation-play-state:paused] group-active:[animation-play-state:paused] md:text-lg">
        <span className="px-8">{text}</span>
        <span className="px-8" aria-hidden="true">★</span>
        <span className="px-8" aria-hidden="true">{text}</span>
        <span className="px-8" aria-hidden="true">★</span>
      </div>
      <div
        className="flex animate-marquee whitespace-nowrap py-1.5 text-base font-semibold text-primary-foreground [animation-play-state:running] group-hover:[animation-play-state:paused] group-active:[animation-play-state:paused] md:text-lg"
        aria-hidden="true"
      >
        <span className="px-8">{text}</span>
        <span className="px-8">★</span>
        <span className="px-8">{text}</span>
        <span className="px-8">★</span>
      </div>
    </div>
  );
};

export default HeadlineTicker;
