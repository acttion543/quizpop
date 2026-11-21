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
- เวลาตอบเริ่มต้น: **20 วินาทีต่อข้อ** แอดมินแก้ไขได้จากคลังควิซ
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
- ปุ่มออกจากห้องรอก่อนเริ่มสอบ: ลบชื่อจากรายชื่อผู้สอบ และยังเข้าร่วมใหม่ได้หากห้องยังไม่เริ่ม
- เปลี่ยนชื่อเล่นในห้องรอหรือระหว่างสอบ: อัปเดตชื่อให้ทุกหน้าจออัตโนมัติ โดยใช้บัญชีและคะแนนเดิม ชื่อยาว 1–20 ตัวอักษรและต้องไม่ซ้ำผู้เล่นอื่น
- เมื่อเริ่มสอบแล้ว การกลับหน้าหลักจะคงประวัติคำตอบและคะแนนไว้ ส่วนชื่อจะเปลี่ยนไม่ได้หลังจบเกม
- ห้องสอบสูงสุด 50 ผู้ตอบ เปิดใช้งานผ่านเว็บได้นาน 6 ชั่วโมง
- นับเวลาบนเซิร์ฟเวอร์ คิดคะแนนตามความถูกต้องและความเร็ว (500–1,000 คะแนนสำหรับคำตอบถูก)
- ป้องกันตอบซ้ำ ส่งคำตอบของข้อเก่า ตอบหลังหมดเวลา และกดควบคุมจากสถานะเกมเก่า
- ซ่อนเฉลย ผลคะแนนของข้อนั้น และผลตอบของคนอื่นจนกว่าจะเฉลย
- กดตอบแล้วล็อกตัวเลือกและแสดงสถานะกำลังส่งทันที ยืนยันว่าบันทึกแล้วหลังเซิร์ฟเวอร์ตอบกลับ พร้อมส่งซ้ำเฉพาะตัวเลือกเดิมเมื่อเครือข่ายขัดข้อง
- หน้าสรุปเปิดอันดับ 3 → 2 → 1 คะแนนวิ่งและเอฟเฟกต์ฉลอง มีปุ่มแสดงผลทันที รองรับ reduced motion และแสดงอันดับร่วมเมื่อคะแนนเท่ากัน
- กระดานอันดับ สรุปผล และส่งออก CSV
- รองรับมือถือ และการใช้คีย์บอร์ดในหน้าต่างโต้ตอบ

การส่งคำตอบคืน snapshot ที่กรองข้อมูลแล้วจาก transaction เดียว จึงไม่ต้องเรียก GET ซ้ำก่อนเปลี่ยนหน้าจอ มี revision ต่อห้องเพื่อกันผลตอบเก่าหรือ polling ที่มาช้าทับคำตอบที่บันทึกแล้ว คะแนนและเวลาใช้เซิร์ฟเวอร์เหมือนเดิม เมื่อจบเกมหยุด polling และหยุด timer ที่ไม่จำเป็น

หน้ารอสอบดึงข้อมูลทุก 4 วินาที ส่วนในห้องเกมใช้ Firestore listener ผ่าน authenticated SSE
ที่ /api/game/events ส่งเฉพาะ publicRoom ตามสิทธิ์และ UID ของผู้ใช้ เมื่อคนสุดท้ายตอบ
ทุกจอได้รับ reveal ทันทีที่ฐานข้อมูลส่งการเปลี่ยนแปลง และ server มี timer ส่งเฉลยเมื่อหมดเวลา
โดยไม่รอผู้เล่นกดหรือรอบ polling เฉลยและคะแนนยังไม่ส่งก่อนเวลา
เมื่อ stream ขัดข้องจะใช้ GET ทุก 1.5 วินาทีชั่วคราว พร้อมเชื่อมต่อใหม่และ refresh ตรง deadline
ปิด stream เมื่อจบเกม/ซ่อนแท็บ/ออกจากห้อง และเชื่อมต่อพร้อมตรวจ token ใหม่ทุก 4 นาที

ใช้เสียงตลอดการเล่น ไม่มีปุ่มปิดเสียงหรือ slider ในเว็บตามคำขอเจ้าของ
ไม่อ่านค่า quizpop:music เก่าอีก เพื่อไม่ให้สถานะ mute/volume=0 จากเวอร์ชันก่อนทำให้เครื่องเงียบ
ปรับหรือปิดเสียงผ่านตัวเครื่อง/เบราว์เซอร์ได้ตามปกติ เว็บไม่สามารถบังคับเพิ่มระดับเสียงของเครื่องหรือข้าม autoplay policy ของ Safari

