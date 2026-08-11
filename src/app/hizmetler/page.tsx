import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ServiceCard } from "@/components/service-card";
import { ButtonLink } from "@/components/ui";
import { getServices } from "@/lib/cms";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Hizmetler",
  description:
    "Bahçe kahvaltısı, hamam ve masaj, havuz, akşam mutfağı, bisiklet turları ve özel etkinlikler.",
  alternates: { canonical: "/hizmetler" },
};

export default async function ServicesPage() {
  const services = await getServices();

  return (
    <>
      <PageHeader
        label="Hizmetler"
        title="Evin gündelik ritmi"
        intro="Hiçbiri zorunlu değil. Sabah kahvaltıya inmeyip odanızda kalmak da bu listenin bir parçası."
      />

      <section className="mx-auto w-full max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-14 sm:grid-cols-2">
          {services.map((service, index) => (
            <ServiceCard
              key={service.slug}
              service={service}
              ratio={index === 0 ? "aspect-[16/9]" : "aspect-[5/4]"}
              className={index === 0 ? "sm:col-span-2" : ""}
            />
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-wash px-5 py-20 sm:px-8">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3">
            <h2 className="display text-[clamp(1.8rem,4vw,2.8rem)]">Aklınızda başka bir şey mi var?</h2>
            <p className="max-w-xl text-[15px] leading-relaxed text-mute">
              Doğum günü sofrası, tekne günü, transfer, bebek yatağı… Rezervasyon formundaki not
              alanına yazmanız yeterli.
            </p>
          </div>
          <ButtonLink href="/iletisim" variant="outline">
            Bize yazın
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
