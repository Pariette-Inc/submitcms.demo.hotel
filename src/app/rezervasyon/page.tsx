import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ReservationForm, type RoomOption } from "@/components/reservation-form";
import { Label } from "@/components/ui";
import { getRooms, getSiteInfo } from "@/lib/cms";
import { isoDate } from "@/lib/utils";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Rezervasyon",
  description:
    "Tarihlerinizi ve kişi sayısını bırakın; uygunluk ve fiyat teyidiyle 12 saat içinde dönelim. Ön ödeme alınmaz.",
  alternates: { canonical: "/rezervasyon" },
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function readParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function ReservationPage(props: PageProps<"/rezervasyon">) {
  const [params, rooms, site] = await Promise.all([
    props.searchParams,
    getRooms(),
    getSiteInfo(),
  ]);

  const requestedIn = readParam(params.giris);
  const requestedOut = readParam(params.cikis);
  const requestedAdults = Number(readParam(params.yetiskin));
  const requestedRoom = readParam(params.oda);

  const checkIn = datePattern.test(requestedIn) ? requestedIn : isoDate(1);
  const checkOut =
    datePattern.test(requestedOut) && requestedOut > checkIn ? requestedOut : isoDate(3);
  const adults =
    Number.isInteger(requestedAdults) && requestedAdults >= 1 && requestedAdults <= 6
      ? String(requestedAdults)
      : "2";
  const room = rooms.some((item) => item.slug === requestedRoom) ? requestedRoom : "";

  const options: RoomOption[] = rooms.map((item) => ({
    slug: item.slug,
    name: item.name,
    price: item.price,
    currency: item.currency,
    capacity: item.capacity,
  }));

  return (
    <>
      <PageHeader
        label="Rezervasyon"
        title="Birkaç satır yazın, gerisini konuşalım"
        intro="Otomatik onay veren bir sistem kurmadık — hangi odanın size uyacağını bilmek istiyoruz. Formu doldurun, aynı gün içinde dönelim."
      />

      <section className="mx-auto grid w-full max-w-[1240px] gap-16 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[1.6fr_1fr] lg:gap-24">
        <ReservationForm rooms={options} defaults={{ checkIn, checkOut, adults, room }} />

        <aside className="flex h-fit flex-col gap-10 border border-line bg-wash p-8 lg:sticky lg:top-28">
          <div className="flex flex-col gap-4">
            <Label>Daha hızlısı</Label>
            <a
              href={`tel:${site.phone.replace(/\s/g, "")}`}
              className="display underline-sweep w-fit text-[26px]"
            >
              {site.phone}
            </a>
            <p className="text-[14px] leading-relaxed text-mute">
              Hafta içi 09.00–20.00 arası telefonla ulaşabilirsiniz. WhatsApp: {site.whatsapp}
            </p>
          </div>

          <div className="flex flex-col gap-4 border-t border-line pt-8">
            <Label>Bilmeniz gerekenler</Label>
            <ul className="flex flex-col gap-3 text-[14px] leading-relaxed text-mute">
              <li>Giriş {site.checkIn}, çıkış {site.checkOut}.</li>
              <li>Kahvaltı, havuz ve bisiklet kullanımı fiyata dahil.</li>
              <li>Girişten 7 gün öncesine kadar ücretsiz iptal.</li>
              <li>Ev sakin bir ev; 12 yaş altı için bağ evini öneriyoruz.</li>
              <li>Evcil dostlar bağ evinde ağırlanır.</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3 border-t border-line pt-8">
            <Label>Adres</Label>
            <address className="text-[14px] leading-relaxed not-italic text-mute">
              {site.address}
              <br />
              {site.district}
            </address>
          </div>
        </aside>
      </section>
    </>
  );
}
