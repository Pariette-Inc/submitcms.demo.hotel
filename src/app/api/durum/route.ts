import { NextResponse } from "next/server";
import { getTicketForm, isCmsConfigured } from "@/lib/cms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Kurulum teşhisi: submitcms bağlantısı ayakta mı, ticket şeması geliyor mu.
 * Token ya da başka bir sır dönmez; yalnızca yapılandırma durumu.
 */
export async function GET() {
  const configured = isCmsConfigured();
  const fields = configured ? await getTicketForm() : null;

  return NextResponse.json({
    data: {
      cmsConfigured: configured,
      mode: process.env.SUBMITCMS_MODE === "test" ? "test" : "production",
      ticketFormFields: fields ? fields.map((field) => field.code) : null,
      formsPersist: configured,
    },
  });
}
