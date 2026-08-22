import Image from "next/image";
import type { GalleryImage } from "@/lib/content";

/** `delivery.gallery(slug)` karesi; panelde galeri yoksa demo kareleri gelir. */
export function GalleryStrip({ images }: { images: GalleryImage[] }) {
  if (!images.length) return null;

  return (
    <div className="hide-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 sm:px-8">
      {images.map((image, index) => (
        <div
          key={`${image.src}-${index}`}
          className="relative aspect-[3/4] w-[70vw] shrink-0 snap-start overflow-hidden bg-wash sm:w-[38vw] lg:w-[24vw]"
        >
          <Image
            src={image.src}
            alt={image.alt || `Otelden kare ${index + 1}`}
            fill
            sizes="(max-width: 640px) 70vw, (max-width: 1024px) 38vw, 24vw"
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}
