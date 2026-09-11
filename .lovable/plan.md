# QR দিয়ে Instant Donor Registration

## কী তৈরি হবে
- Donor box-এর title-এর পাশে ছোট, সবসময় দেখা যায় এমন QR code থাকবে।
- QR-তে tap/click করলে বড় preview ও **Download QR** button পাওয়া যাবে; PNG হিসেবে save/print করা যাবে।
- QR scan করলে একটি public donor registration page খুলবে—login লাগবে না।
- Form-এ থাকবে: নাম, gender select, phone number, blood group select এবং submit button।
- সফল submit হলে পরিষ্কার confirmation দেখাবে এবং donor list refresh হবে।

## Offline আচরণ
- App-এর existing PWA cache ব্যবহার করে QR registration page আগে একবার খোলা থাকলে পরে internet ছাড়াও form খোলা যাবে।
- Offline অবস্থায় submit করলে তথ্য device-এ নিরাপদ local queue-তে থাকবে এবং “internet এলে জমা হবে” status দেখাবে।
- Internet ফিরে এলে queued registration automatic database-এ submit হবে; duplicate phone হলে user-friendly status দেখাবে।
- নতুন device-এ QR scan করার মুহূর্তে একেবারেই internet না থাকলে website প্রথমবার download করা সম্ভব নয়—এটি browser-এর স্বাভাবিক সীমাবদ্ধতা।

## Technical details
- Dedicated public route (যেমন `/join-donor`) যোগ করে AuthGate-এ এটিকে public করা হবে।
- একই validation rules রাখা হবে: নাম minimum 2 characters, Bangladesh mobile format, valid blood group ও gender।
- QR current published origin-এর public route encode করবে, তাই preview ও live site—দুই জায়গাতেই সঠিক link হবে।
- QR generation client-side হবে; কোনো নতুন database table লাগবে না।
- Offline queue local storage-এ রাখা হবে এবং `online` event-এ retry হবে; একই phone একাধিকবার submit হওয়া ঠেকাতে duplicate check থাকবে।
- Desktop ও mobile-এ QR, modal, form, offline/sync states এবং download flow যাচাই করা হবে।
