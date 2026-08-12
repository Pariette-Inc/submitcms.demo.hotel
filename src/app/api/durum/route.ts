import { NextResponse } from "next/server";
import { SubmitError } from "submitcms";
import { isCmsConfigured } from "@/lib/cms";
import { getCms } from "@/lib/cms/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProbeResult = {
  ok: boolean;
  status?: number;
  message?: string;
  keys?: string[];
  /** 422 doğrulama hatalarında hangi alanların istendiği. */
  errors?: Record<string, string[]>;
  /** Yanıt gövdesinin `data` anahtarları (değer değil, yalnızca ad). */
  dataKeys?: string[];
};

/** Gizli görünen anahtarları ayıklar — manifest gövdesini dışarı verirken. */
function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return "…";
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redact(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) =>
        /token|secret|password|api_key|apikey/i.test(key)
          ? [key, "«gizlendi»"]
          : [key, redact(item, depth + 1)],
      ),
    );
  }
  return value;
}

/** Tek bir SDK çağrısını çalıştırıp sonucu/hatayı özetler. Değer döndürmez. */
async function probe(run: () => Promise<unknown>): Promise<ProbeResult> {
  try {
    const response = (await run()) as Record<string, unknown> | null;
    const data = response?.data;

    return {
      ok: true,
      keys: response ? Object.keys(response) : [],
      message:
        typeof response?.message === "string" ? response.message : undefined,
      dataKeys:
        data && typeof data === "object" && !Array.isArray(data)
          ? Object.keys(data as Record<string, unknown>)
          : undefined,
    };
  } catch (err) {
    if (err instanceof SubmitError) {
      return { ok: false, status: err.code, message: err.message, errors: err.errors };
    }
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Kurulum teşhisi. Değer/sır döndürmez: hangi değişken tanımlı, kaç karakter,
 * ve `?probe=1` verilirse canlı uçların dönüş kodu.
 */
/**
 * Sayfaların içeriği nereden geliyor: submitcms mi, demo verisi mi.
 * Ekrandaki içerik demo şablonundan üretildiği için gözle ayırt edilemiyor.
 */
async function contentSources(sdk: NonNullable<ReturnType<typeof getCms>>) {
  const types = ["oda", "hizmet"] as const;
  const out: Record<string, unknown> = {};

  for (const type of types) {
    try {
      const response = await sdk.delivery.records(type, { per_page: 100, locale: "tr" });
      const records = response.data ?? [];
      out[type] = {
        kaynak: records.length ? "submitcms" : "demo (tip var ama yayımlanmış kayıt yok)",
        adet: records.length,
        slugler: records.slice(0, 8).map((record) => record.slug),
        ilkKayitAlanlari: records[0] ? Object.keys(records[0].data ?? {}) : [],
      };
    } catch (err) {
      out[type] = {
        kaynak: "demo (fallback)",
        hata:
          err instanceof SubmitError
            ? `${err.code} — ${err.message}`
            : err instanceof Error
              ? err.message
              : String(err),
      };
    }
  }

  return out;
}

/** Manifest, siteye özel entegrasyon rehberi — uç sözleşmelerini buradan okuyoruz. */
async function manifestGuide(sdk: NonNullable<ReturnType<typeof getCms>>) {
  try {
    const response = await sdk.delivery.manifest();
    const data = (response.data ?? {}) as Record<string, unknown>;
    return redact({ api: data.api, conventions: data.conventions });
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const configured = isCmsConfigured();
  const wantsProbe = new URL(request.url).searchParams.get("probe") === "1";

  const sdk = getCms();
  const probes =
    wantsProbe && sdk
      ? {
          init: await probe(() => sdk.delivery.init()),
          manifest: await probe(() => sdk.delivery.manifest()),
        }
      : undefined;

  return NextResponse.json({
    data: {
      cmsConfigured: configured,
      formsPersist: configured,
      mode: process.env.SUBMITCMS_MODE === "test" ? "test" : "production",
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
      icerik: sdk ? await contentSources(sdk) : undefined,
      manifest: wantsProbe && sdk ? await manifestGuide(sdk) : undefined,
    },
  });
}
