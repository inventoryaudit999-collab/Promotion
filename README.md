# ระบบแจ้งเตือนป้ายราคาโปรโมชั่น (Firebase + GitHub Pages)

## 1) ตั้งค่า Firebase Realtime Database Rules
ไปที่ Firebase Console → โปรเจกต์ `promotion-5e0cc` → Realtime Database → แท็บ **Rules**
วางกฎนี้แล้วกด Publish (เปิดให้อ่าน/เขียนได้ทุกคนที่มีลิงก์เว็บนี้ — เหมาะกับใช้งานภายในทีมเท่านั้น):

```json
{
  "rules": {
    "promos": {
      ".read": true,
      ".write": true
    }
  }
}
```

หมายเหตุความปลอดภัย: กฎนี้ไม่มีการยืนยันตัวตน ใครก็ตามที่รู้ URL ของเว็บสามารถเขียนข้อมูลได้
ถ้าต้องการความปลอดภัยเพิ่มเติมในอนาคต แนะนำเปิด Firebase Authentication (เช่น อีเมล/รหัสผ่านของทีม)
แล้วเปลี่ยนกฎเป็น `"auth != null"` แทน `true`

## 2) อัปโหลดขึ้น GitHub
1. สร้าง repository ใหม่บน https://github.com/new (เช่นชื่อ `promo-tag-tracker`)
2. อัปโหลดไฟล์ `index.html` ในหน้า repo (ปุ่ม "Add file" → "Upload files") หรือใช้คำสั่ง:
   ```
   git init
   git add index.html
   git commit -m "Promotion tag tracker"
   git branch -M main
   git remote add origin https://github.com/<ชื่อผู้ใช้>/promo-tag-tracker.git
   git push -u origin main
   ```

## 3) เปิดใช้งานผ่าน GitHub Pages (เว็บพร้อมใช้ทันที)
1. ไปที่ repo → Settings → Pages
2. Source เลือก "Deploy from a branch" → Branch เลือก `main` / `/(root)` → Save
3. รอ 1-2 นาที จะได้ลิงก์แบบ `https://<ชื่อผู้ใช้>.github.io/promo-tag-tracker/`
4. เข้าลิงก์นี้ได้ทั้งมือถือ/PC/แท็บเล็ต ข้อมูล sync กันแบบเรียลไทม์ผ่าน Firebase ทุกเครื่อง

## บัญชีเข้าใช้งาน
| ชื่อผู้ใช้ | รหัสผ่าน | สิทธิ์ |
|---|---|---|
| `st11` | `st11` | พนักงาน — เปลี่ยนสถานะรายการได้ |
| `admin11` | `admin11` | ผู้ดูแลระบบ — เพิ่ม/ลบ/แก้ไขรายการได้ทั้งหมด |

แก้ไข/เพิ่มบัญชีได้ในไฟล์ `index.html` ที่ตัวแปร `USERS`

⚠️ นี่คือการตรวจรหัสผ่านฝั่งหน้าเว็บ (client-side) เท่านั้น ไม่ใช่ระบบยืนยันตัวตนระดับเซิร์ฟเวอร์ เหมาะกับกันคนนอกเข้าใช้งานผิดพลาดในทีมภายใน แต่ผู้ที่เปิดดูซอร์สโค้ดของเว็บจะเห็นรหัสผ่านได้ ถ้าต้องการความปลอดภัยจริงจัง แนะนำเปลี่ยนไปใช้ Firebase Authentication แทน
