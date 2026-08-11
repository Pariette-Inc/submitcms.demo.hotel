import { ButtonLink, Label } from "@/components/ui";

export default function NotFound() {
  return (
    <section className="px-5 pb-28 pt-[150px] sm:px-8 sm:pt-[190px]">
      <div className="mx-auto flex w-full max-w-[820px] flex-col items-start gap-7">
        <Label>404</Label>
        <h1 className="display text-[clamp(2.6rem,7vw,4.4rem)]">Bu kapı başka bir yere açılıyor</h1>
        <p className="max-w-xl text-[16px] leading-relaxed text-mute">
          Aradığınız sayfayı bulamadık. Odalara göz atabilir ya da doğrudan rezervasyon
          formuna geçebilirsiniz.
        </p>
        <div className="mt-4 flex flex-wrap gap-4">
          <ButtonLink href="/odalar">Odalar</ButtonLink>
          <ButtonLink href="/" variant="outline">
            Ana sayfa
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
