// 공유 타입 정의

export type MemberRole = "admin" | "member";

export interface Member {
  id: string;
  email: string;
  role: MemberRole;
  created_at: string;
}

export interface MediaItem {
  id: string;
  /** R2 객체 키 (원본) */
  r2_key: string;
  /** R2 객체 키 (썸네일, 있을 때) */
  thumb_key: string | null;
  original_name: string;
  mime_type: string;
  /** 바이트 단위 */
  size: number;
  /** "image" | "video" */
  kind: "image" | "video";
  width: number | null;
  height: number | null;
  /** 동영상 길이(초) */
  duration: number | null;
  /** 촬영일(EXIF 등), 없으면 null */
  taken_at: string | null;
  uploaded_by: string;
  created_at: string;
}

/** presign 요청 시 클라이언트가 보내는 파일 메타 */
export interface UploadFileMeta {
  originalName: string;
  mimeType: string;
  size: number;
}

/** 멀티파트 임계값: 이보다 크면 멀티파트 업로드 사용 */
export const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100MB
/** 멀티파트 파트 크기 */
export const MULTIPART_PART_SIZE = 50 * 1024 * 1024; // 50MB
