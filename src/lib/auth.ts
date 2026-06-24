import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { FAMILY_COOKIE, verifyAccessToken } from "@/lib/pin";
import type { Member } from "@/lib/types";

// 현재 로그인 사용자 + members 행을 반환. 비로그인/비멤버면 null.
export async function getSessionMember(): Promise<{
  userId: string;
  email: string;
  member: Member | null;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  // RLS(members_select)에 의해 본인 행만 반환됨.
  const { data } = await supabase
    .from("members")
    .select("*")
    .ilike("email", user.email)
    .maybeSingle();

  return {
    userId: user.id,
    email: user.email,
    member: (data as Member | null) ?? null,
  };
}

export async function requireMember() {
  const session = await getSessionMember();
  if (!session || !session.member) return null;
  return session;
}

export async function requireAdmin() {
  const session = await getSessionMember();
  if (!session || session.member?.role !== "admin") return null;
  return session;
}

// 읽기 접근 주체. Supabase 멤버이거나, 유효한 가족 PIN 쿠키 보유자(읽기 전용).
export type Viewer =
  | { kind: "member"; role: "admin" | "member"; userId: string; email: string }
  | { kind: "pin"; role: "viewer" };

// 갤러리/뷰어 등 "읽기" 경로용. 쓰기는 계속 requireAdmin 사용.
export async function getViewer(): Promise<Viewer | null> {
  const session = await getSessionMember();
  if (session?.member) {
    return {
      kind: "member",
      role: session.member.role,
      userId: session.userId,
      email: session.email,
    };
  }

  const cookieStore = await cookies();
  if (verifyAccessToken(cookieStore.get(FAMILY_COOKIE)?.value)) {
    return { kind: "pin", role: "viewer" };
  }

  return null;
}
