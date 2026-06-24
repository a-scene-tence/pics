import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// 관리자가 멤버 제거.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }, // Next.js 16: params는 Promise
) {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ error: "관리자만 제거할 수 있습니다." }, { status: 403 });

  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.from("members").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
