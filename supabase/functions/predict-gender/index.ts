import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name } = await req.json();
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return new Response(JSON.stringify({ error: "name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI key missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Lovable-API-Key": LOVABLE_API_KEY,
        "X-Lovable-AIG-SDK": "fetch",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        reasoning_effort: "low",
        messages: [
          {
            role: "system",
            content:
              "You classify the likely gender of Bangladeshi personal names (Bengali or English script). " +
              'Reply with ONLY compact JSON: {"gender":"male"|"female"|"unknown","confidence":0-1,"reason":"short Bengali phrase"}. ' +
              "Use 'unknown' when the name is genuinely unisex or unrecognizable. Confidence must reflect real certainty. Keep the reason under 8 words.",
          },
          { role: "user", content: `Name: ${name.trim()}` },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      console.error("AI gateway error", aiResponse.status, text);
      return new Response(
        JSON.stringify({
          error:
            aiResponse.status === 429
              ? "একটু পরে আবার চেষ্টা করুন (rate limit)।"
              : aiResponse.status === 402
              ? "AI credit শেষ হয়ে গেছে।"
              : "AI prediction পাওয়া যায়নি।",
        }),
        { status: aiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await aiResponse.json();
    const content: string = aiData.choices?.[0]?.message?.content ?? "";
    const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim();

    let parsed: { gender?: string; confidence?: number; reason?: string } = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          parsed = {};
        }
      }
    }

    const gender = parsed.gender === "male" || parsed.gender === "female" ? parsed.gender : "unknown";
    const raw = Number(parsed.confidence);
    const confidence = Number.isFinite(raw) ? Math.min(Math.max(raw > 1 ? raw / 100 : raw, 0), 1) : 0;

    return new Response(
      JSON.stringify({ gender, confidence, reason: typeof parsed.reason === "string" ? parsed.reason : "" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("predict-gender error", error);
    return new Response(JSON.stringify({ error: "সার্ভার সমস্যা হয়েছে।" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
