import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("label text-mute", className)}>{children}</p>;
}

export function SectionHeading({
  label,
  title,
  intro,
  align = "left",
  className,
}: {
  label?: string;
  title: ReactNode;
  intro?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      {label ? <Label>{label}</Label> : null}
      <h2 className="display text-[clamp(2rem,5vw,3.4rem)]">{title}</h2>
      {intro ? (
        <p className={cn("max-w-xl text-[15px] leading-relaxed text-mute", align === "center" && "mx-auto")}>
          {intro}
        </p>
      ) : null}
    </div>
  );
}

type ButtonVariant = "solid" | "outline" | "ghost";

const buttonBase =
  "inline-flex items-center justify-center gap-2 px-7 py-3.5 text-[12px] uppercase tracking-[0.2em] transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-60";

const buttonVariants: Record<ButtonVariant, string> = {
  solid: "bg-pine text-paper hover:bg-ink",
  outline: "border border-ink/25 text-ink hover:border-ink hover:bg-ink hover:text-paper",
  ghost: "border border-paper/45 text-paper hover:bg-paper hover:text-ink",
};

export function ButtonLink({
  href,
  variant = "solid",
  className,
  children,
  ...rest
}: { href: string; variant?: ButtonVariant } & Omit<ComponentProps<typeof Link>, "href">) {
  return (
    <Link href={href} className={cn(buttonBase, buttonVariants[variant], className)} {...rest}>
      {children}
    </Link>
  );
}

export function Button({
  variant = "solid",
  className,
  children,
  ...rest
}: { variant?: ButtonVariant } & ComponentProps<"button">) {
  return (
    <button className={cn(buttonBase, buttonVariants[variant], className)} {...rest}>
      {children}
    </button>
  );
}

/** İnce çizgili değer satırı — oda/hizmet detaylarında kullanılır. */
export function DetailRow({ term, value }: { term: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-line py-3.5">
      <span className="label text-mute">{term}</span>
      <span className="text-right text-[15px]">{value}</span>
    </div>
  );
}
