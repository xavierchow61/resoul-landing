# Supabase 留言系統設定（資料表 + 權限 + 圖片 Storage）

用 Supabase 保存用家留言（照顧誌文章留言 + 同路人留言板，可貼相），不受 Shopify 開店狀態影響。免費層（500MB 資料庫 + 1GB 儲存）已足夠。

## 一、開 Supabase 專案
1. 去 [supabase.com](https://supabase.com) → 註冊 / 登入 → **New project**。
2. 填 project 名（例如 `resoul`）、設一個資料庫密碼、揀最近的地區（如 Singapore）。
3. 等 1–2 分鐘建立完成。

## 二、建立資料表 + 權限 + Storage
1. 左側選單 → **SQL Editor** → **New query**。
2. 打開本 repo 的 [`supabase/schema.sql`](supabase/schema.sql)，把全部內容貼上。
3. 按 **Run**。應顯示成功（建立 `posts` 表、RLS 政策、`board-images` bucket）。

## 三、圖片 bucket 設定（建議加限制防濫用）
1. 左側 → **Storage** → 進入 `board-images` bucket → **Settings**（或 Policies 旁的設定）。
2. 設定：
   - **File size limit**：例如 `5 MB`
   - **Allowed MIME types**：`image/*`（只准圖片）

## 四、取得串接資料
左側 → **Project Settings → API**，抄下：
- **Project URL**：`https://xxxx.supabase.co`
- **anon public key**：一串以 `eyJ...` 開頭的字（**公開用途、可放前端**）

> ⚠️ 只用 **anon public** key，切勿把 **service_role** key 放前端（那是管理員鑰匙）。

把 **Project URL** 與 **anon key** 交給我 / 填入前端設定，即可完成串接（留言列表、提交、上載相片）。

## 五、審核留言（你日常操作）
- 左側 → **Table Editor → posts**：
  - 新留言預設 `status = held`（待審，不會在網站顯示）。
  - 要顯示 → 把該列 `status` 改為 `visible`。
  - 不當內容 → 改為 `hidden` 或刪除。
  - `crisis_flag = true` 的留言（偵測到危機字眼）**請優先查看與跟進**。

## 設計說明（給技術審閱）
- **匿名**：只存化名與內容，不存 `user_id` / 電郵 / IP，天然匿名。
- **預先審核**：所有留言先 `held`，經你批准才 `visible`（適合敏感的善終內容）。
- **危機偵測**：提交時由資料庫 trigger 自動標記 `crisis_flag`；前端亦會即時彈出支援熱線。
- **RLS**：公眾只能讀 `visible`、只能新增（無法改／刪／自設狀態）；審核以 service role 於後台進行。
- **私隱（PDPO）**：留言資料存於你的 Supabase 專案，記得在私隱政策相應更新。

## 前端串接（下一步，需你提供 URL + anon key）
完成後我會：
1. 加入留言列表（讀 `visible` 留言）+ 提交表單 + 圖片上載。
2. 危機字眼即時偵測 → 彈熱線。
3. 套用 Resoul 品牌風格，接上照顧誌文章頁與同路人留言板。
