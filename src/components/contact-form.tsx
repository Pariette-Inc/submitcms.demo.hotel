"use client";

import { useState, type FormEvent } from "react";
import { Field, inputClass } from "@/components/form-field";
import { Button } from "@/components/ui";
import { contactSchema } from "@/lib/schemas";

type Values = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  consent: boolean;
};

type Errors = Partial<Record<keyof Values | "form", string>>;

const empty: Values = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
  consent: false,
};

export function ContactForm() {
  const [values, setValues] = useState<Values>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined, form: undefined }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = contactSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors(
        Object.fromEntries(
          Object.entries(fieldErrors).map(([key, messages]) => [key, messages?.[0]]),
        ) as Errors,
      );
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/iletisim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        setErrors({ form: body?.message ?? "Mesajınız gönderilemedi. Lütfen tekrar deneyin." });
        return;
      }

      setValues(empty);
      setSent(true);
    } catch {
      setErrors({ form: "Bağlantı kurulamadı. Lütfen tekrar deneyin." });
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="border border-line bg-wash px-8 py-12 text-center">
        <p className="display text-[30px]">Mesajınız bize ulaştı</p>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-mute">
          Genelde aynı gün içinde yanıtlıyoruz. Acil bir konuysa telefonla aramanız daha hızlı olur.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="underline-sweep mt-6 text-[12px] uppercase tracking-[0.2em] text-pine"
        >
          Yeni mesaj yaz
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Ad soyad" htmlFor="c-name" error={errors.name}>
          <input
            id="c-name"
            type="text"
            autoComplete="name"
            value={values.name}
            onChange={(event) => set("name", event.target.value)}
            className={inputClass}
            required
          />
        </Field>

        <Field label="E-posta" htmlFor="c-email" error={errors.email}>
          <input
            id="c-email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(event) => set("email", event.target.value)}
            className={inputClass}
            required
          />
        </Field>

        <Field label="Telefon (isteğe bağlı)" htmlFor="c-phone" error={errors.phone}>
          <input
            id="c-phone"
            type="tel"
            autoComplete="tel"
            value={values.phone}
            onChange={(event) => set("phone", event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Konu" htmlFor="c-subject" error={errors.subject}>
          <input
            id="c-subject"
            type="text"
            value={values.subject}
            onChange={(event) => set("subject", event.target.value)}
            className={inputClass}
            required
          />
        </Field>
      </div>

      <Field label="Mesaj" htmlFor="c-message" error={errors.message}>
        <textarea
          id="c-message"
          rows={6}
          value={values.message}
          onChange={(event) => set("message", event.target.value)}
          className={`${inputClass} resize-none`}
          required
        />
      </Field>

      <label className="flex items-start gap-3 text-[13px] leading-relaxed text-mute">
        <input
          type="checkbox"
          checked={values.consent}
          onChange={(event) => set("consent", event.target.checked)}
          className="mt-1 h-4 w-4 accent-[#38513f]"
        />
        <span>
          Kişisel verilerimin mesajıma yanıt verilmesi amacıyla işlenmesini kabul ediyorum.
        </span>
      </label>
      {errors.consent ? <p className="-mt-4 text-[12px] text-[#a4442f]">{errors.consent}</p> : null}

      {errors.form ? (
        <p className="border border-[#a4442f]/30 bg-[#a4442f]/5 px-4 py-3 text-[13px] text-[#a4442f]">
          {errors.form}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full sm:w-fit">
        {pending ? "Gönderiliyor…" : "Mesajı Gönder"}
      </Button>
    </form>
  );
}
