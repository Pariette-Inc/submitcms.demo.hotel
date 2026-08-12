import { NextResponse } from "next/server";
import { SubmitError } from "submitcms";
import { getTicketForm, isCmsConfigured } from "@/lib/cms";
import { getCms } from "@/lib/cms/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProbeResult = {
  ok: boolean;
  status?: number;
  message?: string;
  keys?: string[];
};

/** Tek bir SDK çağrısını çalıştırıp sonucu/hatayı özetler. Değer döndürmez. */
async function probe(run: () => Promise<unknown>): Promise<ProbeResult> {
  try {
    const response = (await run()) as Record<string, unknown> | null;
    return {
      ok: true,
      keys: response ? Object.keys(response) : [],
      message:
        typeof response?.message === "string" ? response.message : undefined,
    };
  } catch (err) {
    if (err instanceof SubmitError) {
      return { ok: false, status: err.code, message: err.message };
    }
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Kurulum teşhisi. Değer/sır döndürmez: hangi değişken tanımlı, kaç karakter,
 * ve `?probe=1` verilirse canlı uçların dönüş kodu.
 */
export async function GET(request: Request) {
  const configured = isCmsConfigured();
  const fields = configured ? await getTicketForm() : null;
  const wantsProbe = new URL(request.url).searchParams.get("probe") === "1";

  const sdk = getCms();
  const probes =
    wantsProbe && sdk
      ? {
          ticketForm: await probe(() => sdk.delivery.ticketForm()),
          init: await probe(() => sdk.delivery.init()),
          manifest: await probe(() => sdk.delivery.manifest()),
          odaKayitlari: await probe(() =>
            sdk.delivery.records("oda", { per_page: 1 }),
          ),
        }
      : undefined;

  return NextResponse.json({
    data: {
      cmsConfigured: configured,
      formsPersist: configured,
      mode: process.env.SUBMITCMS_MODE === "test" ? "test" : "production",
      ticketFormFields: fields ? fields.map((field) => field.code) : null,
      env: {
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
        benzerAnahtarlar: Object.keys(process.env)
          .filter((key) => /submit|cms|token/i.test(key))
          .sort(),
      },
      probes,
    },
  });
}
