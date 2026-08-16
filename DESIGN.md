# Resoul — Design System (DESIGN.md for Google Stitch)

> 品牌本質：為經歷寵物離世的香港飼主，提供安靜、溫暖、有紀念感的情緒支持體驗。
> 設計關鍵詞：**溫柔 · 沉穩 · 乾淨 · 克制 · 紀念感**。
> 標語（Tagline）：*Your last greatest love to show*

Mobile-first。整體氣質偏向高級、留白充足、細線分隔、大片圖片、避免商業化與誇張銷售感。

---

## 1. Brand Voice & Tone
- 語氣：同理、溫柔、不評判、不恐嚇、不硬銷。
- 語言：繁體中文為主，帶香港口語溫度；英文標語用優雅斜體。
- 避免：誇張促銷、價格/優惠、醫療或療效承諾、排名、保證、否定感受的說話。
- 文案短、留白多、句子有呼吸感。

---

## 2. Color Palette

### Light（預設）
| Token | Hex | 用途 |
|---|---|---|
| bg | `#faf6ef` | 頁面底色（暖米白） |
| surface / cream | `#f2e9dc` | 段落交替底色（奶油色） |
| card | `#fdfaf4` | 卡片、輸入框底 |
| primary / gold | `#b89a6e` | 主色（柔和棕金）、圖示、重點線 |
| primary-deep | `#9c7f52` | 深金，標籤、連結、強調 |
| ink | `#3b2f27` | 主要文字、深底按鈕（深褐墨色） |
| ink-soft | `#6f6156` | 次要文字 |
| ink-faint | `#9a8d80` | 輔助文字、說明 |
| line | `#e6dccb` | 細線分隔、邊框 |
| dark-band | `#33281f` | 收尾段落深色帶 |
| footer | `#2f251e` | 頁尾底色 |

### Dark
| Token | Hex |
|---|---|
| bg | `#1f1914` |
| surface / cream | `#271f18` |
| card | `#2b231c` |
| primary / gold | `#c9ac80` |
| primary-deep | `#dcc298` |
| ink (text) | `#efe6d8` |
| ink-soft | `#c6b6a2` |
| ink-faint | `#9a8b78` |
| line | `#40352b` |

Seed / brand color（供 dynamic color 使用）：`#b89a6e`（warm gold），色調偏 **Neutral / Tonal**，非鮮豔。

---

## 3. Typography
- **Headline（標題）**：Noto Serif（繁中用 Noto Serif TC），weight 600，line-height ~1.5–1.6。
- **Body（內文）**：Noto Sans（繁中用 Noto Sans TC），weight 300–500，line-height 1.75。
- **Accent / 標語**：EB Garamond / Cormorant 類優雅斜體 serif（italic），用於英文標語與品牌小字。
- **Logo 字樣**：手寫花體（Parisienne 類）+ 現成 logo 圖（腳印中藏心 + "Resoul"）。網站以 logo 圖為準。

### Type Scale
| Level | Font | Size | Weight | 備註 |
|---|---|---|---|---|
| display / hero-h1 | Serif | 2rem → 2.6rem | 600 | 溫柔反問句 |
| headline / h2 | Serif | 1.5rem | 600 | 段落標題 |
| subhead / h3 | Serif | 1.12–1.34rem | 600 | 子標題 |
| body | Sans | 1rem | 400 | line-height 1.75 |
| body-soft | Sans | .92–.96rem | 400 | 次要說明 |
| eyebrow / label | Sans | .72rem | 600 | 全大寫、letter-spacing .34em、金色 |
| slogan | Serif italic | 1–1.16rem | 500 | 英文標語 |

---

## 4. Shape & Elevation
- **圓角（Roundness）**：克制。卡片 12–20px（≈ Stitch `ROUND_TWELVE`）；按鈕 pill / full（999px）；輸入框 12–14px。
- **陰影**：柔和、低對比，多用 `0 14px 40px -22px rgba(70,52,34,.35)` 這類長距離淡陰影。
- **分隔**：1px 細線（`line` 色），大量留白代替粗重邊框。

## 5. Spacing
| 名稱 | 值 |
|---|---|
| xs | 8px |
| sm | 12px |
| md | 16px |
| lg | 24px |
| xl | 40px |
| section | 64px（段落上下 padding） |
| container-max | 520px（mobile 內容欄）→ 760px（desktop） |

