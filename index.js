/**
 * ระบบแจ้งเตือนป้ายราคาโปรโมชั่นที่หมดอายุ/ค้างอยู่ ผ่านอีเมล
 * รันอัตโนมัติทุกวัน เวลา 07:00 (Asia/Bangkok) โดยไม่ต้องมีใครเปิดแอป
 *
 * ตั้งค่าก่อนใช้งาน (ดูขั้นตอนแนบท้าย):
 *   firebase functions:secrets:set MAIL_USER
 *   firebase functions:secrets:set MAIL_PASS
 * แล้ว deploy ด้วย: firebase deploy --only functions
 */

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const nodemailer = require("nodemailer");

initializeApp();

// ปลายทางอีเมลที่จะรับแจ้งเตือน
const NOTIFY_TO = "RSOA1@cpaxtra.co.th";

// คืนวันที่ปัจจุบันตามเวลาไทย ในรูปแบบ YYYY-MM-DD (ให้ตรงกับ endDate ที่แอปเก็บไว้)
function todayStr() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

async function runCheckAndNotify() {
  const db = getDatabase();
  const snap = await db.ref("promos").get();
  const val = snap.val() || {};
  const today = todayStr();

  // เงื่อนไขเดียวกับที่แอปใช้ตัดสินว่า "หมดอายุวันนี้/ค้างอยู่": ยังไม่เก็บป้าย (status !== 'done') และวันหมดอายุถึงแล้ว
  // และยังไม่เคยส่งอีเมลแจ้งเตือนสำหรับ "วันนี้" ของรายการนี้มาก่อน (กันส่งซ้ำถ้าฟังก์ชันรันซ้ำ)
  const items = Object.keys(val)
    .map((id) => ({ id, ...val[id] }))
    .filter((p) => p.status !== "done" && p.endDate && p.endDate <= today && p.emailNotifiedDate !== today);

  if (items.length === 0) {
    console.log("ไม่มีรายการที่ต้องแจ้งเตือนวันนี้");
    return { sent: 0 };
  }

  const rows = items.map((p) => `
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(p.name || "ไม่ระบุชื่อ")}</td>
      <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(p.area || "-")}</td>
      <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(p.startDate)} &rarr; ${escapeHtml(p.endDate)}</td>
      <td style="padding:8px;border:1px solid #ddd;">${p.endDate < today ? "ค้างเกินกำหนด" : "หมดอายุวันนี้"}</td>
    </tr>`).join("");

  const html = `
    <div style="font-family:'Segoe UI',sans-serif;">
      <h2 style="color:#E63950;margin-bottom:4px;">แจ้งเตือนป้ายราคาโปรโมชั่นที่หมดอายุ/ค้างอยู่</h2>
      <p style="color:#555;">วันที่ ${today} — พบรายการที่ยังไม่เก็บป้ายทั้งหมด ${items.length} รายการ</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px;">
        <thead>
          <tr style="background:#f3f3f3;">
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">ชื่อโปรโมชั่น</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">พื้นที่/สาขา</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">วันที่เริ่ม &rarr; หมดอายุ</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">สถานะ</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:18px;color:#999;font-size:12px;">อีเมลนี้ส่งอัตโนมัติจากระบบป้ายราคาโปรโมชั่น (inventoryaudit999-collab.github.io/Promotion)</p>
    </div>`;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"ระบบป้ายราคาโปรโมชั่น" <${process.env.MAIL_USER}>`,
    to: NOTIFY_TO,
    subject: `[แจ้งเตือน] ป้ายราคาโปรโมชั่นหมดอายุ/ค้างอยู่ ${items.length} รายการ (${today})`,
    html,
  });

  // บันทึกว่าส่งแจ้งเตือนของวันนี้ให้รายการเหล่านี้แล้ว กันส่งซ้ำ
  const updates = {};
  items.forEach((p) => {
    updates[`${p.id}/emailNotifiedDate`] = today;
  });
  await db.ref("promos").update(updates);

  console.log(`ส่งอีเมลแจ้งเตือนสำเร็จ จำนวน ${items.length} รายการ`);
  return { sent: items.length };
}

// รันอัตโนมัติทุกวัน 07:00 เวลาไทย
exports.checkExpiringPromos = onSchedule(
  {
    schedule: "0 7 * * *",
    timeZone: "Asia/Bangkok",
    secrets: ["MAIL_USER", "MAIL_PASS"],
  },
  async () => {
    await runCheckAndNotify();
  }
);

// เอนด์พอยต์สำหรับทดสอบด้วยมือ (เปิดลิงก์เพื่อสั่งรันทันที โดยไม่ต้องรอถึง 07:00)
// แนะนำให้ลบหรือปิดการเข้าถึงเอนด์พอยต์นี้หลังทดสอบเสร็จ เพื่อความปลอดภัย
exports.testCheckExpiringPromos = onRequest(
  { secrets: ["MAIL_USER", "MAIL_PASS"] },
  async (req, res) => {
    try {
      const result = await runCheckAndNotify();
      res.status(200).send(`OK: ส่งอีเมลแจ้งเตือน ${result.sent} รายการ`);
    } catch (err) {
      console.error(err);
      res.status(500).send(`ERROR: ${err.message}`);
    }
  }
);
