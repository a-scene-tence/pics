import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { MediaItem } from "@/lib/types";
import MediaActions from "@/components/MediaActions";

export const dynamic = "force-dynamic";

function formatSize(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export default async function MediaPage({
  params,
}: {
  params: Promise<{ id: string }>; // Next.js 16: params는 Promise
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const { id } = await params;
  const supabase =
    viewer.kind === "pin" ? createAdminClient() : await createClient();
  const { data } = await supabase
    .from("media")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const media = data as MediaItem | null;
  if (!media) notFound();

  const isAdmin = viewer.kind === "member" && viewer.role === "admin";
  const src = `/api/media/${media.id}`;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← 갤러리
        </Link>
        <MediaActions id={media.id} isAdmin={isAdmin} />
      </div>

      <div className="flex flex-1 items-center justify-center rounded-xl bg-black">
        {media.kind === "video" ? (
          <video
            src={src}
            controls
            playsInline
            className="max-h-[75dvh] w-full rounded-xl"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={media.original_name}
            className="max-h-[75dvh] w-auto rounded-xl object-contain"
          />
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-neutral-500 sm:grid-cols-4">
        <div>
          <dt className="text-neutral-400">파일명</dt>
          <dd className="truncate text-neutral-700 dark:text-neutral-200">
            {media.original_name}
          </dd>
        </div>
        <div>
          <dt className="text-neutral-400">크기</dt>
          <dd className="text-neutral-700 dark:text-neutral-200">
            {formatSize(media.size)}
          </dd>
        </div>
        <div>
          <dt className="text-neutral-400">촬영/업로드</dt>
          <dd className="text-neutral-700 dark:text-neutral-200">
            {new Date(media.taken_at ?? media.created_at).toLocaleDateString(
              "ko-KR",
            )}
          </dd>
        </div>
        <div>
          <dt className="text-neutral-400">형식</dt>
          <dd className="text-neutral-700 dark:text-neutral-200">
            {media.mime_type}
          </dd>
        </div>
      </dl>
    </main>
  );
}
