// 클라이언트 전용: 원본은 그대로 두고, 목록용 썸네일(JPEG)만 별도 생성.
// 원본 파일은 절대 수정/리사이즈하지 않는다 (claude.md 제약 3).

export interface MediaMeta {
  width: number | null;
  height: number | null;
  duration: number | null;
  thumbBlob: Blob | null;
}

const MAX_THUMB = 480; // 썸네일 긴 변 최대 px

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.7),
  );
}

function drawScaled(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
): HTMLCanvasElement {
  const scale = Math.min(1, MAX_THUMB / Math.max(srcW, srcH));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(srcW * scale);
  canvas.height = Math.round(srcH * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function imageMeta(file: File): Promise<MediaMeta> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });
    const canvas = drawScaled(img, img.naturalWidth, img.naturalHeight);
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      duration: null,
      thumbBlob: await canvasToBlob(canvas),
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function videoMeta(file: File): Promise<MediaMeta> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = reject;
    });
    // 첫 프레임(1초 지점)으로 이동
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      video.currentTime = Math.min(1, (video.duration || 1) / 2);
    });
    const canvas = drawScaled(video, video.videoWidth, video.videoHeight);
    return {
      width: video.videoWidth,
      height: video.videoHeight,
      duration: video.duration || null,
      thumbBlob: await canvasToBlob(canvas),
    };
  } catch {
    return { width: null, height: null, duration: null, thumbBlob: null };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function buildMediaMeta(file: File): Promise<MediaMeta> {
  if (file.type.startsWith("image/")) return imageMeta(file);
  if (file.type.startsWith("video/")) return videoMeta(file);
  return { width: null, height: null, duration: null, thumbBlob: null };
}
