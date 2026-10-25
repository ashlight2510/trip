import Link from "next/link";
import { courses } from "@/data/courses";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-6 py-16 md:py-24">
      <p className="text-sm tracking-[0.3em] text-stone-500">풍경너머</p>
      <h1 className="mt-4 text-4xl font-bold leading-tight md:text-6xl">
        떠나기 전에,
        <br />
        먼저 가보는 여행
      </h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-stone-600">
        로드뷰로 그 장소에 서서, 파도와 바람과 사람들의 소리를 들어보세요. 고개를 돌리면 소리도 함께 따라와요.
      </p>

      <section className="mt-14 grid gap-5 md:grid-cols-2">
        {courses.map((course) => (
          <Link
            key={course.id}
            href={`/trip/${course.id}`}
            className="group relative flex min-h-56 flex-col justify-end overflow-hidden rounded-3xl p-6 text-white shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
            style={{ background: `linear-gradient(160deg, ${course.cover[0]}, ${course.cover[1]})` }}
          >
            <p className="text-xs text-white/75">{course.stops.length}곳</p>
            <h2 className="mt-1 text-2xl font-bold">{course.title}</h2>
            <p className="mt-2 text-sm text-white/85">{course.subtitle}</p>
            <span className="mt-4 text-sm font-semibold opacity-80 group-hover:opacity-100">가상여행 떠나기 →</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
