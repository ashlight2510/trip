"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { vlogCatalog } from "@/lib/vlog/catalog";

/** Compact categorized film switcher for the player chrome. */
export function VlogFilmNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div ref={rootRef} className="relative">
      <div className="flex items-center gap-1.5">
        <Link
          href="/vlog"
          className="rounded-full bg-white/15 px-3 py-1 text-xs text-white hover:bg-white/25"
        >
          목록
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
          className="rounded-full bg-white/15 px-3 py-1 text-xs text-white hover:bg-white/25"
        >
          다른 브이로그
        </button>
      </div>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-40 mt-2 max-h-[min(70dvh,28rem)] w-[min(18rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl bg-stone-950/95 p-2 shadow-xl ring-1 ring-white/15 backdrop-blur"
        >
          {vlogCatalog.map((category) => (
            <div key={category.id} className="px-1 py-1.5">
              <p className="px-2 pb-1 text-[10px] tracking-[0.18em] text-white/45">{category.label}</p>
              <ul className="space-y-0.5">
                {category.items.map((entry) => {
                  const active = pathname === entry.href;
                  return (
                    <li key={entry.href}>
                      <Link
                        role="menuitem"
                        href={entry.href}
                        aria-current={active ? "page" : undefined}
                        className={`block rounded-xl px-3 py-2 text-sm ${
                          active ? "bg-white text-stone-900" : "text-white/85 hover:bg-white/10"
                        }`}
                      >
                        {entry.film.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