GameAudioProvider วาง audio element ตัวเดียวไว้ใน root layout ก่อนเข้าห้อง
ปุ่มเข้าร่วม/สร้างห้อง/ทดลองเล่นเรียก play() ใน user gesture เดิมก่อน await API
จึงไม่ต้องสร้างเครื่องเล่นใหม่หลังรอเครือข่าย เพลงเล่นต่อผ่านหน้ารอ คำถาม เฉลย ผลคะแนน
และการเปลี่ยนห้องภายในเว็บ เมื่อออกจากเว็บจะคืนทรัพยากรเสียง
ถ้าเข้า URL ห้องโดยตรงหรือ Safari บล็อก autoplay ต้องแตะ **เปิดเสียงและเข้าเกม**
หน้าพร้อมเล่นจะปิดหลังเกิด timeupdate และเวลาเล่นเคลื่อนไปจริง ไม่ใช่อาศัยเพียงปุ่มที่ขึ้นว่าเปิด
เมื่อกลับจากพักแอปจะพยายามเล่นต่อ และมีปุ่มทดสอบเสียงอีกครั้งที่ไม่เปลี่ยนเป็น mute

ใช้ MP3 128 kbps / 44.1 kHz เป็นแหล่งหลักที่ /audio/quizpop-suspense-v3.mp3
หลังผู้ใช้รายงานว่า iPhone เปิด WAV เดิมโดยตรงไม่ได้
กำหนด Content-Type: audio/mpeg สำหรับ MP3 และ audio/wav สำหรับ WAV fallback อย่างชัดเจน
ทดสอบ byte-range 206 บน Vercel เพื่อรองรับการอ่านสื่อของ Safari
ไม่มีการโหลดเพลงจากบริการภายนอก เร่ง playbackRate เฉพาะช่วง 5 วินาทีสุดท้ายโดยไม่เริ่มไฟล์ใหม่
สร้าง WAV ต้นฉบับซ้ำได้ด้วย node scripts/generate-quiz-music.cjs และแปลง MP3 ด้วย ffmpeg:

```powershell
ffmpeg -i public/audio/quizpop-suspense-v2.wav -af volume=4dB -codec:a libmp3lame -b:a 128k -ar 44100 -ac 2 -id3v2_version 3 public/audio/quizpop-suspense-v3.mp3
```
ชุด Dear Boss ในฐานข้อมูลจริงปรับทั้ง 10 ข้อจาก 30 เป็น 20 วินาทีแล้ว
ห้องที่กำลังเล่นก่อนอัปเดตยังใช้ deadline เดิมจนจบ เพื่อไม่ตัดเวลาคนที่กำลังตอบ

## Google Login บน Safari / iPad และลิงก์จาก LINE

