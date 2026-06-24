import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { FAMILY_COOKIE, verifyAccessToken } from "@/lib/pin";

// Next.js 16: `middleware` → `proxy` (nodejs 런타임). 세션 갱신 + 비로그인 보호.
const PUBLIC_PATHS = ["/login", "/enter", "/auth/callback", "/api/pin"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser()는 토큰을 검증하고 필요 시 세션을 갱신한다.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  // 가족 공용 PIN 쿠키 보유 시에도 접근 허용(읽기 전용)
  const hasPin = verifyAccessToken(request.cookies.get(FAMILY_COOKIE)?.value);

  // (비로그인 && PIN 없음) + 보호 경로 → /login
  if (!user && !hasPin && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 이미 입장한 상태로 /login·/enter 접근 → 홈
  if ((user || hasPin) && (pathname === "/login" || pathname === "/enter")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // 정적 자산 / 이미지 / manifest / sw 제외
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/).*)",
  ],
};
