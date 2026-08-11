"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { isoDate } from "@/lib/utils";

/** Hero altındaki hızlı sorgu — değerleri /rezervasyon formuna taşır. */
export function BookingBar() {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState(isoDate(1));
  const [checkOut, setCheckOut] = useState(isoDate(3));
  const [guests, setGuests] = useState("2");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams({
      giris: checkIn,
      cikis: checkOut,
      yetiskin: guests,
    });
    router.push(`/rezervasyon?${params.toString()}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid w-full gap-px bg-line sm:grid-cols-[1fr_1fr_auto_auto]"
    >
      <Field label="Giriş">
        <input
          type="date"
          value={checkIn}
          min={isoDate(0)}
          onChange={(event) => {
            setCheckIn(event.target.value);
            if (event.target.value >= checkOut) {
              const next = new Date(`${event.target.value}T00:00:00`);
              next.setDate(next.getDate() + 2);
              setCheckOut(next.toISOString().slice(0, 10));
            }
          }}
          className="w-full bg-transparent text-[15px] outline-none"
        />
      </Field>

      <Field label="Çıkış">
        <input
          type="date"
          value={checkOut}
          min={checkIn}
          onChange={(event) => setCheckOut(event.target.value)}
          className="w-full bg-transparent text-[15px] outline-none"
        />
      </Field>

      <Field label="Kişi">
        <select
          value={guests}
          onChange={(event) => setGuests(event.target.value)}
          className="w-full bg-transparent text-[15px] outline-none"
        >
          {[1, 2, 3, 4, 5, 6].map((count) => (
            <option key={count} value={count}>
              {count} kişi
            </option>
          ))}
        </select>
      </Field>

      <button
        type="submit"
        className="bg-pine px-8 py-5 text-[11px] uppercase tracking-[0.2em] text-paper transition-colors duration-300 hover:bg-ink"
      >
        Uygunluk Sor
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 bg-paper px-5 py-4">
      <span className="label text-mute">{label}</span>
      {children}
    </label>
  );
}
