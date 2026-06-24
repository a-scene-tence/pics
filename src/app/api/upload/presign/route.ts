import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/auth";
import {
  presignPut,
  createMultipart,
  presignUploadPart,
} from "@/lib/r2";
import { MULTIPART_THRESHOLD, MULTIPART_PART_SIZE } from "@/lib/types";

export const runtime = "nodejs";

function extFromName(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "bin";
}

function kindFromMime(mime: string): "image" | "video" | null {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return null;
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ error: "관리자만 업로드할 수 있습니다." }, { status: 403 });

  const { originalName, mimeType, size } = (await request.json()) as {
    originalName: string;
    mimeType: string;
    size: number;
  };

  const kind = kindFromMime(mimeType);
  if (!kind)
    return NextResponse.json(
      { error: "이미지/동영상 파일만 업로드할 수 있습니다." },
      { status: 400 },
    );

  const year = new Date().getFullYear();
  const id = randomUUID();
  const key = `media/${year}/${id}.${extFromName(originalName)}`;
  const thumbKey = `thumbs/${year}/${id}.jpg`;

  // 썸네일 업로드용 presigned PUT (클라이언트가 생성한 썸네일 업로드)
  const thumbPutUrl = await presignPut(thumbKey, "image/jpeg");

  // 큰 파일은 멀티파트, 작은 파일은 단일 PUT
  if (size > MULTIPART_THRESHOLD) {
    const uploadId = await createMultipart(key, mimeType);
    const partCount = Math.ceil(size / MULTIPART_PART_SIZE);
    const partUrls: string[] = [];
    for (let n = 1; n <= partCount; n++) {
      partUrls.push(await presignUploadPart(key, uploadId, n));
    }
    return NextResponse.json({
      key,
      thumbKey,
      kind,
      thumbPutUrl,
      multipart: { uploadId, partUrls, partSize: MULTIPART_PART_SIZE },
    });
  }

  const putUrl = await presignPut(key, mimeType);
  return NextResponse.json({ key, thumbKey, kind, thumbPutUrl, putUrl });
}
