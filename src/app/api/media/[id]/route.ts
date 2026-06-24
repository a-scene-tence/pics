import { NextResponse, type NextRequest } from "next/server";
import { getViewer, requireAdmin } from "@/lib/auth";
import { presignGet, deleteObject } from "@/lib/r2";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// 멤버 전용. presigned GET URL로 302 리다이렉트.
// ?thumb=1 → 썸네일, ?download=1 → 원본 다운로드(attachment).
// 동영상 재생 시 브라우저가 presigned URL에 직접 Range 요청 → R2가 부분 응답.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }, // Next.js 16: params는 Promise
) {
  const viewer = await getViewer();
  if (!viewer)
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });

  const { id } = await params;
  // PIN 뷰어는 RLS 컨텍스트가 없으므로 service role로 읽기 전용 조회.
  const supabase =
    viewer.kind === "pin" ? createAdminClient() : await createClient();

  const { data: media, error } = await supabase
    .from("media")
    .select("r2_key, thumb_key, original_name")
    .eq("id", id)
    .maybeSingle();

  if (error || !media)
    return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });

  const wantThumb = request.nextUrl.searchParams.get("thumb") === "1";
  const wantDownload = request.nextUrl.searchParams.get("download") === "1";

  const key = wantThumb && media.thumb_key ? media.thumb_key : media.r2_key;
  const url = await presignGet(
    key,
    wantDownload ? media.original_name : undefined,
  );

  return NextResponse.redirect(url, 302);
}

// 관리자가 미디어 삭제: R2 원본+썸네일 객체 삭제 후 메타데이터 행 삭제.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ error: "관리자만 삭제할 수 있습니다." }, { status: 403 });

  const { id } = await params;
  const supabase = await createClient();

  const { data: media } = await supabase
    .from("media")
    .select("r2_key, thumb_key")
    .eq("id", id)
    .maybeSingle();

  if (!media)
    return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });

  await deleteObject(media.r2_key).catch(() => {});
  if (media.thumb_key) await deleteObject(media.thumb_key).catch(() => {});

  const { error } = await supabase.from("media").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
