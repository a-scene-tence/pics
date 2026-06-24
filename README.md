# 우리 아이 앨범 👶📷

아이의 사진·동영상을 **원본 화질 그대로** 업로드하고, **초대받은 가족 멤버**만 열람·다운로드하는 비공개 PWA.

- 기획: [`spec.md`](./spec.md) · 규칙/제약/오류로그: [`claude.md`](./claude.md) · 디자인: [`design.md`](./design.md)

## 스택
- **Next.js 16 (App Router)** — Vercel 배포, PWA
- **Supabase** — 이메일 매직링크 인증 + Postgres(메타데이터) + RLS
- **Cloudflare R2** — 미디어 원본 저장(S3 호환), **egress 무료**

## 동작 원리 (핵심)
원본 동영상은 수 GB가 될 수 있어 서버를 거치지 않고 **브라우저 → R2 직접 업로드**한다.
서버(Next.js Route Handler)는 **presigned URL만 발급**하고, 업로드 완료 후 메타데이터만 DB에 저장한다.
조회도 멤버 인증 후 **만료형 presigned URL**로 리다이렉트하며, 동영상은 R2의 HTTP Range로 스트리밍된다.

## 로컬 실행
```bash
npm install
cp .env.example .env.local   # 값 채우기
npm run dev
```

## 1. Supabase 설정
1. 프로젝트 생성 → `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 복사.
2. SQL Editor에서 [`supabase/schema.sql`](./supabase/schema.sql) 실행 (테이블 + RLS + 트리거).
3. 본인을 최초 관리자로 등록:
   ```sql
   insert into public.members (email, role) values ('you@example.com','admin')
     on conflict (email) do update set role='admin';
   ```
4. Authentication → URL Configuration → Redirect URLs에 `http://localhost:3000/auth/callback` 와 배포 도메인 추가.

## 2. Cloudflare R2 설정
1. 버킷 생성(예: `pics-media`, **비공개 유지**). R2 API 토큰(Access Key/Secret) 발급.
2. `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT` 설정.
3. **CORS 설정 필수** (브라우저 직접 업로드 + 멀티파트 ETag 회수):
   ```json
   [
     {
       "AllowedOrigins": ["http://localhost:3000", "https://YOUR-DOMAIN"],
       "AllowedMethods": ["GET", "PUT"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
   > `ExposeHeaders: ETag`가 없으면 대용량(멀티파트) 업로드가 실패합니다 (claude.md 오류 로그 참고).

## 3. Vercel 배포
1. GitHub 레포 연결 → Import.
2. 위 환경변수를 모두 Vercel Project Settings → Environment Variables에 추가.
3. `NEXT_PUBLIC_SITE_URL` 을 배포 도메인으로 설정, Supabase Redirect URL에도 추가.
4. Deploy.

## 멤버 초대
관리자로 로그인 → 헤더 **멤버** → 이메일 초대. 초대된 이메일은 `/login`에서 매직링크로 로그인.

## 비용 (소규모 가족 기준)
Vercel Hobby $0 · Supabase Free $0 · R2 첫 10GB 무료 후 저장 $0.015/GB·월, **조회 트래픽 무료**.
