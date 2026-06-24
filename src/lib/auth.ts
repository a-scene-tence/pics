import { createClient } from "@/lib/supabase/server";
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