---

## 6. Components
- **CTA 按鈕**：深墨底（`ink`）+ 米色字，pill 形，右側 `→`；全站唯一 CTA 文字「查看Resoul官方資料」。次要為描邊金色 light 版。
- **卡片**：`card` 底、1px `line` 邊、圓角 14px、淡陰影；用於步驟、產品情境、資源、燭光、回憶卡。
- **Accordion（常見心情）**：幼線分隔列表，左側 `＋`／展開變 `×`，展開項變成圓角柔和卡片。按主題分組，每組有 icon 子標題。
- **浮動聊天視窗（情緒傾聽）**：左下角腳印啟動掣；彈出對話面板（頭像、對話氣泡、快速提示 chips、輸入框、打字動畫）。回應遵循哀傷輔導手冊（接住感受 → 整理情況 → 溫和下一步；危機即時顯示熱線）。
- **輸入框**：`card` 底、1px 邊、圓角 12px，focus 金色描邊光暈。
- **燭光牆**：卡片內含 CSS 火焰動畫 + 名字 + 一句留言，網格排列。
- **回憶卡**：相片（1:1）+ 名字 + 年月 + 幾句回憶 + 品牌小字，可下載成圖。
- **資源清單**：分類（專業支援 / 危機熱線 / 獸醫 / 紀念工作室 / 社群），電話為可點 `tel:` 連結。
- **浮動控制**：右下角 深色模式 ☾/☀ + 背景音 ♪ 圓形掣。
- **裝飾**：淡金色腳印水印（opacity 5–16%），克制點綴。

---

## 7. Imagery
- 情緒共鳴（主人拿照片與項圈的安靜畫面）、核心工藝、生活情境、品牌收尾圖。
- 主圖 16:9；比例避免裁走重點人物或產品；均需 alt text。
- 影調暖、柔光、留白，避免鮮豔或高飽和。

---

## 8. Screens / Layout（長頁式，mobile-first）
1. **Header** — Resoul logo（透明背景）+ 標語小字；橫向可滑導覽：情緒支持 / AI 對話 / 紀念產品 / 支援資源 / 了解更多。
2. **Hero** — 溫柔反問大標 + 副文案 + CTA + 痛點共鳴圖（16:9）。
3. **情緒支持** — 標題 + 01 先承接失落 / 02 再整理下一步 / 03 最後留下紀念（三欄）。
4. **子標題：陪自己走過的溫柔方式** →
   - **點一盞燭光**（留言 + 燭光牆）
   - **毛孩回憶卡**（上載相 + 生成紀念卡）
5. **紀念產品** — 影片/圖 + 三張情境卡（把想念留在身邊 / 讓紀念被細心製作 / 為家中留一個位置）。
6. **常見心情** — 主題分類 Accordion。
7. **支援資源** — 分類資源清單（含熱線）。
8. **收尾 / 最後 CTA** — 深色帶：「你不需要一個人承受這段告別。」+ CTA。
9. **Footer** — Resoul logo（反白）+ 標語。
- **全域**：左下浮動「情緒傾聽」聊天；右下深色模式 + 背景音。

---

## 9. Stitch 設定對照（給 create_design_system 用）
- `colorMode`: `LIGHT`（同時提供 Dark 對應色）
- `colorVariant`: `NEUTRAL`（或 `TONAL_SPOT`）
- `customColor`（seed）: `#b89a6e`
- `overridePrimaryColor`: `#9c7f52`
- `overrideNeutralColor`: `#f2e9dc`
- `overrideSecondaryColor`: `#3b2f27`
- `headlineFont`: `NOTO_SERIF`
- `bodyFont`: `NOTO_SANS`
- `labelFont`: `NOTO_SANS`（重點小標可用 `EB_GARAMOND` italic 作 accent）
- `roundness`: `ROUND_TWELVE`
- `deviceType`: `MOBILE`

---

## 10. Constraints（務必遵守）
- 全站唯一 CTA 文字：**查看Resoul官方資料**。
- 不提及價格、優惠、庫存、評價、健康或醫療效果、排名、保證。
- 不過度承諾、不恐嚇。
- 情緒傾聽與資源：不提供醫療/心理診斷；偵測危機關鍵字須即時顯示香港求助熱線。
