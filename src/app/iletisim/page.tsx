import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { PageHeader } from "@/components/page-header";
import { Label } from "@/components/ui";
import { getSiteInfo } from "@/lib/cms";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "İletişim",
  description: "Adres, telefon, e-posta ve ulaşım bilgileri; sorularınız için iletişim formu.",
  alternates: { canonical: "/iletisim" },
};

export default async function ContactPage() {
  const site = await getSiteInfo();

  return (
    <>
      <PageHeader
        label="İletişim"
        title="Kapımız açık, telefonumuz da"
        intro="Rezervasyon dışındaki her şey için buradan yazabilirsiniz: ulaşım, özel günler, uzun konaklama, iş birliği."
      />

      <section className="mx-auto grid w-full max-w-[1240px] gap-16 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[1.4fr_1fr] lg:gap-24">
        <ContactForm />

        <aside className="flex h-fit flex-col gap-10">
          <div className="flex flex-col gap-4">
            <Label>Adres</Label>
            <address className="text-[16px] leading-relaxed not-italic">
              {site.address}
              <br />
              {site.district}
            </address>
            <a
              href={site.mapUrl}
              target="_blank"
              rel="noreferrer"
              className="underline-sweep w-fit text-[14px] text-pine"
            >
              Haritada aç →
            </a>
          </div>

          <div className="flex flex-col gap-3 border-t border-line pt-8">
            <Label>Telefon</Label>
            <a
              href={`tel:${site.phone.replace(/\s/g, "")}`}
              className="underline-sweep w-fit text-[16px]"
            >
              {site.phone}
            </a>
            <p className="text-[14px] text-mute">WhatsApp: {site.whatsapp}</p>
          </div>

          <div className="flex flex-col gap-3 border-t border-line pt-8">
            <Label>E-posta</Label>
            <a href={`mailto:${site.email}`} className="underline-sweep w-fit text-[16px]">
              {site.email}
            </a>
          </div>

          <div className="flex flex-col gap-3 border-t border-line pt-8">
            <Label>Ulaşım</Label>
            <ul className="flex flex-col gap-2.5 text-[14px] leading-relaxed text-mute">
              <li>İzmir Adnan Menderes Havalimanı — 80 km, yaklaşık 1 saat.</li>
              <li>Alaçatı çarşısına yürüyerek 2 dakika.</li>
              <li>Ilıca ve Çark plajlarına 6 km.</li>
              <li>Kapı önünde ücretsiz otopark.</li>
            </ul>
          </div>
        </aside>
      </section>
    </>
  );
}
