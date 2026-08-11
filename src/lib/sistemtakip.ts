import "server-only";
import { SistemTakip, SistemTakipError } from "@sistemtakip/sdk";

type NotifyLevel = "info" | "warn" | "error" | "critical" | "confirm";

const apiKey = process.env.SISTEMTAKIP_API_KEY;

let client: SistemTakip | null = null;

function getClient(): SistemTakip | null {
  if (!apiKey) return null;
  client ??= new SistemTakip({
    apiKey,
    mode: process.env.NODE_ENV === "production" ? "production" : "test",
    timeout: 5000,
  });
  return client;
}

/**
 * Fire-and-forget bildirim: await edilmez, uygulamayı bloklamaz.
 * `SISTEMTAKIP_API_KEY` tanımlı değilse (demo kurulumu) olay sunucu log'una düşer.
 */
export function notifySafe(
  level: NotifyLevel,
  title: string,
  message: string,
): void {
  const st = getClient();

  if (!st) {
    console.warn(`[sistemtakip:${level}] ${title} — ${message}`);
    return;
  }

  st[level]({ title, message }).catch((err: unknown) => {
    if (err instanceof SistemTakipError) {
      console.error(`SistemTakip [${err.statusCode}]: ${err.message}`);
    } else {
      console.error("SistemTakip notify failed:", err);
    }
  });
}
