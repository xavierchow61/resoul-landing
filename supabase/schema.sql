-- ============================================================
-- Resoul 留言 / 同路人留言板 — Supabase Schema
-- 用法：Supabase 專案 → SQL Editor → 貼上全部 → Run
-- 適用於：照顧誌文章留言 + 同路人留言板（可貼相）
-- 設計重點：匿名（不存 user_id / email）、預先審核、危機偵測、RLS 保護
-- ============================================================

-- 1) 留言資料表 -------------------------------------------------
create table if not exists public.posts (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null    default now(),
  context     text        not null    default 'board',   -- 'board' 或 'blog:<文章-handle>'
  name        text,                                        -- 化名（可留空）
  body        text        not null,                        -- 留言內容
  image_path  text,                                        -- Storage 內圖片路徑（可留空）
  status      text        not null    default 'held',      -- held=待審 / visible=顯示 / hidden=隱藏
  crisis_flag boolean     not null    default false,       -- 危機字眼偵測結果
  constraint body_len    check (char_length(body) between 1 and 1000),
  constraint name_len    check (name is null or char_length(name) <= 40),
  constraint context_len check (char_length(context) <= 120),
  constraint status_val  check (status in ('held','visible','hidden'))
);

create index if not exists posts_context_idx on public.posts (context, created_at desc);
create index if not exists posts_status_idx  on public.posts (status);

-- 2) 危機偵測 + 強制狀態（提交時自動執行，客戶端無法繞過）---------
create or replace function public.posts_before_insert()
returns trigger
language plpgsql
as $$
begin
  -- 一律進入待審狀態，審核後才顯示
  new.status := 'held';
  -- 偵測危機字眼，標記以便你優先跟進
  if new.body ~ '(想死|唔想活|自殺|傷害自己|撐唔住|頂唔住|想跟(佢|牠|你)去|活唔落去|結束生命|唔想生存|冇晒意思)' then
    new.crisis_flag := true;
  else
    new.crisis_flag := false;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_posts_before_insert on public.posts;
create trigger trg_posts_before_insert
  before insert on public.posts
  for each row execute function public.posts_before_insert();

-- 3) 權限（Row Level Security）---------------------------------
alter table public.posts enable row level security;

-- 公眾只可讀「已顯示」的留言（待審 / 隱藏的不會外露）
drop policy if exists "read visible posts" on public.posts;
create policy "read visible posts"
  on public.posts for select
  to anon, authenticated
  using (status = 'visible');

-- 公眾可提交留言（狀態由 trigger 強制為 held；無法自行設為 visible）
drop policy if exists "insert posts" on public.posts;
create policy "insert posts"
  on public.posts for insert
  to anon, authenticated
  with check (true);

-- 不開放 anon 更新 / 刪除。審核（改 status）在 Supabase 後台以 service role 進行。

-- 4) 圖片 Storage（留言相片）-----------------------------------
insert into storage.buckets (id, name, public)
values ('board-images', 'board-images', true)
on conflict (id) do nothing;

-- 圖片限制（防濫用）：檔案上限 5MB、只准圖片
update storage.buckets
set file_size_limit    = 5242880,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/heic']
where id = 'board-images';

-- 公眾可讀圖片
drop policy if exists "public read board-images" on storage.objects;
create policy "public read board-images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'board-images');

-- 公眾可上載圖片到該 bucket（建議在 Storage 設定檔案大小上限與只允許 image/*）
drop policy if exists "public upload board-images" on storage.objects;
create policy "public upload board-images"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'board-images');

-- ============================================================
-- 完成。之後把「Project URL」與「anon public key」交給前端串接。
-- 審核：Table Editor → posts → 將要顯示的留言 status 改為 'visible'
--        （crisis_flag = true 的請優先查看與跟進）
-- ============================================================
