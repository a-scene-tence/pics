"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MediaActions({
  id,
  isAdmin,
}: {
  id: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("이 미디어를 삭제할까요? 되돌릴 수 없습니다.")) return;
    setDeleting(true);
    const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const { error } = await res.json().catch(() => ({ error: "삭제 실패" }));
      alert(error ?? "삭제 실패");
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <a
        href={`/api/media/${id}?download=1`}
        className="rounded-lg bg-amber-500 px-3 py-1.5 font-medium text-white hover:bg-amber-600"
      >
        원본 다운로드
      </a>
      {isAdmin && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-lg px-3 py-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950"
        >
          {deleting ? "삭제 중…" : "삭제"}
        </button>
      )}
    </div>
  );
}
