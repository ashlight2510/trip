import Image from "next/image";
import Link from "next/link";
import { vlogCatalog } from "@/lib/vlog/catalog";

/** Categorized menu for photo+script vlogs only. */
export function VlogIndex() {
  return (
    <main className="min-h-dvh bg-stone-950 text-white">
      <div className="mx-auto max-w-3xl px-5 pb-16 pt-10 md:px-8 md:pt-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.24em] text-amber-100/80">가상 브이로그</p>
            <h1 className="font-display mt-2 text-4xl md:text-5xl">브이로그</h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/65">
              사진과 짧은 이야기로 보는 하루. 카테고리에서 골라 보세요.
            </p>
          </div>
          <Link href="/" className="text-sm text-amber-100/90 hover:text-white">
            지도로
          </Link>
        </div>

        <nav className="mt-8 flex flex-wrap gap-2" aria-label="카테고리 바로가기">
          {vlogCatalog.map((category) => (
            <a
              key={category.id}
              href={`#${category.id}`}
              className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/85 hover:bg-white/20"
            >
              {category.label}
            </a>
          ))}
        </nav>

        <div className="mt-10 space-y-12">
          {vlogCatalog.map((category) => (
            <section key={category.id} id={category.id} className="scroll-mt-8">
              <h2 className="text-[11px] tracking-[0.22em] text-white/55">{category.label}</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {category.items.map((entry) => (
                  <li key={entry.href}>
                    <Link
                      href={entry.href}
                      className="group flex overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10 transition hover:bg-white/10 hover:ring-white/25"
                    >
                      <div className="relative aspect-[4/3] w-[42%] shrink-0 overflow-hidden bg-stone-900">
                        {entry.cover && (
                          <Image
                            src={entry.cover}
                            alt=""
                            fill
                            sizes="200px"
                            className="object-cover transition duration-500 group-hover:scale-[1.04]"
                          />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col justify-center px-4 py-3">
                        <p className="text-[10px] tracking-[0.18em] text-white/45">
                          {entry.film.seriesLabel ?? entry.film.eyebrow}
                        </p>
                        <p className="font-display mt-1 text-lg leading-snug">{entry.film.title}</p>
                        {entry.film.blurb && (
                          <p className="mt-1.5 line-clamp-2 whitespace-pre-line text-xs leading-relaxed text-white/55">
                            {entry.film.blurb}
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
