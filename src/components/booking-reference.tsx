"use client";

import { useMemo, useSyncExternalStore } from "react";
import { BOOKING_STORAGE_KEY } from "@/components/reservation-form";
import { formatDate } from "@/lib/utils";

type Booking = {
  code: string;
  status: string;
  checkIn: string;
  checkOut: string;
  nights: number;
};

const statusLabels: Record<string, string> = {
  pending: "Onay bekliyor",
  confirmed: "Onaylandı",
  cancelled: "İptal edildi",
  completed: "Tamamlandı",
};

/**
 * `sessionStorage` bir kez okunur ve modülde tutulur: `useSyncExternalStore`
 * her render'da aynı referansı görmeli, yoksa sonsuz güncelleme olur.
 */
let cachedRaw: string | null | undefined;

function readBooking(): string | null {
  if (cachedRaw === undefined) {
    try {
      cachedRaw = window.sessionStorage.getItem(BOOKING_STORAGE_KEY);
    } catch {
      cachedRaw = null;
    }
  }
  return cachedRaw;
}

/** Sunucuda depolama yoktur; ilk HTML kodsuz basılır. */
const readServerBooking = () => null;

/** Değer oturum boyunca değişmez — dinlenecek bir şey yok. */
const subscribe = () => () => {};

/**
 * Rezervasyon hattı çalıştıysa (`delivery.reservations.book`) referans kodunu
 * gösterir. Kod query string'de taşınmaz; form onu sessionStorage'a yazar,
 * burası okur. Sekme kapanınca kayıt da gider.
 *
 * Talep ticket olarak kaydedilmişse kod yoktur ve bu blok hiç çıkmaz.
 */
export function BookingReference() {
  const raw = useSyncExternalStore(subscribe, readBooking, readServerBooking);

  const booking = useMemo<Booking | null>(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Booking;
    } catch {
      // Bozuk JSON: kod gösterilmez, sayfa çalışır.
      return null;
    }
  }, [raw]);

  if (!booking) return null;

  return (
    <div className="mt-12 border border-pine/30 bg-pine/5 px-6 py-7">
      <p className="label text-mute">Rezervasyon referansı</p>
      <p className="display mt-3 text-[34px] tracking-[0.08em]">{booking.code}</p>
      <dl className="mt-6 grid gap-x-8 gap-y-3 border-t border-line pt-5 text-[14px] sm:grid-cols-2">
        <div className="flex justify-between gap-4">
          <dt className="text-mute">Giriş</dt>
          <dd>{formatDate(booking.checkIn)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-mute">Çıkış</dt>
          <dd>{formatDate(booking.checkOut)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-mute">Süre</dt>
          <dd>{booking.nights} gece</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-mute">Durum</dt>
          <dd>{statusLabels[booking.status] ?? booking.status}</dd>
        </div>
      </dl>
    </div>
  );
}
