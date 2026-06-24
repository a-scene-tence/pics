"use client";

import { useEffect, useState } from "react";

// 최소 타입: beforeinstallprompt 이벤트
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "install-prompt-dismissed";

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;

    // 이미 PWA(standalone)로 실행 중이면 안내 불필요
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const ua = window.navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua);
    if (ios) {
      // 이펙트 본문에서 동기적으로 setState하지 않도록 다음 틱으로 미룸
      const t = setTimeout(() => {
        setIsIOS(true);
        setShow(true);
      }, 0);
      return () => clearTimeout(t);
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  }

  if (!show) return null;

  return (
    <div className="mx-auto mb-4 flex max-w-md items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
      {isIOS ? (
        <span>
          홈 화면에 추가하면 앱처럼 바로 열려요: 공유 <strong>⬆️</strong> →{" "}
          <strong>홈 화면에 추가</strong>
        </span>
      ) : (
        <span>홈 화면에 설치하면 매번 주소를 입력하지 않아도 돼요.</span>
      )}
      <div className="flex shrink-0 items-center gap-1">
        {!isIOS && (
          <button
            onClick={install}
            className="rounded-lg bg-amber-500 px-3 py-1.5 font-medium text-white hover:bg-amber-600"
          >
            설치
          </button>
        )}
        <button
          onClick={dismiss}
          className="rounded-lg px-2 py-1.5 text-amber-700 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900"
          aria-label="닫기"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
