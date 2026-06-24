import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Member } from "@/lib/types";
import MemberManager from "@/components/MemberManager";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/");

  const supabase = await createClient();
  const { data } = await supabase
    .from("members")
    .select("*")
    .order("created_at", { ascending: true });

  const members = (data as Member[] | null) ?? [];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">멤버 관리</h1>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← 갤러리
        </Link>
      </div>
      <MemberManager members={members} />
    </main>
  );
}
