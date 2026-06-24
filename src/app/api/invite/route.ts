import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// 관리자가 이메일로 멤버 초대 → members allow-list에 추가.
// 초대된 사용자는 /login 에서 매직링크로 직접 로그인한다.
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ error: "관리자만 초대할 수 있습니다." }, { status: 403 });

  const { email, role } = (await request.json()) as {
    email: string;
    role?: "admin" | "member";
  };

  if (!email || !email.includes("@"))
    return NextResponse.json({ error: "올바른 이메일을 입력하세요." }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.from("members").insert({
    email: email.trim().toLowerCase(),
    role: role === "admin" ? "admin" : "member",
  });

  if (error) {
    // unique 위반 등
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
