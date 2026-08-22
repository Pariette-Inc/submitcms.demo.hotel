"use client";

import { useEffect, useMemo, useState } from "react";
import { cn, formatPrice, isoDate } from "@/lib/utils";

type Day = { date: string; available: boolean; price: number };

const WEEKDAYS = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];
const RANGE_DAYS = 60;

/**
 * Oda müsaitlik takvimi — `delivery.reservations.calendar()` (`/api/takvim`).
 *
 * Kalan adet DÖNMEZ ve gösterilmez; yalnız "müsait / dolu" ve o günün fiyatı.
 * Gece sayan odalarda çıkış günü müsait görünür, bu normaldir.
 *
 * Rezervasyon modülü kapalıysa ya da oda rezervasyona açılmamışsa uç
 * `known: false` döner ve bileşen hiç çizilmez.
 */
export function AvailabilityCalendar({
  slug,
  currency = "TRY",
}: {
  slug: string;
  currency?: string;
}) {
  const [days, setDays] = useState<Day[] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "off">("loading");

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const params = new URLSearchParams({
          oda: slug,
          from: isoDate(0),
          to: isoDate(RANGE_DAYS),
        });
        const response = await fetch(`/api/takvim?${params}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          setState("off");
          return;
        }

        const body = (await response.json()) as {
          data?: { known?: boolean; days?: Day[] };
        };

        if (!body.data?.known || !body.data.days?.length) {
          setState("off");
          return;
        }

        setDays(body.data.days);
        setState("ready");
      } catch {
        if (!controller.signal.aborted) setState("off");
      }
    })();

    return () => controller.abort();
  }, [slug]);

  const weeks = useMemo(() => buildWeeks(days ?? []), [days]);

  if (state === "off") return null;

  if (state === "loading") {
    return (
      <div className="mt-8 border-t border-line pt-6">
        <p className="label text-mute">Takvim yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className="mt-8 border-t border-line pt-6">
      <p className="label text-mute">Önümüzdeki {RANGE_DAYS} gün</p>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((day) => (
          <span key={day} className="text-[10px] uppercase tracking-[0.14em] text-mute">
            {day}
          </span>
        ))}

        {weeks.map((cell, index) =>
          cell ? (
            <span
              key={cell.date}
              title={
                cell.available
                  ? `${cell.date} — ${formatPrice(cell.price, currency)}`
                  : `${cell.date} — dolu`
              }
              className={cn(
                "flex h-8 items-center justify-center text-[12px] tabular-nums",
                cell.available
                  ? "bg-pine/10 text-ink"
                  : "bg-wash text-mute line-through",
              )}
            >
              {Number(cell.date.slice(8, 10))}
            </span>
          ) : (
            <span key={`bos-${index}`} className="h-8" />
          ),
        )}
      </div>

      <p className="mt-4 flex items-center gap-4 text-[11px] text-mute">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 bg-pine/10" /> müsait
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 bg-wash" /> dolu
        </span>
      </p>
    </div>
  );
}

/** Ayın ilk gününü doğru sütuna oturtmak için başa boş hücre koyar. */
function buildWeeks(days: Day[]): Array<Day | null> {
  if (!days.length) return [];

  const first = new Date(`${days[0].date}T00:00:00`);
  // getDay(): 0 = Pazar. Takvim pazartesi başladığı için kaydırılır.
  const offset = (first.getDay() + 6) % 7;

  return [...Array<null>(offset).fill(null), ...days];
}