Production ใช้ NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=quizpop-sandy.vercel.app และ reverse proxy
/__/auth/:path* ไปยัง quizpop-543-261121.firebaseapp.com ผ่าน next.config.ts
เพื่อให้หน้าเว็บและ Firebase helper ใช้ storage บน origin เดียวกัน ตาม
[Firebase redirect best practices — Option 3](https://firebase.google.com/docs/auth/web/redirect-best-practices#option-3-proxy-auth-requests-to-firebaseappcom)

มือถือ รวมถึง iPad ที่ใช้ desktop user agent จะใช้ signInWithRedirect เมื่อ authDomain ตรงกับ hostname เท่านั้น
ส่วน desktop ใช้ popup และมีปุ่มใช้แท็บเดิมเมื่อเกิดข้อผิดพลาด
getRedirectResult ทำงานก่อนเริ่มตรวจบัญชี จึงรับผลหลังกลับจาก Google ได้โดยคง URL เดิมและ PIN เชิญไว้

หากตรวจพบ user agent ของ LINE / Facebook / Instagram จะแนะนำเปิด Safari หรือ Chrome
พร้อมลิงก์คัดลอกที่เก็บเส้นทาง /admin และ PIN โดยตัด OAuth query/hash ออก
การตรวจ user agent ใช้เพื่อแสดง UI เท่านั้น การตรวจสิทธิ์ยังยึด Firebase token ที่ server

เมื่อเปลี่ยนโดเมน production ต้องทำให้ครบก่อน deploy:

1. เพิ่มโดเมนใน Firebase Authentication > Settings > Authorized domains
2. เพิ่ม https://<โดเมน>/__/auth/handler ใน Google OAuth authorized redirect URIs
   หรือ firebase.json แล้วรัน firebase deploy --only auth --project <project-id>
3. ตั้ง NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ให้ตรงกับโดเมนเว็บ แล้ว build/deploy ใหม่
4. คง transparent proxy GET/POST สำหรับ /__/auth/* และ X-Frame-Options: SAMEORIGIN เฉพาะ helper
   หน้าแอปอื่นยังใช้ DENY และ auth helper ใช้ Cache-Control: no-store

การเปิดลิงก์ Firebase callback โดยตรงหรือย้ายเบราว์เซอร์กลางทางจะไม่มี initial state
ให้กลับมาเริ่มที่ลิงก์ QuizPop ในเบราว์เซอร์ที่จะใช้ตลอดขั้นตอนแทน
ยังต้องยืนยัน Google Login บน iPad เครื่องที่พบปัญหาจริงอีกครั้ง

## โครงสร้าง

- app/page.tsx — แดชบอร์ดแอดมิน ตัวแก้ไขควิซ และหน้าจอเกม
- app/admin/page.tsx — เส้นทางแอดมิน
- components/auth-portal.tsx — Google Login, ตรวจบทบาท และหน้ารอสอบ
- app/api/account/route.ts — ตรวจบัญชีและบทบาท
- app/api/game/route.ts — ห้องสอบ คลังควิซ การส่งคำตอบ และสิทธิ์ควบคุม
- components/answer-panel.tsx — ตอบสนองต่อการเลือกทันทีและติดตามการส่งคำตอบ
- components/game-results.tsx — โพเดียม ผลส่วนตัว และกระดานคะแนนใหม่
- lib/room-snapshot.ts — ป้องกันคำตอบและสถานะเก่าทับสถานะที่ใหม่กว่า
- app/api/game/events/route.ts, lib/room-events.ts — Firestore listener และ SSE ตามสิทธิ์ผู้ใช้ พร้อม timer เฉลย
- lib/read-room-events.ts — อ่าน stream และจัดการ UTF-8/chunk บน browser
- components/game-audio-provider.tsx — เครื่องเล่นเสียงกลางที่เริ่มจากการแตะเข้าห้องก่อน await API
- components/game-music.tsx, lib/quiz-music.ts — หน้าเริ่มเสียงครั้งแรกและเพลงคลอต่อเนื่องผ่าน HTML audio
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
| NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | โดเมนเว็บ production ที่ proxy auth helper |
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
- ทดสอบ UI ด้วยข้อมูลสมมติ: เครือข่ายช้า 6 วินาที แสดง feedback หลังเลือกประมาณ 3–7 ms บนเครื่องทดสอบ รวมกรณีส่งไม่สำเร็จ ส่งซ้ำ และเปลี่ยนข้อระหว่างรอ
- ตรวจหน้าสรุปที่ความกว้าง 390px ไม่มีแนวนอนล้นจอ และตรวจผู้เล่น 0/1/2/หลายคน/คะแนนเสมอกัน
- unit tests 50 รายการผ่าน (รวมการส่งเฉลยผ่าน SSE หลังคนสุดท้ายตอบ, เฉลยที่ 20 วินาทีโดยไม่ต้องมี GET/write เพิ่ม, ปิด listener, ตรวจสิทธิ์ และ UTF-8 แบบแบ่ง chunk) ครอบคลุมการเล่นตั้งแต่เริ่มจนจบ คะแนน เวลา ตอบซ้ำ ปกปิดเฉลย ห้องหมดอายุ และสิทธิ์แอดมิน
- ทดสอบ local HTTP SSE ด้วย 2 ผู้เล่นจำลอง: เฉลยเมื่อคนสุดท้ายตอบและเมื่อครบ 20 วินาที, หน้าเริ่มเสียงครั้งแรก, MP3 เล่นจริงและเวลาเดิน, เพลงเล่นต่อข้ามเฉลย/จบเกม และไม่มีปุ่ม mute/slider ในเว็บ และหน้าจอมือถือ 390px
- ตรวจ HTTP บน production: / และ /admin ตอบ 200, status แจ้ง configured=true, API ห้องสอบที่ไม่เข้าสู่ระบบตอบ 401
- Google provider เปิดใช้งานแล้ว และตั้ง Authorized domains สำหรับโดเมน production แล้ว
- เจ้าของบัญชียืนยันว่าเข้าสู่หน้าแอดมินด้วย Google ได้
- ยังไม่ได้ยืนยันการสอบเต็มรอบด้วยหลายบัญชีจริงพร้อมกัน การตรวจ Chrome เพิ่มเติมหยุดเพราะเครื่องมือยืนยัน URL ของหน้าต่างไม่ได้

## เอกสารอ้างอิง

- [Firebase Google Sign-in](https://firebase.google.com/docs/auth/web/google-signin)
- [Firebase ID token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
- [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions)
- [Vercel deployment](https://vercel.com/docs/projects/deploy-from-cli)
