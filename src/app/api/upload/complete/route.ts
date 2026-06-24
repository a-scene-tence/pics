import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { completeMultipart, abortMultipart } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface CompleteBody {
  key: string;
  thumbKey: string | null;
  hasThumb: boolean;
  originalName: string;
  mimeType: string;
  size: number;
  kind: "image" | "video";
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  takenAt?: string | null;
  multipart?: {
    uploadId: string;
    parts: { PartNumber: number; ETag: string }[];
  };
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ error: "관리자만 업로드할 수 있습니다." }, { status: 403 });

  const body = (await request.json()) as CompleteBody;

  // 멀티파트면 R2에서 완료 처리
  if (body.multipart) {
    try {
      await completeMultipart(body.key, body.multipart.uploadId, body.multipart.parts);
    } catch (e) {
      await abortMultipart(body.key, body.multipart.uploadId).catch(() => {});
      return NextResponse.json(
        { error: "멀티파트 업로드 완료 실패", detail: String(e) },
        { status: 500 },
      );
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("media")
    .insert({
      r2_key: body.key,
      thumb_key: body.hasThumb ? body.thumbKey : null,
      original_name: body.originalName,
      mime_type: body.mimeType,
      size: body.size,
      kind: body.kind,
      width: body.width ?? null,
      height: body.height ?? null,
      duration: body.duration ?? null,
      taken_at: body.takenAt ?? null,
      uploaded_by: admin.userId,
    })
    .select("id")
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id });
}
