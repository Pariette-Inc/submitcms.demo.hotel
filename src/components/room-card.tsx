import Image from "next/image";
import Link from "next/link";
import type { Room } from "@/lib/content";
import { cn, formatPrice } from "@/lib/utils";

export function RoomCard({
  room,
  priority = false,
  className,
}: {
  room: Room;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Link href={`/odalar/${room.slug}`} className={cn("group flex flex-col gap-5", className)}>
      <div className="relative aspect-[4/5] overflow-hidden bg-wash">
        <Image
          src={room.image}
          alt={room.name}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-105"
        />
        {room.size ? (
          <span className="absolute left-4 top-4 bg-paper/90 px-3 py-1.5 text-[11px] tracking-[0.16em] text-ink">
            {room.size} m²
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="display text-[26px]">{room.name}</h3>
          <span className="shrink-0 text-[13px] text-mute">{room.capacity} kişi</span>
        </div>
        <p className="text-[14px] leading-relaxed text-mute">{room.summary}</p>
        <div className="mt-2 flex items-center justify-between border-t border-line pt-3.5">
          <span className="text-[14px]">
            {room.price > 0 ? (
              <>
                <span className="text-mute">gecelik </span>
                {formatPrice(room.price, room.currency)}
              </>
            ) : (
              <span className="text-mute">Fiyat için sorun</span>
            )}
          </span>
          <span className="label text-pine transition-transform duration-300 group-hover:translate-x-1">
            İncele →
          </span>
        </div>
      </div>
    </Link>
  );
}
