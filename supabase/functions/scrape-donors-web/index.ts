import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MAX_CHARS = 60000;

const htmlToText = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<(br|\/p|\/div|\/tr|\/li|\/h\d)[^>]*>/gi, "\n")
    .replace(/<\/t[dh]>/gi, " | ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();

const SYSTEM = `You extract blood donor records from web page text (Bengali or English, Bangladesh).
Return ONLY compact JSON: {"donors":[{"name":string,"phone":string,"blood_group":"A+"|"A-"|"B+"|"B-"|"AB+"|"AB-"|"O+"|"O-","gender":"male"|"female","area":string}]}
Rules: include only real people with a phone number and blood group. Convert Bengali digits to ASCII. Phone as 11-digit 01XXXXXXXXX (strip +88/88). Normalize blood groups (e.g. "B positive"/"বি+" -> "B+"). If a table merges blood-group cells, apply the group to following rows. Guess gender from the name. area may be "". If none found return {"donors":[]}. No commentary.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { url, text } = await req.json();
    let content = typeof text === "string" ? text.trim() : "";

    if (!content && typeof url === "string" && /^https?:\/\//i.test(url.trim())) {
      const u = url.trim();
      const hasPhones = (s: string) => /(01[3-9]\d{8}|০১[৩-৯][০-৯]{8})/.test(s.replace(/[\s-]/g, ""));
      try {
        const r = await fetch(u, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; BadhonImporter/1.0)", Accept: "text/html,*/*" },
        });
        if (r.ok) content = htmlToText(await r.text());
      } catch { /* fallback below */ }
      // JS-rendered sites: use a rendering reader
      if (!hasPhones(content)) {
        try {
          const r2 = await fetch(`https://r.jina.ai/${u}`, { headers: { "X-Timeout": "40" } });
          if (r2.ok) {
            const t = await r2.text();
            if (t.length > content.length || hasPhones(t)) content = t;
          }
        } catch { /* ignore */ }
      }
      if (!content) return json({ error: "পেজটি খোলা যায়নি। টেক্সট কপি করে পেস্ট করুন।" }, 400);
      if (!hasPhones(content))
        return json({ error: "এই পেজে কোনো ফোন নম্বর পাওয়া যায়নি। ডোনার তালিকা যে পেজে আছে সেই লিংক দিন, অথবা লেখা কপি করে পেস্ট করুন।" }, 400);
    }
    if (!content) return json({ error: "লিংক বা টেক্সট দিন।" }, 400);
    if (content.length < 20)
      return json({ error: "পেজে কোনো লেখা পাওয়া যায়নি (হয়তো JavaScript দিয়ে লোড হয়)। টেক্সট কপি করে পেস্ট করুন।" }, 400);
    content = content.slice(0, MAX_CHARS);

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "AI key missing" }, 500);

    const ai = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      signal: req.signal,
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        input: [
          { role: "system", content: SYSTEM },
          { role: "user", content },
        ],
      }),
    });

    if (!ai.ok || !ai.body) {
      const t = await ai.text();
      console.error("AI error", ai.status, t);
      const msg =
        ai.status === 429 ? "একটু পরে আবার চেষ্টা করুন (rate limit)।"
        : ai.status === 402 ? "AI credit শেষ হয়ে গেছে।"
        : "AI থেকে উত্তর পাওয়া যায়নি।";
      return json({ error: msg }, ai.status);
    }

    // Consume SSE stream, collect output text
    const reader = ai.body.getReader();
    const dec = new TextDecoder();
    let buf = "", out = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const d = line.slice(5).trim();
        if (!d || d === "[DONE]") continue;
        try {
          const ev = JSON.parse(d);
          if (ev.type === "response.output_text.delta") out += ev.delta ?? "";
        } catch { /* ignore */ }
      }
    }

    const cleaned = out.replace(/```json/gi, "").replace(/```/g, "").trim();
    let parsed: { donors?: unknown[] } = {};
    try { parsed = JSON.parse(cleaned); } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) try { parsed = JSON.parse(m[0]); } catch { /* */ }
    }
    const donors = Array.isArray(parsed.donors) ? parsed.donors : [];
    if (donors.length === 0)
      return json({ error: "এই পেজে কোনো ডোনার পাওয়া যায়নি। ডোনার তালিকার পেজের লিংক দিন বা লেখা কপি করে পেস্ট করুন।" }, 400);
    return json({ donors });
  } catch (e) {
    if (req.signal.aborted) return new Response(null, { status: 499 });
    console.error("scrape-donors-web error", e);
    return json({ error: "সার্ভার সমস্যা হয়েছে।" }, 500);
  }
});
