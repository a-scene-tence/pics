"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton({
  viewerKind = "member",
}: {
  viewerKind?: "member" | "pin";
}) {
  const router = useRouter();

  async function signOut() {
    if (viewerKind === "pin") {
      // PIN 뷰어: 접근 쿠키 제거 후 입장 화면으로
      await fetch("/api/pin", { method: "DELETE" });
      router.push("/enter");
    } else {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
    }
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      className="rounded-lg px-3 py-1.5 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
    >
      {viewerKind === "pin" ? "나가기" : "로그아웃"}
    </button>
  );
}
