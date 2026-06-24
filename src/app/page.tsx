import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { getSessionMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { MediaItem } from "@/lib/types";

// 인증/RLS에 의존하므로 항상 동적 렌더링
export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const session = await getSessionMember();
  if (!session) redirect("/login");

  // 멤버가 아니면(초대 안 됨) 안내
  if (!session.member) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-xl font-semibold">접근 권한이 없습니다</h1>
          <p className="mt-2 text-neutral-500">
            {session.email} 은(는) 아직 초대되지 않았습니다. 관리자에게
            문의하세요.
          </p>
        </div>
      </main>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("media")
    .select("*")
    .order("taken_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);

  const media = (data as MediaItem[] | null) ?? [];
  const isAdmin = session.member.role === "admin";

  return (
    <>
      <Header isAdmin={isAdmin} />
      <main className="mx-auto w-full max-w-6xl flex-1 p-4">
        {media.length === 0 ? (
          <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center text-neutral-500">
            <p className="text-lg">아직 사진이 없어요</p>
            {isAdmin && (
              <Link
                href="/upload"
                className="mt-4 rounded-lg bg-amber-500 px-4 py-2 font-medium text-white hover:bg-amber-600"
              >
                첫 사진 올리기
              </Link>
            )}
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {media.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/media/${m.id}`}
                  className="group relative block aspect-square overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/media/${m.id}?thumb=1`}
                    alt={m.original_name}
                    loading="lazy"
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                  {m.kind === "video" && (
                    <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
                      ▶ 동영상
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
