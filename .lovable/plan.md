# Admin Panel-এ Bulk Gender Show/Hide Button

## কী তৈরি হবে
Admin panel-এর Donor Management পেজে নতুন bulk-action buttons যোগ হবে। এক ক্লিকে admin নির্দিষ্ট gender-এর সব ডোনার show বা hide করতে পারবেন।

Button চারটি (header-এর নিচে, "যোগ করুন" বাটনের পাশে একটি row-তে):
1. **সব পুরুষ দেখান** — সব `gender='male'` ডোনার `is_visible=true`
2. **সব পুরুষ লুকান** — সব `gender='male'` ডোনার `is_visible=false`
3. **সব মহিলা দেখান** — সব `gender='female'` ডোনার `is_visible=true`
4. **সব মহিলা লুকান** — সব `gender='female'` ডোনার `is_visible=false`

প্রতিটি ক্লিকে একটি confirm toast/status দেখাবে এবং donor list refresh হবে।

## Implementation
- `src/components/admin/DonorManagement.tsx`-এ `bulkToggleVisibility(gender, makeVisible)` ফাংশন যোগ করা হবে।
- Supabase call: `supabase.from("donors").update({ is_visible: makeVisible }).eq("gender", gender)` — একবারে bulk update।
- সফল হলে `queryClient.invalidateQueries({ queryKey: ["donors"] })` দিয়ে list refresh এবং toast-এ কতজন বদলালো তা জানানো হবে।
- Buttons row-তে থাকবে, compact size, Eye/EyeOff icon সহ। Loading state (spinner) যাতে দুবার ক্লিক না হয়।

## RLS / Permission (verified)
- `donors` table-এ authenticated users-এর জন্য UPDATE grant আছে এবং `"Authenticated users can update donors"` policy `auth.uid() IS NOT NULL` দিয়ে সব column update অনুমোদন করে। Admin (`badhanfgcunit2018@gmail.com`) logged-in authenticated user হিসেবে bulk update করতে পারবেন — নতুন migration লাগবে না।

## Verification
- Admin হিসেবে login করে "সব মহিলা লুকান" ক্লিক → donor list-এ মহিলা row-গুলো opacity-60 (hidden) হয়।
- "সব মহিলা দেখান" ক্লিক → আবার visible।
- Toast-এ আসল count দেখায়।
- Per-row toggle আগের মতোই কাজ করে।
