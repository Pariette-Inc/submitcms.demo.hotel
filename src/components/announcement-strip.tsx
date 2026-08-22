import Image from "next/image";
import Link from "next/link";
import type { Banner } from "@/lib/content";

/**
 * Panelde tanımlı duyurular (`delivery.banners()`). Hiç banner yoksa hiçbir
 * şey çizilmez — boş bir şerit sayfayı bozardı.
 */
export function AnnouncementStrip({ banners }: { banners: Banner[] }) {
  if (!banners.length) return null;

  return (
    <div className="hide-scrollbar mt-12 flex gap-6 overflow-x-auto bg-pine px-5 py-2.5 sm:px-8">
      {banners.map((banner) => {
        const content = (
          <span className="flex items-center gap-3">
            {banner.image ? (
              <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full">
                <Image
                  src={banner.image}
                  alt={banner.alt || banner.title}
                  fill
                  sizes="28px"
                  className="object-cover"
                />
              </span>
            ) : null}
            <span className="text-[12px] tracking-[0.06em] text-paper">
              {banner.title || banner.alt}
            </span>
          </span>
        );

        return banner.href ? (
          <Link
            key={banner.id}
            href={banner.href}
            className="shrink-0 transition-opacity hover:opacity-80"
          >
            {content}
          </Link>
        ) : (
          <span key={banner.id} className="shrink-0">
            {content}
          </span>
        );
      })}
    </div>
  );
}
