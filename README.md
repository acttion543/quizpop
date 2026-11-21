# QuizPop!

เว็บสอบสดภาษาไทยด้วย Next.js, Firebase Authentication และ Cloud Firestore เผยแพร่บน Vercel

## ลิงก์ใช้งาน

- ผู้ตอบคำถาม: https://quizpop-sandy.vercel.app
- ผู้ดูแลระบบ: https://quizpop-sandy.vercel.app/admin
- บัญชีแอดมิน: acttion543@gmail.com
- Firebase Console: https://console.firebase.google.com/project/quizpop-543-261121/overview
- Vercel: https://vercel.com/acttion543-4489/quizpop

## ชุดข้อสอบ Dear Boss

- Repository: https://github.com/acttion543/quizpop
- ชื่อชุด: **Dear Boss — Vocabulary in Context**
- มีคำถามภาษาอังกฤษ 10 ข้อตามที่เจ้าของเว็บให้มา
- เฉลย: **B, C, B, C, B, C, B, C, B, C**
- เวลาตอบเริ่มต้น: **30 วินาทีต่อข้อ** แอดมินแก้ไขได้จากคลังควิซ
- ชุดนี้เก็บใน Firestore และใช้เป็นควิซหลักของปุ่มเริ่มจัดเกม
- ข้อมูลต้นฉบับ: [data/dear-boss.json](data/dear-boss.json)

หากติดตั้งฐานข้อมูลใหม่ ตั้ง Firebase Admin credentials ตาม .env.example แล้วนำเข้าด้วย:

```powershell
npm run seed:dear-boss
```

คำสั่งจะเก็บควิซเดิมไว้หากมีอยู่แล้ว หากตั้งใจแทนที่ควิซเดิมด้วยข้อมูลในไฟล์ ให้ใช้ npm run seed:dear-boss -- --force

## วิธีจัดสอบ

1. แอดมินเปิด /admin แล้วเข้าสู่ระบบด้วย Google
2. เลือกชุดคำถามตัวอย่าง หรือกด “สร้างควิซ” ใส่โจทย์ 4 ตัวเลือก เลือกเฉลยและเวลาตอบ แล้วบันทึก
3. กด “เปิดห้องเล่นกับเพื่อน” เพื่อรับ PIN 6 หลัก หรือคัดลอกลิงก์เชิญ
4. ผู้ตอบเข้าหน้าหลัก เข้าสู่ระบบด้วย Google ตั้งชื่อเล่น แล้วเลือกห้องหรือกรอก PIN
5. เมื่อทุกคนพร้อม แอดมินกดเริ่มเกม ระบบใช้เวลาเริ่มจากเซิร์ฟเวอร์ร่วมกันทุกคน
6. ระบบเฉลยเมื่อหมดเวลา ทุกคนตอบครบ หรือแอดมินกดเฉลย จากนั้นแอดมินกดคำถามถัดไป
7. เมื่อจบเกมจะแสดงอันดับ แอดมินดาวน์โหลดคะแนน CSV ได้

ผู้ดูแลสามารถกลับไปควบคุมห้องเดิมจากรายการ “ห้องสอบที่คุณเปิดไว้” ผู้ตอบที่เคยเข้าร่วมสามารถกลับเข้าห้องเดิมด้วยบัญชี Google เดิมได้

## ระบบที่มี

- Google Sign-in ผ่าน Firebase ตรวจ Firebase ID token และสถานะบัญชีบนเซิร์ฟเวอร์
- แอดมินกำหนดจาก ADMIN_EMAILS ใน Vercel เท่านั้น ผู้ใช้แก้สิทธิ์เองจากหน้าเว็บไม่ได้
- ควิซตัวอย่าง 4 ชุด และตัวสร้างควิซ 1–30 คำถาม
- คลังควิซของผู้ดูแลบันทึกบน Firestore
- แยกหน้ารอสอบของผู้ตอบกับแดชบอร์ดแอดมิน
- ห้องสอบสูงสุด 50 ผู้ตอบ เปิดใช้งานผ่านเว็บได้นาน 6 ชั่วโมง
- นับเวลาบนเซิร์ฟเวอร์ คิดคะแนนตามความถูกต้องและความเร็ว (500–1,000 คะแนนสำหรับคำตอบถูก)
- ป้องกันตอบซ้ำ ส่งคำตอบของข้อเก่า ตอบหลังหมดเวลา และกดควบคุมจากสถานะเกมเก่า
- ซ่อนเฉลย ผลคะแนนของข้อนั้น และผลตอบของคนอื่นจนกว่าจะเฉลย
- กระดานอันดับ สรุปผล และส่งออก CSV
- รองรับมือถือ และการใช้คีย์บอร์ดในหน้าต่างโต้ตอบ

หน้ารอสอบดึงข้อมูลทุก 4 วินาที หน้าห้องเกมดึงทุก 1.5 วินาที จึงอาจมีระยะอัปเดตสั้น ๆ ต่างกันระหว่างเครื่อง เวลาตอบจริงและคะแนนยึดเซิร์ฟเวอร์เดียวกัน

