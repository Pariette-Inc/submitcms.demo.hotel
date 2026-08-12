# Geliştirme Kaydı

> Her ekran/servis geliştirmesinden sonra güncellenir. En yeni bölüm en üstte.
> Format: development-log skill'i (Claude) tarafından otomatik bakılır.

## 2026-08-11 — Pariette Hotel butik otel sitesi (Next.js 16 + submitcms)

| Ekran / Servis | Arayüz Adresi | API Endpoint(ler) | Not |
|---|---|---|---|
| Ana sayfa | `/` | submitcms `delivery.init()`, `delivery.records('oda')`, `delivery.records('hizmet')` | yeni · hero, hızlı sorgu çubuğu, ev hikâyesi, öne çıkan odalar, hizmetler, galeri, CTA |
| Odalar listesi | `/odalar` | submitcms `delivery.records('oda')` | yeni |
| Oda detayı | `/odalar/{slug}` | submitcms `delivery.record('oda', slug)` | yeni · 6 oda, `generateStaticParams` ile SSG |
| Hizmetler listesi | `/hizmetler` | submitcms `delivery.records('hizmet')` | yeni |
| Hizmet detayı | `/hizmetler/{slug}` | submitcms `delivery.record('hizmet', slug)` | yeni · 6 hizmet, SSG |
| Rezervasyon formu | `/rezervasyon` (`?oda=&giris=&cikis=&yetiskin=` ile ön dolu) | `POST /api/rezervasyon` | yeni · tarih/kişi/oda + iletişim, tahmini toplam |
| Rezervasyon sonucu | `/rezervasyon/basarili` | — | yeni · `noindex`, PII query'de taşınmaz |
| İletişim | `/iletisim` | `POST /api/iletisim` | güncellendi · form submitcms ticket şemasına bağlandı |
| 404 | `/_not-found` | — | yeni |
| Rezervasyon servisi | — | `POST /api/rezervasyon` | güncellendi · Zod + rate limit + `delivery.ticketForm()` ile alan eşleme + `delivery.submitTicket()` |
| İletişim servisi | — | `POST /api/iletisim` | güncellendi · aynı hat; payload panel şemasındaki alan kodlarıyla gönderilir |
| Kurulum teşhisi | — | `GET /api/durum[?probe=1]` | güncellendi · env durumu, canlı uç kodları, içeriğin submitcms'ten mi demo'dan mı geldiği |
| SEO | `/sitemap.xml`, `/robots.txt` | — | yeni · oda ve hizmet slug'ları sitemap'e dahil |

### Notlar

- **submitcms:** `src/lib/cms/` — `client.ts` SDK singleton'ı (site token'ı, yalnızca `delivery` modülü),
  `mappers.ts` kayıt → `Room`/`Service`/`SiteInfo` dönüşümü, `index.ts` `react.cache`'li erişim.
  İçerik tipleri: `oda`, `hizmet` (`src/lib/content.ts` → `CONTENT_TYPES`).
- **Demo modu:** `SUBMITCMS_TOKEN` yoksa ya da servis hata verirse **içerik** `src/data/fallback.ts`'ten
  gelir. Formlar için demo modu yok: token yoksa uçlar `503 CMS_NOT_CONFIGURED` döner, istemci hata
  gösterir (önceden 201 + `stored:false` dönüp başarı ekranı açılıyordu — mesaj sessizce kayboluyordu).
  `submitTicket()` artık yalnızca `status === true` yanıtını başarı sayar; beklenmedik zarf da hata.
- **Ticket gövdesi:** `src/lib/cms/ticket.ts` → `buildTicketPayload()`, `submitcms@1.0.1`'deki
  `TicketPayload` tipini üretir: `type, subject, user, name, email, gdpr, advertising, drp` (+
  `message`, `phone`). `ticketForm()` tabanlı şema katmanı kaldırıldı — o uç form şeması dönmüyor,
  mevcut ticket'a mesaj ekliyor (SDK 1.0.1 dokümanı düzeltildi).
- **İçe aktarma:** `scripts/submitcms-import.mjs <tip…> [--dry-run]` — `auth.console` ile oturum açar,
  `contentTypes.get/create` + `records.create/update` ile şablonları yazar, `delivery.records` ile
  doğrular. Idempotent (slug eşleşirse günceller). Alan tipi desteklenmiyorsa hiçbir şey yazmaz.
- **Import şablonları:** `submitcms/content-types/{oda,hizmet}.json` (şema) ve
  `submitcms/records/{oda,hizmet}.json` (12 kayıt). Alan anahtarları `mappers.ts` ile
  eşleşecek şekilde seçildi; kayıtlar mapper'dan geçirilerek doğrulandı.
- **Bildirim:** `src/lib/sistemtakip.ts` → `notifySafe()`. Rezervasyon talebi `confirm`, rate limit `warn`,
  submitcms hatası `error`. `SISTEMTAKIP_API_KEY` yoksa olay sunucu log'una yazılır.
- **Rate limit:** süreç içi `Map` (`src/lib/rate-limit.ts`). Çok instance'lı kurulumda Redis'e taşınacak.
- **Önbellek:** içerik sayfaları `revalidate = 300`, sitemap `3600`.
- **Sıradaki adım:** panelde `oda` / `hizmet` içerik tipleri açılıp token `.env.local`'e yazıldığında
  kod değişikliği gerekmez; `delivery.submitTicket` yerine ayrı bir `rezervasyon` içerik tipine kayıt
  istenirse `submitTicket()` yerine oturumlu `records.create()` hattı eklenir.
