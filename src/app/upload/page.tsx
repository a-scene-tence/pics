import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import Uploader from "@/components/Uploader";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">업로드</h1>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← 갤러리
        </Link>
      </div>
      <Uploader />
    </main>
  );
}
