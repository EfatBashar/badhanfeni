import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InputFile {
  name?: string;
  mimeType: string;
  base64: string;
}

const SYSTEM_PROMPT = `You extract donor records from Bangladeshi blood-donor list documents (scanned photos, phone pictures of printed tables, or PDFs).

Return ONLY a valid JSON array. Each object: { "name": string, "phone": string, "blood_group": string }.

Rules:
- The table usually has columns: SL/NO, Name, Mobile No, Blood Group.
- Blood group cells are often MERGED: a group is written once and applies to that row AND all following rows until a new group appears. Fill the value down. If the very first rows have no group above them, use the first group that appears below them.
- blood_group must be exactly one of: A+, A-, B+, B-, AB+, AB-, O+, O-.
- Normalize phone: remove dashes, spaces, +88 or 88 country prefix. Final phone must match ^01[3-9][0-9]{8}$ (11 digits). If after normalizing it cannot match (too many/few digits), SKIP that row.
- Skip section headings/organization names — they are not donors.
- Extract every donor row from every page/image provided.
- Return ONLY the JSON array, no markdown, no commentary.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const files: InputFile[] = Array.isArray(body.files) ? body.files : [];

    if (files.length === 0) {
      return new Response(JSON.stringify({ error: "files is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parts: unknown[] = [
      {
        type: "text",
        text: "Extract all donor rows (name, phone, blood group) from the attached document(s). Return a JSON array.",
      },
    ];

    for (const file of files) {
      if (!file?.base64 || !file?.mimeType) continue;
      const dataUrl = `data:${file.mimeType};base64,${file.base64}`;
      if (file.mimeType === "application/pdf") {
        parts.push({
          type: "file",
          file: { filename: file.name || "list.pdf", file_data: dataUrl },
        });
      } else {
        parts.push({ type: "image_url", image_url: { url: dataUrl } });
      }
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: parts },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorBody = await aiResponse.text();
      console.error(`AI gateway failed [${aiResponse.status}]: ${errorBody}`);
      return new Response(
        JSON.stringify({ error: "AI request failed", status: aiResponse.status, details: errorBody, donors: [] }),
        { status: aiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await aiResponse.json();
    const content: string = aiData.choices?.[0]?.message?.content ?? "[]";

    let donors: Array<{ name?: string; phone?: string; blood_group?: string }> = [];
    try {
      const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim();
      const start = cleaned.indexOf("[");
      const end = cleaned.lastIndexOf("]");
      donors = JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "ফাইল থেকে তথ্য বের করা যায়নি", donors: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const valid = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    const phoneRegex = /^01[3-9][0-9]{8}$/;
    const seen = new Set<string>();

    const cleanDonors = (Array.isArray(donors) ? donors : [])
      .map((d) => ({
        name: String(d?.name ?? "").trim(),
        phone: String(d?.phone ?? "").replace(/\D/g, "").replace(/^88/, ""),
        blood_group: String(d?.blood_group ?? "").toUpperCase().trim(),
      }))
      .filter((d) => {
        if (d.name.length < 2 || !phoneRegex.test(d.phone) || !valid.includes(d.blood_group)) return false;
        if (seen.has(d.phone)) return false;
        seen.add(d.phone);
        return true;
      });

    return new Response(JSON.stringify({ donors: cleanDonors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message, donors: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
