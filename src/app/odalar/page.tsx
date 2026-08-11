import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { RoomCard } from "@/components/room-card";
import { ButtonLink } from "@/components/ui";
import { getRooms, getSiteInfo } from "@/lib/cms";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Odalar",
  description:
    "Bahçe odasından bağ evine; on bir odanın her biri için alan, yatak, manzara ve gecelik fiyat bilgisi.",
  alternates: { canonical: "/odalar" },
};

export default async function RoomsPage() {
  const [rooms, site] = await Promise.all([getRooms(), getSiteInfo()]);

  return (
    <>
      <PageHeader
        label="Odalar"
        title="Her biri evin başka bir köşesinde"
        intro="Odaların büyüklüğü de ışığı da farklı. Kararsız kalırsanız bize yazın; kaç kişi geldiğinizi ve ne aradığınızı söyleyin, biz önerelim."
      />

      <section className="mx-auto w-full max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-14 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room, index) => (
            <RoomCard key={room.slug} room={room} priority={index < 3} />
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-wash px-5 py-20 sm:px-8">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3">
            <h2 className="display text-[clamp(1.8rem,4vw,2.8rem)]">Fiyatlara neler dahil?</h2>
            <p className="max-w-xl text-[15px] leading-relaxed text-mute">
              Bahçe kahvaltısı, havuz ve güneş terası, bisiklet kullanımı ve Wi-Fi tüm odalarda
              dahildir. Giriş {site.checkIn}, çıkış {site.checkOut}.
            </p>
          </div>
          <ButtonLink href="/rezervasyon">Uygunluk sor</ButtonLink>
        </div>
      </section>
    </>
  );
}
