import "server-only";

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// R2(S3 호환) 클라이언트. 요청 시점 생성(lazy)으로 빌드 시 env 미설정 크래시 방지.
let _client: S3Client | null = null;

function r2(): S3Client {
  if (_client) return _client;
  _client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  return _client;
}

const BUCKET = () => process.env.R2_BUCKET!;

const PRESIGN_TTL = 60 * 10; // 10분

/** 단일 PUT 업로드용 presigned URL (소~중 용량). */
export async function presignPut(key: string, contentType: string) {
  return getSignedUrl(
    r2(),
    new PutObjectCommand({ Bucket: BUCKET(), Key: key, ContentType: contentType }),
    { expiresIn: PRESIGN_TTL },
  );
}

/** 다운로드/조회용 presigned GET URL. Range 요청은 클라이언트가 직접 헤더로 전달 가능. */
export async function presignGet(key: string, downloadName?: string) {
  return getSignedUrl(
    r2(),
    new GetObjectCommand({
      Bucket: BUCKET(),
      Key: key,
      ...(downloadName
        ? { ResponseContentDisposition: `attachment; filename="${downloadName}"` }
        : {}),
    }),
    { expiresIn: PRESIGN_TTL },
  );
}

/** 멀티파트 업로드 시작 → uploadId 반환. */
export async function createMultipart(key: string, contentType: string) {
  const out = await r2().send(
    new CreateMultipartUploadCommand({
      Bucket: BUCKET(),
      Key: key,
      ContentType: contentType,
    }),
  );
  return out.UploadId!;
}

/** 각 파트 업로드용 presigned URL. partNumber는 1부터. */
export async function presignUploadPart(
  key: string,
  uploadId: string,
  partNumber: number,
) {
  return getSignedUrl(
    r2(),
    new UploadPartCommand({
      Bucket: BUCKET(),
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    }),
    { expiresIn: PRESIGN_TTL },
  );
}

/** 멀티파트 완료. parts는 {PartNumber, ETag} 배열. */
export async function completeMultipart(
  key: string,
  uploadId: string,
  parts: { PartNumber: number; ETag: string }[],
) {
  return r2().send(
    new CompleteMultipartUploadCommand({
      Bucket: BUCKET(),
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    }),
  );
}

export async function abortMultipart(key: string, uploadId: string) {
  return r2().send(
    new AbortMultipartUploadCommand({
      Bucket: BUCKET(),
      Key: key,
      UploadId: uploadId,
    }),
  );
}

export async function deleteObject(key: string) {
  return r2().send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: key }));
}
