-- ============================================================
-- 아이 사진/동영상 공유 앱 — Supabase 스키마 + RLS
-- Supabase 대시보드 SQL Editor에 붙여넣어 실행하세요.
-- ============================================================

-- 1) 허용된 사용자(초대 기반 allow-list).
--    관리자가 이메일로 초대 → 여기에 행 추가 → 해당 이메일만 매직링크 로그인 가능.
create table if not exists public.members (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  role       text not null default 'member' check (role in ('admin', 'member')),
  user_id    uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- 2) 미디어 메타데이터 (실제 파일은 Cloudflare R2에 저장).
create table if not exists public.media (
  id            uuid primary key default gen_random_uuid(),
  r2_key        text not null unique,
  thumb_key     text,
  original_name text not null,
  mime_type     text not null,
  size          bigint not null,
  kind          text not null check (kind in ('image', 'video')),
  width         int,
  height        int,
  duration      numeric,
  taken_at      timestamptz,
  uploaded_by   uuid not null references auth.users (id),
  created_at    timestamptz not null default now()
);

create index if not exists media_taken_at_idx on public.media (coalesce(taken_at, created_at) desc);

-- ============================================================
-- 헬퍼 함수 (security definer → RLS 재귀 방지)
-- ============================================================
create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members
    where lower(email) = lower(auth.jwt() ->> 'email') and role = 'admin'
  );
$$;

-- ============================================================
-- RLS 활성화 + 정책
-- ============================================================
alter table public.members enable row level security;
alter table public.media   enable row level security;

-- members: 관리자는 전체 조회/관리, 멤버는 자기 행만 조회
drop policy if exists members_select on public.members;
create policy members_select on public.members
  for select using ( is_admin() or lower(email) = lower(auth.jwt() ->> 'email') );

drop policy if exists members_admin_write on public.members;
create policy members_admin_write on public.members
  for all using ( is_admin() ) with check ( is_admin() );

-- media: 멤버는 모두 조회 가능, 업로드/삭제는 관리자만
drop policy if exists media_select on public.media;
create policy media_select on public.media
  for select using ( is_member() );

drop policy if exists media_admin_insert on public.media;
create policy media_admin_insert on public.media
  for insert with check ( is_admin() );

drop policy if exists media_admin_delete on public.media;
create policy media_admin_delete on public.media
  for delete using ( is_admin() );

-- ============================================================
-- 로그인 시 members.user_id 자동 연결 (이메일 매칭)
-- ============================================================
create or replace function public.link_member_on_login()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.members
    set user_id = new.id
  where lower(email) = lower(new.email) and user_id is distinct from new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.link_member_on_login();

-- ============================================================
-- 최초 관리자 등록 예시 (본인 이메일로 교체 후 실행)
-- insert into public.members (email, role) values ('you@example.com', 'admin')
--   on conflict (email) do update set role = 'admin';
-- ============================================================
