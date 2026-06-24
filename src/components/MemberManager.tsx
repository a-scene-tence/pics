"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Member } from "@/lib/types";

export default function MemberManager({ members }: { members: Member[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    setBusy(false);
    if (res.ok) {
      setEmail("");
      router.refresh();
    } else {
      setError((await res.json()).error ?? "초대 실패");
    }
  }

  async function remove(id: string) {
    if (!confirm("이 멤버를 제거할까요?")) return;
    const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else alert((await res.json()).error ?? "제거 실패");
  }

  return (
    <div className="space-y-6">
      <form onSubmit={invite} className="flex flex-wrap items-center gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="초대할 이메일"
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "member" | "admin")}
          className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
        >
          <option value="member">멤버</option>
          <option value="admin">관리자</option>
        </select>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-amber-500 px-4 py-2 font-medium text-white hover:bg-amber-600 disabled:opacity-50"
        >
          초대
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between p-3 text-sm">
            <span>
              {m.email}{" "}
              <span className="ml-1 rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800">
                {m.role === "admin" ? "관리자" : "멤버"}
              </span>
            </span>
            <button
              onClick={() => remove(m.id)}
              className="text-red-600 hover:underline"
            >
              제거
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
