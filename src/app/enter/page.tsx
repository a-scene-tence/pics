"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function EnterPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    setBusy(false);
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError((await res.json()).error ?? "입장 실패");
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-50 p-6 dark:bg-neutral-950">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm dark:bg-neutral-900">
        <h1 className="text-2xl font-semibold">가족 입장</h1>
        <p className="mt-2 text-sm text-neutral-500">
          가족 공용 PIN을 입력하면 앨범을 볼 수 있어요. (보기 전용)
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            required
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="공용 PIN"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-center text-lg tracking-widest outline-none focus:border-amber-500 dark:border-neutral-700 dark:bg-neutral-800"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-amber-500 px-4 py-2 font-medium text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {busy ? "확인 중…" : "입장"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
        <p className="mt-6 text-center text-sm text-neutral-400">
          <Link href="/login" className="hover:underline">
            이메일/간편 로그인으로 입장
          </Link>
        </p>
      </div>
    </main>
  );
}
