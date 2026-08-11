import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ServiceCard } from "@/components/service-card";
import { ButtonLink, DetailRow, Label } from "@/components/ui";
import { getService, getServices } from "@/lib/cms";

export const revalidate = 300;

export async function generateStaticParams() {
  const services = await getServices();
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata(
  props: PageProps<"/hizmetler/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const service = await getService(slug);
  if (!service) return { title: "Hizmet bulunamadı" };

  return {
    title: service.name,
    description: service.summary,
    alternates: { canonical: `/hizmetler/${service.slug}` },
    openGraph: {
      title: service.name,
      description: service.summary,
      images: service.image ? [{ url: service.image }] : undefined,
    },
  };
}

export default async function ServicePage(props: PageProps<"/hizmetler/[slug]">) {
  const { slug } = await props.params;
  const [service, services] = await Promise.all([getService(slug), getServices()]);

  if (!service) notFound();

  const others = services.filter((item) => item.slug !== service.slug).slice(0, 2);

  return (
    <>
      <section className="px-5 pb-12 pt-[132px] sm:px-8 sm:pt-[160px]">
        <div className="mx-auto w-full max-w-[1240px]">
          <Link href="/hizmetler" className="underline-sweep label text-mute">
            ← Hizmetler
          </Link>
          <h1 className="display mt-6 text-[clamp(2.6rem,7vw,4.6rem)]">{service.name}</h1>
          <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-mute">{service.summary}</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1240px] px-5 sm:px-8">
        <div className="relative aspect-[16/9] overflow-hidden bg-wash">
          <Image
            src={service.image}
            alt={service.name}
            fill
            priority
            sizes="(max-width: 1240px) 100vw, 1240px"
            className="object-cover"
          />
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1240px] gap-16 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[1.5fr_1fr] lg:gap-24">
        <div className="flex flex-col gap-6">
          {service.description.map((paragraph) => (
            <p key={paragraph} className="text-[16px] leading-[1.9] text-mute">
              {paragraph}
            </p>
          ))}
        </div>

        <aside className="h-fit border border-line bg-wash p-8 lg:sticky lg:top-28">
          <div className="flex flex-col">
            {service.hours ? <DetailRow term="Saatler" value={service.hours} /> : null}
            {service.location ? <DetailRow term="Yer" value={service.location} /> : null}
          </div>

          {service.highlights.length ? (
            <div className="mt-8 flex flex-col gap-4">
              <Label>Detaylar</Label>
              <ul className="flex flex-col gap-2.5">
                {service.highlights.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[15px]">
                    <span className="mt-2 h-1 w-1 shrink-0 bg-pine" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <ButtonLink href="/rezervasyon" className="mt-8 w-full">
            Rezervasyon
          </ButtonLink>
        </aside>
      </section>

      {others.length ? (
        <section className="border-t border-line bg-wash px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto w-full max-w-[1240px]">
            <h2 className="display text-[clamp(1.9rem,4vw,2.8rem)]">Bunlar da var</h2>
            <div className="mt-14 grid gap-12 sm:grid-cols-2">
              {others.map((item) => (
                <ServiceCard key={item.slug} service={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
