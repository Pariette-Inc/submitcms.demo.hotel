import Image from "next/image";
import Link from "next/link";
import type { Service } from "@/lib/content";
import { cn } from "@/lib/utils";

export function ServiceCard({
  service,
  className,
  ratio = "aspect-[5/4]",
}: {
  service: Service;
  className?: string;
  ratio?: string;
}) {
  return (
    <Link href={`/hizmetler/${service.slug}`} className={cn("group flex flex-col gap-5", className)}>
      <div className={cn("relative overflow-hidden bg-wash", ratio)}>
        <Image
          src={service.image}
          alt={service.name}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-105"
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <h3 className="display text-[26px]">{service.name}</h3>
        <p className="text-[14px] leading-relaxed text-mute">{service.summary}</p>
        {service.hours ? <p className="label text-pine">{service.hours}</p> : null}
      </div>
    </Link>
  );
}
