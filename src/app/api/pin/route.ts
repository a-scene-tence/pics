import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  FAMILY_COOKIE,
  FAMILY_COOKIE_MAX_AGE,
  createAccessToken,
  isPinEnabled,
  verifyPin,
} from "@/lib/pin";

export const runtime = "nodejs";

// 가족 공용 PIN 입력 → 읽기 전용 접근 쿠키 발급.
export async function POST(request: Request) {
  if (!isPinEnabled())
    return NextResponse.json(
      { error: "PIN 접근이 비활성화되어 있습니다." },
      { status: 404 },
    );

  const { pin } = (await request.json()) as { pin?: string };

  if (!pin || !verifyPin(pin)) {
    // 무차별 대입 완화: 실패 시 약간 지연
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: "PIN이 올바르지 않습니다." }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(FAMILY_COOKIE, createAccessToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: FAMILY_COOKIE_MAX_AGE,
  });

  return NextResponse.json({ ok: true });
}

// 나가기: 접근 쿠키 제거.
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(FAMILY_COOKIE);
  return NextResponse.json({ ok: true });
}
