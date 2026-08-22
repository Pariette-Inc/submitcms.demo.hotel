"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { NavItem } from "@/lib/content";
import { cn } from "@/lib/utils";

export function SiteHeader({
  siteName,
  phone,
  nav,
}: {
  siteName: string;
  phone: string;
  /** `delivery.menu("ana-menu")` ağacı; menü açılmamışsa kodda tanımlı varsayılan. */
  nav: NavItem[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const overHero = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const light = overHero && !scrolled && !open;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-500",
        light ? "text-paper" : "border-b border-line bg-paper/95 text-ink backdrop-blur",
      )}
    >
      <div className="mx-auto flex h-[72px] w-full max-w-[1240px] items-center justify-between gap-6 px-5 sm:px-8">
        <Link href="/" className="display text-[22px] tracking-[0.02em]">
          {siteName}
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              target={item.target}
              rel={item.external ? "noreferrer" : undefined}
              className={cn(
                "underline-sweep text-[12px] uppercase tracking-[0.2em]",
                !item.external &&
                  pathname.startsWith(item.href) &&
                  "bg-[length:100%_1px]",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="hidden text-[12px] tracking-[0.14em] lg:block"
          >
            {phone}
          </a>
          <Link
            href="/rezervasyon"
            className={cn(
              "hidden px-6 py-3 text-[11px] uppercase tracking-[0.2em] transition-colors duration-300 sm:inline-flex",
              light
                ? "border border-paper/60 text-paper hover:bg-paper hover:text-ink"
                : "bg-pine text-paper hover:bg-ink",
            )}
          >
            Rezervasyon
          </Link>

          <button
            type="button"
            aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="flex h-10 w-10 flex-col items-center justify-center gap-[5px] md:hidden"
          >
            <span
              className={cn(
                "h-px w-6 bg-current transition-transform duration-300",
                open && "translate-y-[3px] rotate-45",
              )}
            />
            <span
              className={cn(
                "h-px w-6 bg-current transition-transform duration-300",
                open && "-translate-y-[3px] -rotate-45",
              )}
            />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden bg-paper text-ink transition-[max-height] duration-500 md:hidden",
          open ? "max-h-[420px] border-b border-line" : "max-h-0",
        )}
      >
        <nav className="mx-auto flex w-full max-w-[1240px] flex-col px-5 pb-8 sm:px-8">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              target={item.target}
              rel={item.external ? "noreferrer" : undefined}
              onClick={() => setOpen(false)}
              className="display border-b border-line py-5 text-[30px]"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/rezervasyon"
            onClick={() => setOpen(false)}
            className="mt-6 bg-pine px-6 py-4 text-center text-[11px] uppercase tracking-[0.2em] text-paper"
          >
            Rezervasyon
          </Link>
          <a href={`tel:${phone.replace(/\s/g, "")}`} className="mt-4 text-center text-[13px] text-mute">
            {phone}
          </a>
        </nav>
      </div>
    </header>
  );
}
