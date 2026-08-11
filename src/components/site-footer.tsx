import Link from "next/link";
import type { SiteInfo } from "@/lib/content";
import { Label } from "@/components/ui";

export function SiteFooter({ site }: { site: SiteInfo }) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-wash">
      <div className="mx-auto w-full max-w-[1240px] px-5 py-20 sm:px-8">
        <div className="grid gap-14 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="flex flex-col gap-5">
            <p className="display text-[34px]">{site.name}</p>
            <p className="max-w-sm text-[15px] leading-relaxed text-mute">{site.tagline}</p>
            <Link
              href="/rezervasyon"
              className="mt-2 inline-flex w-fit bg-pine px-7 py-3.5 text-[11px] uppercase tracking-[0.2em] text-paper transition-colors duration-300 hover:bg-ink"
            >
              Oda Ayırt
            </Link>
          </div>

          <div className="flex flex-col gap-4">
            <Label>Adres</Label>
            <address className="text-[15px] leading-relaxed not-italic">
              {site.address}
              <br />
              {site.district}
            </address>
            <a
              href={site.mapUrl}
              target="_blank"
              rel="noreferrer"
              className="underline-sweep w-fit text-[13px] text-pine"
            >
              Haritada aç
            </a>
          </div>

          <div className="flex flex-col gap-4">
            <Label>İletişim</Label>
            <a href={`tel:${site.phone.replace(/\s/g, "")}`} className="underline-sweep w-fit text-[15px]">
              {site.phone}
            </a>
            <a href={`mailto:${site.email}`} className="underline-sweep w-fit text-[15px]">
              {site.email}
            </a>
            <p className="text-[13px] text-mute">
              Giriş {site.checkIn} · Çıkış {site.checkOut}
            </p>
            <a
              href={site.instagram}
              target="_blank"
              rel="noreferrer"
              className="underline-sweep w-fit text-[13px] text-pine"
            >
              Instagram
            </a>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-line pt-8 text-[12px] text-mute sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {site.name}. Tüm hakları saklıdır.
          </p>
          <p>
            İçerik yönetimi{" "}
            <a
              href="https://submitcms.com"
              target="_blank"
              rel="noreferrer"
              className="underline-sweep text-ink"
            >
              submitcms
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
