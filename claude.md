# claude.md — 개발 규칙 · 제약사항 · 오류 로그

> 이 파일은 작업하며 지속 업데이트합니다. 오류/버그는 아래 **오류 로그**에 누적 기록해 같은 실수를 반복하지 않습니다.

## 1. 아키텍처 원칙
- **메타데이터(Supabase) ↔ 파일 바이트(Cloudflare R2) 분리.** DB에는 파일 키·메타만, 실제 파일은 R2.
- 미디어는 **브라우저 → R2 직접 업로드**. 서버는 **presigned URL 발급**만 한다.

## 2. 핵심 제약사항 (반드시 준수)
1. **Vercel 서버리스 함수 본문 ~4.5MB 제한** → 원본 동영상을 API Route로 통과시켜 업로드 **금지**. presigned URL로 클라이언트가 직접 R2에 PUT.
2. **대용량(>5GB 또는 안정성)** → R2 **멀티파트 업로드**(presigned part URL). 단일 PUT 최대 5GB.
3. **원본 보존** → 업로드 시 트랜스코딩/리사이즈 금지. EXIF 보존. 썸네일은 별도 파일로만 생성.
4. **동영상 스트리밍** → 조회 시 HTTP Range 지원(seek 가능). R2 presigned GET은 Range 통과.
5. **접근 통제** → R2 버킷 비공개. 조회는 만료형 presigned GET 또는 인증 프록시로만. 공개 URL/공개 버킷 금지.
6. **RLS 필수** → Supabase 모든 테이블 Row Level Security. 멤버 아닌 사용자는 메타데이터 조회 불가.
7. **시크릿 관리** → 키는 `.env.local`(gitignore), Vercel 환경변수로 주입. 절대 커밋 금지. service_role 키는 서버 전용.
8. **썸네일** → 목록 화면에서 원본 동영상/대용량 이미지를 직접 로드 금지(트래픽·속도). 썸네일만 로드.

## 3. Next.js 16 주의사항 (이 버전 = 학습 데이터와 다름, 오류 빈발 지점)
- **`middleware.ts` 폐기 → `proxy.ts`** 사용. 함수명 `proxy`, 런타임은 `nodejs`(edge 미지원). 세션 갱신은 proxy에서.
- **Async Request API**: `cookies()`, `headers()` 는 `await` 필요.
- **Route Handler `params` 는 Promise**: `{ params }: { params: Promise<{ id: string }> }` → `await params`.
- **Page `params`/`searchParams` 도 Promise**. `next typegen`의 `PageProps<'/path'>` 헬퍼 활용.
- Turbopack이 기본. `next lint` 제거 → `eslint` 직접 사용.
- `next/image`는 `remotePatterns` 사용(`domains` 폐기). 원본 미디어는 최적화 우회(`unoptimized`) 또는 `<img>`/`<video>`로 직접 표시.

## 4. 코딩 규칙
- TypeScript strict. 서버 전용 모듈에 클라이언트 import 금지(`server-only` 고려).
- Supabase 접근은 항상 인증된 사용자 컨텍스트로(RLS 신뢰). service_role은 초대 생성 등 꼭 필요한 서버 작업에만.
- 환경변수 미설정 시 빌드가 깨지지 않도록 클라이언트 생성은 요청 시점(lazy)으로.

## 5. 디렉터리 구조
```
src/lib/supabase/{client,server}.ts   Supabase 브라우저/서버 클라이언트
src/lib/r2.ts                          R2(S3 호환) 클라이언트 + presign 헬퍼
src/lib/types.ts                       공유 타입
src/app/login, /auth/callback          매직링크 로그인/콜백
src/app/(app)/...                       보호된 갤러리/업로드/멤버
src/app/api/...                         presign·complete·media·invite
proxy.ts                               세션 갱신/접근 보호 (nodejs)
supabase/schema.sql                    테이블 + RLS 정책
```

## 6. 오류 로그 (발생 → 원인 → 해결)
> 새 오류가 생기면 맨 위에 추가. 같은 패턴 재발 방지.

- (2026-06-24) **예상 함정 사전 등록**: `middleware.ts`로 작성 시 Next 16에서 동작/경고 → 반드시 `proxy.ts`로 작성.
- (2026-06-24) **예상 함정**: 라우트 핸들러에서 `params`를 동기 접근 시 타입 에러 → `await params`.
- (2026-06-24) **예상 함정**: `cookies()`를 `await` 없이 사용 시 에러 → `const cookieStore = await cookies()`.
- (2026-06-24) **R2 멀티파트 ETag 누락**: 브라우저에서 파트 PUT 후 `xhr.getResponseHeader("ETag")`가 null → CompleteMultipartUpload 실패. 원인: R2 버킷 CORS에 `ExposeHeaders: ["ETag"]` 누락. 해결: CORS에 ETag expose 추가(README 참고).
- (2026-06-24) **server-only 미설치**: `import "server-only"` 빌드 실패 → `npm i server-only`로 해결.
- (2026-06-24) **next/font/google 빌드 의존**: 기본 스캐폴드의 Geist 폰트는 빌드 시 네트워크 fetch → 오프라인/제한망에서 실패 가능. 시스템 폰트로 교체함.
- (2026-06-24) **빌드 검증 통과**: `npm run build` + `eslint .` 클린. proxy.ts가 "Proxy (Middleware)"로 정상 인식됨.
- (2026-06-24) **react-hooks/set-state-in-effect**: `useEffect` 본문에서 동기 `setState` 호출 시 ESLint 에러(React 신규 규칙). 해결: 동기 분기의 setState를 `setTimeout(...,0)` 등으로 다음 틱에 호출(InstallPrompt iOS 분기).
- (실제 발생 시 여기에 계속 추가)

## 7. 로그인/접근 방식 (Phase 2)
- **장기 세션**: `@supabase/ssr` 쿠키 maxAge=400일 + refresh token 무기한. → 기기당 1회 로그인으로 장기 유지. **Supabase에서 session time-box를 켜지 말 것**(기본 꺼짐).
- **카카오/구글 OAuth**: `signInWithOAuth({provider, options:{redirectTo:.../auth/callback}})`. 콜백은 매직링크와 동일한 `exchangeCodeForSession` 재사용. 카카오는 **이메일 제공 동의 scope** 필요(allow-list 매칭).
- **가족 공용 PIN(읽기 전용)**: `FAMILY_PIN`+`PIN_COOKIE_SECRET` 둘 다 설정 시에만 활성. HMAC 서명 httpOnly 쿠키(`family_access`). 읽기 경로는 `getViewer()`로 멤버/PIN 모두 허용하되, **PIN 뷰어는 RLS 컨텍스트가 없어 service role(`createAdminClient`)로 읽기 전용 조회**. 쓰기(업로드/삭제/초대)는 항상 `requireAdmin`(Supabase 멤버)만.
  - ⚠️ **보안 트레이드오프**: 공용 PIN은 PIN+URL을 아는 누구나 전체 열람 가능 → 개별 프라이버시 약화. 완화: opt-in(미설정 시 비활성), 강한 PIN, 서명 쿠키, 실패 지연, 읽기 전용.
