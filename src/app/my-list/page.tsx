import Link from "next/link";

export const metadata = {
  title: "내 리스트 · 풍경너머",
};

export default function MyListPage() {
  return (
    <main className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-2xl px-5 pb-16 pt-10">
        <p className="text-xs tracking-[0.28em] text-stone-500">풍경너머</p>
        <h1 className="font-display mt-2 text-4xl md:text-5xl">내 리스트</h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-600">
          정적 배포(GitHub Pages)에서는 리스트 저장을 지원하지 않습니다.
        </p>
        <Link href="/" className="mt-8 inline-block text-sm text-sky-800 underline-offset-2 hover:underline">
          지도로 돌아가기
        </Link>
      </div>
    </main>
  );
}
