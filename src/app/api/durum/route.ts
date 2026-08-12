import { NextResponse } from "next/server";
import { getTicketForm, isCmsConfigured } from "@/lib/cms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Kurulum teşhisi: submitcms bağlantısı ayakta mı, ticket şeması geliyor mu.
 *
 * Değer döndürmez — yalnızca hangi değişkenin tanımlı olduğu, adı ve token
 * uzunluğu. Bu kadarı "Dokploy'da build argümanına yazılmış", "adı yanlış"
 * ya da "eski container ayakta" ayrımını yapmaya yetiyor.
 */
export async function GET() {
  const configured = isCmsConfigured();
  const fields = configured ? await getTicketForm() : null;

  return NextResponse.json({
    data: {
      cmsConfigured: configured,
      formsPersist: configured,
      mode: process.env.SUBMITCMS_MODE === "test" ? "test" : "production",
      ticketFormFields: fields ? fields.map((field) => field.code) : null,
      env: {
        // Beklenen adla tanımlı mı, kaç karakter?
        SUBMITCMS_TOKEN: process.env.SUBMITCMS_TOKEN?.trim()
          ? `tanımlı (${process.env.SUBMITCMS_TOKEN.trim().length} karakter)`
          : "YOK",
        SUBMIT_TOKEN: process.env.SUBMIT_TOKEN?.trim()
          ? `tanımlı (${process.env.SUBMIT_TOKEN.trim().length} karakter) — yedek ad`
          : "YOK",
        SUBMITCMS_MODE: process.env.SUBMITCMS_MODE ?? "YOK",
        SUBMITCMS_API_URL: process.env.SUBMITCMS_API_URL ? "tanımlı" : "YOK",
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "YOK",
        SISTEMTAKIP_API_KEY: process.env.SISTEMTAKIP_API_KEY ? "tanımlı" : "YOK",
        // Yakın adla tanımlanmış değişken var mı (yazım hatası teşhisi)
        benzerAnahtarlar: Object.keys(process.env)
          .filter((key) => /submit|cms|token/i.test(key))
          .sort(),
      },
    },
  });
}
