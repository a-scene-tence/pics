import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";

export default function Header({ isAdmin }: { isAdmin: boolean }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
      <Link href="/" className="text-lg font-semibold">
        우리 아이 앨범
      </Link>
      <nav className="flex items-center gap-2 text-sm">
        {isAdmin && (
          <>
            <Link
              href="/upload"
              className="rounded-lg bg-amber-500 px-3 py-1.5 font-medium text-white hover:bg-amber-600"
            >
              업로드
            </Link>
            <Link
              href="/members"
              className="rounded-lg px-3 py-1.5 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              멤버
            </Link>
          </>
        )}
        <SignOutButton />
      </nav>
    </header>
  );
}
