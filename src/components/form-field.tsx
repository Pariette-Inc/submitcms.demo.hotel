import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const inputClass =
  "w-full border-b border-line bg-transparent py-3 text-[15px] outline-none transition-colors focus:border-pine";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="label text-mute">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-[12px] text-[#a4442f]">{error}</p>
      ) : hint ? (
        <p className="text-[12px] text-mute">{hint}</p>
      ) : null}
    </div>
  );
}