## โครงสร้าง

- app/page.tsx — แดชบอร์ดแอดมิน ตัวแก้ไขควิซ และหน้าจอเกม
- app/admin/page.tsx — เส้นทางแอดมิน
- components/auth-portal.tsx — Google Login, ตรวจบทบาท และหน้ารอสอบ
- app/api/account/route.ts — ตรวจบัญชีและบทบาท
- app/api/game/route.ts — ห้องสอบ คลังควิซ การส่งคำตอบ และสิทธิ์ควบคุม
- lib/engine.ts — กติกาและคะแนน
- lib/store.ts — Firestore และ transactions
- lib/auth-server.ts — ตรวจ Firebase token และอีเมลแอดมิน
- lib/firebase-client.ts — Firebase web SDK และ Google Sign-in
- firestore.rules — ปิดการอ่าน/เขียนจาก browser SDK โดยตรง ทุกคำขอผ่าน API ที่ตรวจสิทธิ์
- tests/ — ชุดทดสอบกติกาและสิทธิ์

Firestore ใช้คอลเลกชัน quizpopQuizzes, quizpopRooms และ quizpopLimits ห้องและ rate-limit มีวันหมดอายุสำหรับการตรวจในแอป การหมดอายุไม่ได้ลบเอกสารออกจากฐานข้อมูลอัตโนมัติ

## พัฒนาและ deploy ต่อ

ต้องมี Node.js 22 ขึ้นไป และ npm

```powershell
npm ci
npm test
npm run typecheck
npm run build
```

สำหรับทดสอบ Google Login บนเครื่อง คัดลอก .env.example เป็น .env.local แล้วตั้งค่า Firebase ของเจ้าของโปรเจกต์ก่อนรัน npm run dev ห้าม commit .env.local หรือ service-account key

ค่าที่ใช้ใน Vercel:

| ตัวแปร                            | หน้าที่                              |
| -------------------------------- | --------------------------------- |
| NEXT_PUBLIC_FIREBASE_API_KEY     | Firebase Web API key              |
| NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | โดเมน Firebase Authentication     |
| NEXT_PUBLIC_FIREBASE_PROJECT_ID  | Firebase project ID สำหรับ browser |
| NEXT_PUBLIC_FIREBASE_APP_ID      | Firebase Web app ID               |
| FIREBASE_PROJECT_ID              | Firebase project ID สำหรับ server  |
| FIREBASE_CLIENT_EMAIL            | บัญชีบริการของ server                |
| FIREBASE_PRIVATE_KEY             | เก็บเป็น Vercel Secret              |
| ADMIN_EMAILS                     | อีเมลแอดมิน คั่นหลายบัญชีด้วย comma      |

โปรเจกต์จริงตั้งค่าตัวแปรทั้งหมดไว้ใน Vercel Production และ Preview แล้ว private key ไม่รวมอยู่ในซอร์สหรือ ZIP

สำหรับอัปเดตเว็บ ใช้ Vercel CLI ของเจ้าของบัญชี:

```powershell
npx vercel login
npx vercel link --yes --project quizpop
npx vercel deploy --prod
```

ถ้าเปลี่ยนโดเมน ให้เพิ่มโดเมนนั้นใน Firebase Authentication > Settings > Authorized domains ด้วย
ถ้าเพิ่มแอดมิน ให้แก้ ADMIN_EMAILS ใน Vercel แล้ว redeploy

Firebase project: quizpop-543-261121
Firebase Web app: 1:438943159265:web:0e6299ac9677c67ad838a0
Firestore: Standard, asia-southeast1
Service account: quizpop-server@quizpop-543-261121.iam.gserviceaccount.com
สิทธิ์ของ service account: roles/datastore.user และ roles/firebaseauth.viewer

## การตรวจสอบ

- production build ผ่านทั้งในเครื่องและ Vercel
- unit tests 14 รายการผ่าน ครอบคลุมการเล่นตั้งแต่เริ่มจนจบ คะแนน เวลา ตอบซ้ำ ปกปิดเฉลย ห้องหมดอายุ และสิทธิ์แอดมิน
- ตรวจ HTTP บน production: / และ /admin ตอบ 200, status แจ้ง configured=true, API ห้องสอบที่ไม่เข้าสู่ระบบตอบ 401
- Google provider เปิดใช้งานแล้ว และตั้ง Authorized domains สำหรับโดเมน production แล้ว
- เจ้าของบัญชียืนยันว่าเข้าสู่หน้าแอดมินด้วย Google ได้
- ยังไม่ได้ยืนยันการสอบเต็มรอบด้วยหลายบัญชีจริงพร้อมกัน การตรวจ Chrome เพิ่มเติมหยุดเพราะเครื่องมือยืนยัน URL ของหน้าต่างไม่ได้

## เอกสารอ้างอิง

- [Firebase Google Sign-in](https://firebase.google.com/docs/auth/web/google-signin)
- [Firebase ID token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
- [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions)
- [Vercel deployment](https://vercel.com/docs/projects/deploy-from-cli)
