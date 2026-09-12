# "DEVELOPED BY RIHAN CHOWDHURY" যোগ করা

## কী তৈরি হবে
Homepage (`Index.tsx`) footer-এর একদম শেষে "DEVELOPED BY RIHAN CHOWDHURY" লেখা যোগ হবে।
"Rihan Chowdhury" অংশে ক্লিক করলে নতুন tab-এ Facebook profile খুলবে:
`https://www.facebook.com/profile.php?id=61582382462458`

## পরিবর্তন
- `src/pages/Index.tsx` — footer-এর admin/logout row-এর নিচে একটি ছোট লাইন যোগ করা হবে।
- Text: `DEVELOPED BY <a href="..." target="_blank" rel="noopener noreferrer">RIHAN CHOWDHURY</a>`
- Style: subtle, `text-xs`, muted color, theme accent on hover — অন্যান্য footer text-এর সাথে সামঞ্জস্যপূর্ণ।
- কোনো নতুন dependency বা অন্য page পরিবর্তন নেই।

## যাচাই
- Build সফল হবে।
- Homepage footer-এর একদম নিচে লেখাটি দেখা যাবে এবং "RIHAN CHOWDHURY" ক্লিক করলে Facebook profile খুলবে।
