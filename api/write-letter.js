/**
 * Resoul 寫信助手 — Gemini 代理（Vercel Serverless Function）
 *
 * 前端 POST /api/write-letter，收集毛孩資料，回傳一封告別信初稿。
 * GEMINI_API_KEY 存於 Vercel 環境變數（與 grief-chat 共用）。
 * 回應：{ letter: "..." }。屬草稿，主人可自行修改。
 */

const MODEL = "gemini-3.6-flash";

function clean(s, n) { return String(s == null ? "" : s).slice(0, n || 400).trim(); }

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "method_not_allowed" }); return; }

  const key = process.env.GEMINI_API_KEY;
  if (!key) { res.status(500).json({ error: "server_not_configured" }); return; }

  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};

  const petName = clean(b.petName, 60);
  const years = clean(b.years, 60);
  const trait = clean(b.trait, 300);
  const memory = clean(b.memory, 600);
  const thanks = clean(b.thanks, 400);
  const sorry = clean(b.sorry, 400);
  const tone = clean(b.tone, 40) || "溫柔";
  const lang = clean(b.lang, 20) || "zh";

  if (!petName && !memory && !trait) { res.status(400).json({ error: "no_input" }); return; }

  const langLine = lang === "en"
    ? "Write the letter in warm, natural English."
    : lang === "bi"
      ? "Write the letter in Traditional Chinese (Hong Kong), then append an English version after a line break and a divider."
      : "用繁體中文（香港）書寫，語氣自然、貼近日常說話。";

  const prompt =
    "你是一位溫柔的寫作助手，協助一位剛失去寵物的主人，寫一封『給毛孩的告別信』。" +
    "請以主人第一人稱、向毛孩傾訴的口吻書寫，真誠、具體、不濫情，長度約 200–320 字。" +
    "只輸出信件內容本身（可用 1–3 個自然段），不要標題、不要解釋、不要加引號。" +
    "結尾可以有一句溫柔的道別，但不要用『敬上』這類公文式結尾。\n\n" +
    "語氣：" + tone + "。\n" + langLine + "\n\n" +
    "資料（可能不完整，缺的請自然略過，不要杜撰事實）：\n" +
    "毛孩名字：" + (petName || "（未提供）") + "\n" +
    "相處年期：" + (years || "（未提供）") + "\n" +
    "性格／習慣：" + (trait || "（未提供）") + "\n" +
    "最想保留的回憶：" + (memory || "（未提供）") + "\n" +
    "想感謝牠的：" + (thanks || "（未提供）") + "\n" +
    "想道歉或放不下的：" + (sorry || "（未提供）") + "\n";

  const url = "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent?key=" + key;
  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.8, topP: 0.95, maxOutputTokens: 1024, candidateCount: 1 },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
    ],
  };

  let r;
  try {
    r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  } catch (e) { res.status(502).json({ error: "upstream_unreachable" }); return; }
  if (!r.ok) { const detail = (await r.text().catch(() => "")).slice(0, 300); res.status(502).json({ error: "gemini_error", detail }); return; }

  let data;
  try { data = await r.json(); } catch (e) { res.status(502).json({ error: "bad_response" }); return; }
  const letter = (((data.candidates || [])[0] || {}).content || {}).parts;
  const text = Array.isArray(letter) ? letter.map((p) => p.text || "").join("").trim() : "";
  if (!text) { res.status(502).json({ error: "empty" }); return; }

  res.status(200).json({ letter: text });
};
