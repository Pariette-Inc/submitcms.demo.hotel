import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AvailabilityCalendar } from "@/components/availability-calendar";
import { RoomCard } from "@/components/room-card";
import { ButtonLink, DetailRow, Label } from "@/components/ui";
import { ViewPing } from "@/components/view-ping";
import { getRelatedRooms, getRoom, getRooms, getSiteInfo } from "@/lib/cms";
import { CONTENT_TYPES } from "@/lib/content";
import { formatPrice } from "@/lib/utils";

export const revalidate = 300;

export async function generateStaticParams() {
  const rooms = await getRooms();
  return rooms.map((room) => ({ slug: room.slug }));
}

export async function generateMetadata(
  props: PageProps<"/odalar/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const room = await getRoom(slug);
  if (!room) return { title: "Oda bulunamadı" };

  return {
    title: room.name,
    description: room.summary,
    alternates: { canonical: `/odalar/${room.slug}` },
    openGraph: {
      title: room.name,
      description: room.summary,
      images: room.image ? [{ url: room.image }] : undefined,
    },
  };
}

export default async function RoomPage(props: PageProps<"/odalar/[slug]">) {
  const { slug } = await props.params;
  // `others` submitcms'in kendi önerisidir (`delivery.alsoRead`); tip açılmamışsa
  // aynı listeden kendisi dışındakilere düşer.
  const [room, others, site] = await Promise.all([
    getRoom(slug),
    getRelatedRooms(slug),
    getSiteInfo(),
  ]);

  if (!room) notFound();

  return (
    <>
      <ViewPing type={CONTENT_TYPES.room} slug={slug} />

      <section className="px-5 pb-12 pt-[132px] sm:px-8 sm:pt-[160px]">
        <div className="mx-auto w-full max-w-[1240px]">
          <Link href="/odalar" className="underline-sweep label text-mute">
            ← Odalar
          </Link>
          <h1 className="display mt-6 text-[clamp(2.6rem,7vw,4.6rem)]">{room.name}</h1>
          <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-mute">{room.summary}</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1240px] px-5 sm:px-8">
        <div className="relative aspect-[16/10] overflow-hidden bg-wash">
          <Image
            src={room.image}
            alt={room.name}
            fill
            priority
            sizes="(max-width: 1240px) 100vw, 1240px"
            className="object-cover"
          />
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1240px] gap-16 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[1.5fr_1fr] lg:gap-24">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-6">
            {room.description.map((paragraph) => (
              <p key={paragraph} className="text-[16px] leading-[1.9] text-mute">
                {paragraph}
              </p>
            ))}
          </div>

          {room.amenities.length ? (
            <div className="flex flex-col gap-5 border-t border-line pt-10">
              <Label>Odada</Label>
              <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {room.amenities.map((amenity) => (
                  <li key={amenity} className="flex items-start gap-3 text-[15px]">
                    <span className="mt-2 h-1 w-1 shrink-0 bg-pine" />
                    {amenity}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <aside className="h-fit lg:sticky lg:top-28">
          <div className="border border-line bg-wash p-8">
            {room.price > 0 ? (
              <div className="mb-6 flex items-baseline gap-2">
                <span className="display text-[38px]">{formatPrice(room.price, room.currency)}</span>
                <span className="text-[13px] text-mute">/ gece</span>
              </div>
            ) : (
              <p className="mb-6 text-[15px] text-mute">Fiyat için bize yazın.</p>
            )}

            <div className="flex flex-col">
              <DetailRow term="Kapasite" value={`${room.capacity} kişi`} />
              {room.size ? <DetailRow term="Alan" value={`${room.size} m²`} /> : null}
              {room.bed ? <DetailRow term="Yatak" value={room.bed} /> : null}
              {room.view ? <DetailRow term="Manzara" value={room.view} /> : null}
              <DetailRow term="Giriş / Çıkış" value={`${site.checkIn} / ${site.checkOut}`} />
            </div>

            <ButtonLink
              href={`/rezervasyon?oda=${room.slug}`}
              className="mt-8 w-full"
            >
              Bu odayı iste
            </ButtonLink>

            <p className="mt-4 text-center text-[12px] leading-relaxed text-mute">
              Ön ödeme yok. Uygunluğu 12 saat içinde teyit ediyoruz.
            </p>

            <AvailabilityCalendar slug={room.slug} currency={room.currency} />
          </div>
        </aside>
      </section>

      {room.gallery.length ? (
        <section className="mx-auto grid w-full max-w-[1240px] gap-4 px-5 pb-24 sm:grid-cols-2 sm:px-8">
          {room.gallery.map((src, index) => (
            <div key={src} className="relative aspect-[4/3] overflow-hidden bg-wash">
              <Image
                src={src}
                alt={`${room.name} — kare ${index + 1}`}
                fill
                sizes="(max-width: 640px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          ))}
        </section>
      ) : null}

      {others.length ? (
        <section className="border-t border-line bg-wash px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto w-full max-w-[1240px]">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <h2 className="display text-[clamp(1.9rem,4vw,2.8rem)]">Diğer odalar</h2>
              <Link href="/odalar" className="underline-sweep label pb-2 text-pine">
                Tümü →
              </Link>
            </div>
            <div className="mt-14 grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((item) => (
                <RoomCard key={item.slug} room={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
