"use client";

import { useEffect, useRef } from "react";

/**
 * Görüntülenme bildirimi (`delivery.ping` → `POST /api/goruntuleme`).
 *
 * Sayfa terk edilirken okuma süresiyle birlikte bir kez gönderilir;
 * `sendBeacon` kullanıldığı için gezinme beklemez. Yanıt umursanmaz.
 */
export function ViewPing({ type, slug }: { type: string; slug: string }) {
  const sent = useRef(false);

  useEffect(() => {
    sent.current = false;
    const startedAt = Date.now();

    function send() {
      if (sent.current) return;
      sent.current = true;

      const body = JSON.stringify({
        tip: type,
        slug,
        sure: Math.round((Date.now() - startedAt) / 1000),
      });

      try {
        const blob = new Blob([body], { type: "application/json" });
        if (navigator.sendBeacon?.("/api/goruntuleme", blob)) return;
      } catch {
        // sendBeacon yoksa/başarısızsa keepalive fetch'e düş.
      }

      void fetch("/api/goruntuleme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }

    // Mobilde `beforeunload` güvenilmezdir; sekme gizlenince de gönder.
    function onHidden() {
      if (document.visibilityState === "hidden") send();
    }

    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", send);

    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", send);
      send();
    };
  }, [type, slug]);

  return null;
}
