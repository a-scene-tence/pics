"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import InstallPrompt from "@/components/InstallPrompt";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState("");

  function siteUrl() {
    return process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
  }

  async function oauth(provider: "kakao" | "google") {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${siteUrl()}/auth/callback` },
    });
    if (error) {
      setStatus("error");
      setError(error.message);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${siteUrl()}/auth/callback`,
        // 초대(allow-list)된 사용자만 허용. 자동 회원가입 방지.
        shouldCreateUser: true,
      },
    });

    if (error) {
      setStatus("error");
      setError(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-neutral-50 p-6 dark:bg-neutral-950">
      <InstallPrompt />
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm dark:bg-neutral-900">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          우리 아이 앨범
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          초대받은 이메일로 로그인하세요.
        </p>

        {/* 간편 로그인 (카카오/구글) */}
        <div className="mt-6 space-y-2">
          <button
            onClick={() => oauth("kakao")}
            className="w-full rounded-lg bg-[#FEE500] px-4 py-2 font-medium text-[#191600] transition hover:brightness-95"
          >
            카카오로 로그인
          </button>
          <button
            onClick={() => oauth("google")}
            className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-2 font-medium text-neutral-800 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          >
            Google로 로그인
          </button>
        </div>

        <div className="my-5 flex items-center gap-3 text-xs text-neutral-400">
          <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
          또는 이메일
          <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
        </div>

        {status === "sent" ? (
          <div className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <strong>{email}</strong> 메일함을 확인하세요. 로그인 링크를
            보냈습니다.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 outline-none focus:border-amber-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-lg bg-amber-500 px-4 py-2 font-medium text-white transition hover:bg-amber-600 disabled:opacity-50"
            >
              {status === "sending" ? "전송 중…" : "매직링크 받기"}
            </button>
            {status === "error" && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </form>
        )}

        <p className="mt-6 text-center text-sm text-neutral-400">
          <Link href="/enter" className="hover:underline">
            가족 공용 PIN으로 입장
          </Link>
        </p>
      </div>
    </main>
  );
}
