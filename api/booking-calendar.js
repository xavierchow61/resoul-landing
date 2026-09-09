/**
 * Resoul 預約 → 商戶 Google Calendar（Vercel Serverless Function）
 *
 * 前端 POST /api/booking-calendar，這裡用 Google service account 建立日曆事件。
 * 需要 Vercel Environment Variables：
 *   GCAL_CLIENT_EMAIL  — service account 的 client_email
 *   GCAL_PRIVATE_KEY   — service account 的 private_key（\n 可用字面 \\n）
 *   GCAL_CALENDAR_ID   — 目標日曆 ID（將該日曆分享俾上面 email，權限「變更活動」）
 * 未設定時直接回 { skipped:true }，屬 best-effort，不會阻塞預約流程。
 */

const crypto = require("crypto");

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

async function getAccessToken(clientEmail, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/calendar.events",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = b64url(JSON.stringify(header)) + "." + b64url(JSON.stringify(claim));
  const signature = crypto
    .sign("RSA-SHA256", Buffer.from(unsigned), privateKey)
    .toString("base64url");
  const jwt = unsigned + "." + signature;

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:
      "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=" +
      encodeURIComponent(jwt),
  });
  const data = await r.json();
  if (!data.access_token) throw new Error("token_failed: " + JSON.stringify(data));
  return data.access_token;
}

function ymd(d) {
  return d.toISOString().slice(0, 10);
}

// 穩健處理 private key：去除前後引號、還原 \n / \r，令 OpenSSL 讀得到 PEM
function normalizeKey(k) {
  k = (k || "").trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1);
  }
  return k.replace(/\\r/g, "").replace(/\\n/g, "\n").trim();
}

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "method_not_allowed" }); return; }

  let email = process.env.GCAL_CLIENT_EMAIL;
  let rawKey = process.env.GCAL_PRIVATE_KEY;
  let calId = process.env.GCAL_CALENDAR_ID;
  // 最防呆：喺 Vercel 設一個 GCAL_SA_JSON = 成個 service account JSON 檔內容，
  // 由 JSON.parse 自動處理換行（徹底避開 private key 格式問題）。
  const saJson = process.env.GCAL_SA_JSON;
  if (saJson) {
    try {
      const sa = JSON.parse(saJson);
      email = sa.client_email || email;
      rawKey = sa.private_key || rawKey;
      calId = calId || sa.calendar_id;
    } catch (e) {
      res.status(200).json({ ok: false, detail: "bad_sa_json" });
      return;
    }
  }
  // 未配置 → best-effort 略過，唔阻塞預約
  if (!email || !rawKey || !calId) { res.status(200).json({ skipped: true }); return; }

  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};

  const euth = b.type === "euthanasia" || b.source === "web:euthanasia";
  const title =
    (euth ? "🕊️ 安樂死預約（待確認）— " : "🕯️ 火化預約（待確認）— ") +
    (b.name || "未具名");
  const desc = [
    "來源：" + (euth ? "安樂死" : "火化"),
    "主人：" + (b.name || ""),
    "電話：" + (b.phone || ""),
    b.plan ? "方案：" + b.plan : null,
    "寵物：" + (b.pet || ""),
    "希望時段：" + (b.time || "—"),
    b.place ? "地點：" + b.place : null,
    (b.note || b.cond) ? "備註：" + (b.note || b.cond) : null,
  ].filter(Boolean).join("\n");

  // 有日期用該日；否則今日。全日事件 end.date 為翌日（exclusive）。
  const start = b.date && /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? b.date : ymd(new Date());
  const endDate = new Date(start + "T00:00:00Z");
  endDate.setUTCDate(endDate.getUTCDate() + 1);

  try {
    const token = await getAccessToken(email, normalizeKey(rawKey));
    const url =
      "https://www.googleapis.com/calendar/v3/calendars/" +
      encodeURIComponent(calId) +
      "/events";
    const gr = await fetch(url, {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: title,
        description: desc,
        start: { date: start },
        end: { date: ymd(endDate) },
      }),
    });
    if (!gr.ok) {
      const t = await gr.text();
      console.error("[Resoul] calendar insert failed HTTP " + gr.status + ": " + t);
      res.status(200).json({ ok: false, detail: "calendar_error" });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[Resoul] booking-calendar error:", err && err.message);
    res.status(200).json({ ok: false, detail: "exception" });
  }
};
