import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3.25.76'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});
const BodySchema = z.object({ messages: z.array(MessageSchema).min(1).max(30) });

const SYSTEM = `তুমি "বাঁধন AI সহকারী" — badhanfeni ওয়েবসাইটের (বাঁধন, ফেনী সরকারি কলেজ ইউনিট — একটি রক্তদান সংগঠন) সহায়তা বট। সব উত্তর সহজ বাংলায় (কিছু ইংরেজি টেকনিক্যাল শব্দ যেমন sign up, password, email ঠিক আছে), বন্ধুত্বপূর্ণ ও সংক্ষিপ্ত রাখো — সাধারণত ৩–৬ লাইন, প্রয়োজনে markdown bullet। প্রশ্ন না বুঝলে একটি স্পষ্ট করার প্রশ্ন করো।

সাইট সম্পর্কে সত্য তথ্য:
- সাইট ব্যবহার করতে sign up বাধ্যতামূলক। Sign up করতে হয় নাম, email ও password দিয়ে; এরপর email-এ পাঠানো confirmation লিংকে ক্লিক করতে হয় (Inbox/Spam ফোল্ডার দেখো)। Confirm না করলে login হবে না।
- Password ভুলে গেলে Login পেজের "পাসওয়ার্ড ভুলে গেছেন?" দিয়ে reset লিংক নেওয়া যায়।
- রক্তের অনুরোধ করতে হোমপেজের "রক্ত প্রয়োজন? কল করুন" অংশের ফর্ম পূরণ করো: রোগীর নাম, হাসপাতাল/ঠিকানা, ব্লাড গ্রুপ, ব্যাগ সংখ্যা, যোগাযোগের নম্বর (বাংলাদেশি ফরম্যাট 01XXXXXXXXX, বাংলা ডিজিট বা +88 লিখলেও চলবে)। হিমোগ্লোবিন ঐচ্ছিক (১–২০ গ/ডিএল)।
- রক্তের অনুরোধ জমা দিলে সেই ব্লাড গ্রুপের ডোনারদের তালিকা দেখা যাবে — এর আগে ডোনার তালিকা গোপন থাকে। ডোনারের নম্বরে কল করা যায়।
- নতুন ডোনার রেজিস্ট্রেশন: হোমপেজের ফর্ম বা QR code scan করলে যে public পেজ (join donor) খোলে, সেখানে নাম, লিঙ্গ, ফোন ও ব্লাড গ্রুপ দিয়ে সাথে সাথে নিবন্ধন করা যায় — login লাগে না। নাম কমপক্ষে ২ অক্ষর, ফোন ১১ ডিজিট (01XXXXXXXXX)।
- ডোনারের তথ্য ঠিক না থাকলে অ্যাডমিনকে জানাতে হবে।
- সাইটে "ব্লাড গ্রুপিং শিখুন" পেজ (ছবি দিয়ে রক্ত গ্রুপিং শেখা, চার্ট) এবং "ব্লাড ও বাঁধন কুইজ" (১০০ প্রশ্ন, High Score) আছে।
- এই সাইটটি মোবাইলে "app" হিসেবে install করা যায় (Install App / Add to Home Screen)।
- জরুরি যোগাযোগ: অফিস ফোন 01577280577, email badhanfgcunit2018@gmail.com। ঠিকানা: কক্ষ নং-১, নিচ তলা, পূর্ব লাল ভবন, ফেনী সরকারি কলেজ।

নিয়ম:
- কখনো নিজে থেকে নতুন ফোন নম্বর, ঠিকানা বা তথ্য বানিয়ে বলো না — উপরের তথ্যের বাইরে জানা না থাকলে অ্যাডমিনের সাথে যোগাযোগ করতে বলো (উপরের ফোন/email)।
- ডোনারের ব্যক্তিগত তথ্য, password, অ্যাডমিন প্যানেলের ভেতরের বিষয় জানানো যাবে না।
- ব্যবহারকারীর কাছ থেকে password, OTP বা ব্যক্তিগত সংবেদনশীল তথ্য চাওয়া যাবে না।
- রক্তদান সংক্রান্ত মেডিকেল প্রশ্নে সাধারণ জ্ঞান দিতে পারো (যেমন: সুস্থ প্রাপ্তবয়স্ক ৩–৪ মাস পর পর রক্ত দিতে পারেন, ডোনেশনের আগে ভালো ঘুম ও খাওয়া দরকার), কিন্তু জরুরি/গুরুতর বিষয়ে ডাক্তার বা অ্যাডমিনের কথা বলো।
- তুমি কোনো ডেটা পরিবর্তন করতে বা কিছু করতে পারো না — শুধু তথ্য ও ধাপ বুঝিয়ে দাও।`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: "অনুরোধটি সঠিক নয়।", details: parsed.error.flatten().fieldErrors }, 400);
    }
    // Keep the recent context only
    const history = parsed.data.messages.slice(-20).map((m) => ({ role: m.role, content: m.content }));

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "AI কনফিগারেশন নেই। একটু পরে চেষ্টা করুন।" }, 500);

    const ai = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      signal: req.signal,
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        input: [{ role: "system", content: SYSTEM }, ...history],
      }),
    });

    if (!ai.ok || !ai.body) {
      const t = await ai.text();
      console.error("AI gateway error", ai.status, t);
      const msg =
        ai.status === 429 ? "এখন অনেক request আসছে, একটু পরে আবার চেষ্টা করুন।"
        : ai.status === 402 ? "AI সার্ভিসের credit শেষ হয়ে গেছে — একটু পরে আবার চেষ্টা করুন।"
        : "AI সহকারী এখন উত্তর দিতে পারছে না। একটু পরে আবার চেষ্টা করুন।";
      return json({ error: msg }, ai.status >= 400 && ai.status < 500 && ai.status !== 429 ? ai.status : 502);
    }

    // Forward AI text deltas to the browser as a simple SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const reader = ai.body!.getReader();
        const dec = new TextDecoder();
        let buf = "";
        const send = (obj: unknown) => controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`));
        try {
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
                if (ev.type === "response.output_text.delta" && ev.delta) send({ delta: ev.delta });
              } catch { /* ignore malformed frames */ }
            }
          }
          send({ done: true });
        } catch (e) {
          if (req.signal.aborted) { try { controller.close(); } catch { /* already closed */ } return; }
          console.error("stream error", e);
          send({ error: "উত্তর আসার সময় সমস্যা হয়েছে। আবার চেষ্টা করুন।" });
        } finally {
          try { controller.close(); } catch { /* already closed */ }
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (e) {
    if (req.signal?.aborted) return new Response(null, { status: 499 });
    console.error("ai-help-chat error", e);
    return json({ error: "সার্ভারে সমস্যা হয়েছে। একটু পরে চেষ্টা করুন।" }, 500);
  }
});
