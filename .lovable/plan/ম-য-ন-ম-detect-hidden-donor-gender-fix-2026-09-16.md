# মেয়ে নাম Detect + Hidden Donor Gender Fix

## ১. Database-এ hidden donor-দের gender ঠিক করা
- `is_visible = false` এবং `gender = 'male'` এমন donor-দের খুঁজে বের করে (query already run — ~৫০+ জন পাওয়া গেছে, যেমন Afia Akter, Fatima Akter, Jannatul Ferdous ইত্যাদি) তাদের `gender = 'female'` করে দেওয়া হবে।
- Matching নিয়ম: নামের শেষ অংশে female marker থাকলে — `Akter/Aktar/Akhter, Jahan, Sultana, Parvin/Parbeen, Begum, Khatun, Binte/Bint, Nazneen, Afroj/Afroze, Yasmin, Nahar, Tabassum` — অথবা পরিচিত female first-name (Afia, Ankita, Fabiha, Fahima, Fahmida, Farhana, Farzana, Fatima, Fawzia, Humaira, Ilma, Israt, Jamia, Jannatul, Lamia, Maria, Mariyam, Muntaha, Nasrin, Nazia, Nusrat, Rubaina, Sabikun, Sadia, Saima, Sajeda, Salma, Sarika, Sayeza, Suraiya, Susmita, Tahera, Tajia, Tanzia, Tanzina, Puja/Pujarani ইত্যাদি)।
- **`is_visible` অপরিবর্তিত থাকবে** — hide/unhide এর সিদ্ধান্ত admin-এর (আপনার) হাতেই থাকবে।
- কোনো নাম দ্ব্যর্থক (যেমন "Khoshnoor Alam", "tahsin") হলে সেগুলো untouched থাকবে, আলাদা করে list করে আপনাকে জানিয়ে দেওয়া হবে।

## ২. Signup form-এ নাম detect করে warning
- নতুন shared utility: `src/lib/genderDetect.ts` — female marker/suffix ও first-name list দিয়ে নাম check করবে।
- `DonorSignupForm.tsx` (login-কৃত donor form) এবং `JoinDonor.tsx` (public QR form) দুই জায়গাতেই:
  - নাম লিখে gender "পুরুষ" select করলে warning দেখাবে: **"এইটা মহিলা নাম মনে হচ্ছে — Gender কি মহিলা হবে?"** + এক ক্লিকে "মহিলা করুন" button।
  - Warning শুধু সতর্ক করবে, submit block করবে না (কারণ কিছু নাম unisex হতে পারে)।

## Technical details
- SQL migration: `UPDATE public.donors SET gender='female' WHERE is_visible=false AND gender='male' AND (name ILIKE any of female patterns)` — শুধু explicitly female-pattern মেলা row-গুলো।
- `genderDetect.ts`: lowercase normalize করে suffix array + first-name set দিয়ে `looksFemale(name): boolean` return করবে।
- UI: Select-এর নিচে ছোট amber warning text + ghost button, existing form flow তে কোনো পরিবর্তন নেই।

## Verification
- Update-এর পর query দিয়ে কত row বদলালো count করব।
- Form-এ female নাম + পুরুষ select করে warning দেখা যাচ্ছে কিনা check করব।
