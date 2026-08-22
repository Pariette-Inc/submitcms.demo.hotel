import type { Metadata } from "next";
import { BookingReference } from "@/components/booking-reference";
import { ButtonLink, Label } from "@/components/ui";
import { getSiteInfo } from "@/lib/cms";

export const metadata: Metadata = {
  title: "Talebiniz alındı",
  description: "Rezervasyon talebiniz bize ulaştı.",
  robots: { index: false, follow: false },
};

const steps = [
  {
    title: "Uygunluğu kontrol ediyoruz",
    detail: "Tarihlerinize uyan odaları defterden bakıp ayırıyoruz.",
  },
  {
    title: "Size dönüyoruz",
    detail: "En geç 12 saat içinde e-posta ya da telefonla teyit ve fiyat bilgisi geliyor.",
  },
  {
    title: "Odayı sizin adınıza yazıyoruz",
    detail: "Onayınızdan sonra ön ödeme istemeden rezervasyonu kesinleştiriyoruz.",
  },
];

export default async function ReservationSuccessPage() {
  const site = await getSiteInfo();

  return (
    <section className="px-5 pb-28 pt-[150px] sm:px-8 sm:pt-[190px]">
      <div className="mx-auto w-full max-w-[820px]">
        <Label>Rezervasyon</Label>
        <h1 className="display mt-5 text-[clamp(2.6rem,7vw,4.4rem)]">Talebiniz elimizde</h1>
        <p className="mt-7 max-w-2xl text-[17px] leading-relaxed text-mute">
          Teşekkür ederiz. Formunuzu aldık; buradan sonrası bizde.
        </p>

        <BookingReference />

        <ol className="mt-16 flex flex-col">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-8 border-t border-line py-8">
              <span className="display text-[26px] text-pine">0{index + 1}</span>
              <div className="flex flex-col gap-2">
                <h2 className="text-[17px]">{step.title}</h2>
                <p className="text-[15px] leading-relaxed text-mute">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-14 flex flex-col gap-6 border-t border-line pt-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <p className="text-[15px]">Aklınıza bir şey takılırsa:</p>
            <a
              href={`tel:${site.phone.replace(/\s/g, "")}`}
              className="display underline-sweep w-fit text-[26px]"
            >
              {site.phone}
            </a>
          </div>
          <ButtonLink href="/" variant="outline">
            Ana sayfaya dön
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
