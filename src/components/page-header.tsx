import type { ReactNode } from "react";
import { Label } from "@/components/ui";

/** Alt sayfaların üst bloğu — sabit başlık yüksekliğini de karşılar. */
export function PageHeader({
  label,
  title,
  intro,
  children,
}: {
  label: string;
  title: string;
  intro?: string;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-line px-5 pb-16 pt-[132px] sm:px-8 sm:pb-20 sm:pt-[160px]">
      <div className="mx-auto w-full max-w-[1240px]">
        <Label>{label}</Label>
        <h1 className="display mt-5 max-w-3xl text-[clamp(2.6rem,7vw,4.8rem)]">{title}</h1>
        {intro ? (
          <p className="mt-7 max-w-2xl text-[16px] leading-relaxed text-mute">{intro}</p>
        ) : null}
        {children}
      </div>
    </section>
  );
}
