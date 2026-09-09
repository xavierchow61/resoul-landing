/**
 * Resoul 預約 → 商戶 Google Calendar（Vercel Serverless Function）
 *
 * 用 OAuth refresh token（非 service account key，避開組織政策
 * iam.disableServiceAccountKeyCreation 限制）。
 *
 * 需要 Vercel Environment Variables：
 *   GCAL_CLIENT_ID      — OAuth 用戶端 ID
 *   GCAL_CLIENT_SECRET  — OAuth 用戶端密鑰
 *   GCAL_REFRESH_TOKEN  — 一次性授權取得的 refresh token
 *   GCAL_CALENDAR_ID    — 目標日曆 ID（可用 "primary" 表示授權帳戶的主日曆）
 * 未設定時直接回 { skipped:true }，屬 best-effort，不會阻塞預約流程。
 */

async function getAccessToken() {
  const params = new URLSearchParams({
    client_id: process.env.GCAL_CLIENT_ID,
    client_secret: process.env.GCAL_CLIENT_SECRET,
    refresh_token: process.env.GCAL_REFRESH_TOKEN,
    grant_type: "refresh_token",
  });
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const data = await r.json();
  if (!data.access_token) throw new Error("token_failed: " + JSON.stringify(data));
  return data.access_token;
}

function ymd(d) {
  return d.toISOString().slice(0, 10);
}

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "method_not_allowed" }); return; }

  const clientId = process.env.GCAL_CLIENT_ID;
  const clientSecret = process.env.GCAL_CLIENT_SECRET;
  const refreshToken = process.env.GCAL_REFRESH_TOKEN;
  const calId = process.env.GCAL_CALENDAR_ID || "primary";
  // 未配置 → best-effort 略過，唔阻塞預約
  if (!clientId || !clientSecret || !refreshToken) { res.status(200).json({ skipped: true }); return; }

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
    const token = await getAccessToken();
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
