"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buildMediaMeta } from "@/lib/thumbnail";

type Phase = "pending" | "preparing" | "uploading" | "finalizing" | "done" | "error";

interface Item {
  file: File;
  progress: number;
  phase: Phase;
  error?: string;
}

// XHR로 PUT 업로드 (진행률 + ETag 회수). R2 CORS에 ETag expose 필요.
function putWithProgress(
  url: string,
  body: Blob,
  contentType: string,
  onProgress: (pct: number) => void,
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.getResponseHeader("ETag"));
      } else {
        reject(new Error(`업로드 실패 (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("네트워크 오류"));
    xhr.send(body);
  });
}

export default function Uploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);

  function update(i: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  async function uploadOne(item: Item, i: number) {
    const { file } = item;
    try {
      update(i, { phase: "preparing", progress: 0 });
      const meta = await buildMediaMeta(file);

      // 1) presign
      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
        }),
      });
      if (!presignRes.ok) throw new Error((await presignRes.json()).error);
      const p = await presignRes.json();

      update(i, { phase: "uploading" });

      // 2) 원본 업로드 (멀티파트 or 단일)
      let multipartResult:
        | { uploadId: string; parts: { PartNumber: number; ETag: string }[] }
        | undefined;

      if (p.multipart) {
        const { uploadId, partUrls, partSize } = p.multipart;
        const parts: { PartNumber: number; ETag: string }[] = [];
        for (let n = 0; n < partUrls.length; n++) {
          const start = n * partSize;
          const chunk = file.slice(start, Math.min(start + partSize, file.size));
          const etag = await putWithProgress(
            partUrls[n],
            chunk,
            file.type,
            (pct) => update(i, { progress: (n + pct) / partUrls.length }),
          );
          if (!etag) throw new Error("ETag 누락 (R2 CORS에 ETag expose 필요)");
          parts.push({ PartNumber: n + 1, ETag: etag });
        }
        multipartResult = { uploadId, parts };
      } else {
        await putWithProgress(p.putUrl, file, file.type, (pct) =>
          update(i, { progress: pct }),
        );
      }

      // 3) 썸네일 업로드 (있을 때)
      let hasThumb = false;
      if (meta.thumbBlob && p.thumbPutUrl) {
        try {
          await putWithProgress(p.thumbPutUrl, meta.thumbBlob, "image/jpeg", () => {});
          hasThumb = true;
        } catch {
          hasThumb = false; // 썸네일 실패는 치명적 아님
        }
      }

      // 4) 완료 + 메타데이터 저장
      update(i, { phase: "finalizing", progress: 1 });
      const completeRes = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: p.key,
          thumbKey: p.thumbKey,
          hasThumb,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          kind: p.kind,
          width: meta.width,
          height: meta.height,
          duration: meta.duration,
          takenAt: new Date(file.lastModified).toISOString(),
          multipart: multipartResult,
        }),
      });
      if (!completeRes.ok) throw new Error((await completeRes.json()).error);

      update(i, { phase: "done" });
    } catch (e) {
      update(i, { phase: "error", error: e instanceof Error ? e.message : String(e) });
    }
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const next: Item[] = Array.from(files).map((file) => ({
      file,
      progress: 0,
      phase: "pending" as Phase,
    }));
    setItems(next);
    setBusy(true);
    // 순차 업로드(대용량 병렬은 메모리/대역폭 부담)
    for (let i = 0; i < next.length; i++) {
      await uploadOne(next[i], i);
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFiles(e.dataTransfer.files);
        }}
        className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 p-10 text-center text-neutral-500 hover:border-amber-400 dark:border-neutral-700"
      >
        <p className="text-lg">사진·동영상을 여기에 끌어다 놓거나 클릭</p>
        <p className="mt-1 text-sm">원본 화질 그대로 업로드됩니다</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li
              key={i}
              className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800"
            >
              <div className="flex items-center justify-between">
                <span className="truncate">{it.file.name}</span>
                <span className="ml-2 shrink-0 text-neutral-400">
                  {it.phase === "done"
                    ? "완료"
                    : it.phase === "error"
                      ? "오류"
                      : it.phase === "finalizing"
                        ? "저장 중…"
                        : it.phase === "preparing"
                          ? "준비 중…"
                          : `${Math.round(it.progress * 100)}%`}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-700">
                <div
                  className={`h-full ${it.phase === "error" ? "bg-red-500" : "bg-amber-500"}`}
                  style={{ width: `${it.phase === "done" ? 100 : it.progress * 100}%` }}
                />
              </div>
              {it.error && <p className="mt-1 text-red-600">{it.error}</p>}
            </li>
          ))}
        </ul>
      )}

      {busy && <p className="text-sm text-neutral-500">업로드 중… 페이지를 닫지 마세요.</p>}
    </div>
  );
}
