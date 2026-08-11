import Image from "next/image";
import Link from "next/link";
import { BookingBar } from "@/components/booking-bar";
import { GalleryStrip } from "@/components/gallery-strip";
import { RoomCard } from "@/components/room-card";
import { ServiceCard } from "@/components/service-card";
import { ButtonLink, Label, SectionHeading } from "@/components/ui";
import { fallbackGallery, heroImage, storyImage } from "@/data/fallback";
import { getRooms, getServices, getSiteInfo } from "@/lib/cms";

export const revalidate = 300;

const stats = [
  { value: "11", label: "Oda" },
  { value: "1912", label: "Taş ev" },
  { value: "2 dk", label: "Çarşıya yürüyüş" },
  { value: "8 m", label: "Havuz" },
];

export default async function HomePage() {
  const [site, rooms, services] = await Promise.all([
    getSiteInfo(),
    getRooms(),
    getServices(),
  ]);

  const featuredRooms = (rooms.filter((room) => room.featured).length
    ? rooms.filter((room) => room.featured)
    : rooms
  ).slice(0, 3);

  const featuredServices = (services.filter((service) => service.featured).length
    ? services.filter((service) => service.featured)
    : services
  ).slice(0, 4);

  return (
    <>
      <section className="relative flex h-[92svh] min-h-[560px] items-end overflow-hidden">
        <Image
          src={heroImage}
          alt={`${site.name} avlusu`}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/45 via-ink/20 to-ink/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/70 via-ink/25 to-transparent" />

        <div className="fade relative mx-auto w-full max-w-[1240px] px-5 pb-20 text-paper sm:px-8 sm:pb-28">
          <p className="label text-paper/80">
            {site.district} · Butik Otel
          </p>
          <h1 className="display mt-6 text-[clamp(3rem,11vw,7.5rem)]">{site.name}</h1>
          <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-paper/85">{site.tagline}</p>
          <div className="mt-10 flex flex-wrap gap-4">
            <ButtonLink href="/rezervasyon">Rezervasyon</ButtonLink>
            <ButtonLink href="/odalar" variant="ghost">
              Odaları gör
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-8 w-full max-w-[1080px] px-5 sm:-mt-10 sm:px-8">
        <div className="border border-line bg-paper shadow-[0_24px_60px_-40px_rgba(35,32,28,0.55)]">
          <BookingBar />
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1240px] items-center gap-14 px-5 py-24 sm:px-8 sm:py-32 lg:grid-cols-2 lg:gap-20">
        <div className="relative aspect-[4/5] overflow-hidden bg-wash">
          <Image
            src={storyImage}
            alt={`${site.name} iç avlu`}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </div>

        <div className="flex flex-col gap-7">
          <SectionHeading label="Ev hakkında" title="Otelden çok bir ev, evden biraz fazlası" />
          {site.intro.map((paragraph) => (
            <p key={paragraph} className="text-[16px] leading-[1.85] text-mute">
              {paragraph}
            </p>
          ))}

          <dl className="mt-4 grid grid-cols-2 gap-y-8 border-t border-line pt-8 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-1.5">
                <dt className="display text-[34px]">{stat.value}</dt>
                <dd className="label text-mute">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="bg-wash py-24 sm:py-32">
        <div className="mx-auto w-full max-w-[1240px] px-5 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading
              label="Odalar"
              title="On bir oda, on bir farklı sabah"
              intro="Hiçbiri diğerine benzemiyor; hepsi aynı taş duvarın içinde."
            />
            <Link href="/odalar" className="underline-sweep label pb-2 text-pine">
              Tüm odalar →
            </Link>
          </div>

          <div className="mt-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
            {featuredRooms.map((room, index) => (
              <RoomCard key={room.slug} room={room} priority={index === 0} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1240px] px-5 py-24 sm:px-8 sm:py-32">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            label="Hizmetler"
            title="Günü nasıl geçireceğinize dair birkaç fikir"
            intro="Kahvaltıdan hamama, bisikletten akşam masasına — hepsi evin kendi ritminde."
          />
          <Link href="/hizmetler" className="underline-sweep label pb-2 text-pine">
            Tüm hizmetler →
          </Link>
        </div>

        <div className="mt-16 grid gap-12 sm:grid-cols-2">
          {featuredServices.map((service, index) => (
            <ServiceCard
              key={service.slug}
              service={service}
              ratio={index % 3 === 0 ? "aspect-[4/3]" : "aspect-[5/4]"}
              className={index % 3 === 0 ? "sm:col-span-2" : ""}
            />
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-wash py-20">
        <div className="mx-auto mb-10 w-full max-w-[1240px] px-5 sm:px-8">
          <Label>Evden kareler</Label>
        </div>
        <GalleryStrip images={fallbackGallery} />
      </section>

      <section className="bg-pine px-5 py-24 text-paper sm:px-8 sm:py-32">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col items-start gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-6">
            <p className="label text-paper/70">Rezervasyon</p>
            <h2 className="display max-w-2xl text-[clamp(2.2rem,5vw,3.6rem)]">
              Tarihlerinizi yazın, uygunluğu aynı gün dönelim
            </h2>
            <p className="max-w-lg text-[15px] leading-relaxed text-paper/80">
              Ön ödeme almıyoruz. Talebiniz bize ulaştıktan sonra oda seçimini birlikte
              netleştiriyoruz.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <ButtonLink href="/rezervasyon" variant="ghost">
              Rezervasyon formu
            </ButtonLink>
            <a href={`tel:${site.phone.replace(/\s/g, "")}`} className="underline-sweep text-[15px]">
              {site.phone}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
