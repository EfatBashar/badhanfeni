import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const id = typeof body.request_id === "string" ? body.request_id : "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "invalid request_id" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Only notify for real, recent requests (prevents spam with fake ids)
    const { data: r } = await supabase.from("blood_requests").select("*").eq("id", id).maybeSingle();
    if (!r) return json({ error: "not found" }, 404);
    if (Date.now() - new Date(r.created_at).getTime() > 5 * 60 * 1000) return json({ skipped: true });

    webpush.setVapidDetails(
      "mailto:badhanfgcunit2018@gmail.com",
      Deno.env.get("VAPID_PUBLIC_KEY")!,
      Deno.env.get("VAPID_PRIVATE_KEY")!,
    );

    const { data: subs } = await supabase.from("push_subscriptions").select("*");
    const payload = JSON.stringify({
      title: `🚨 রক্ত প্রয়োজন: ${r.blood_group} (${r.units_needed} ব্যাগ)`,
      body: `রোগী: ${r.patient_name} | ${r.hospital}\n📞 ${r.contact_phone}`,
      url: "/admin",
      tag: `req-${r.id}`,
    });

    let sent = 0;
    await Promise.all((subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600, urgency: "high" });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await supabase.from("push_subscriptions").delete().eq("id", s.id);
        else console.error("push failed", code, String(e));
      }
    }));
    return json({ sent });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});
