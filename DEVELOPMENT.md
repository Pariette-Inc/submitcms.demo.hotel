# Geliştirme Kaydı

> Her ekran/servis geliştirmesinden sonra güncellenir. En yeni bölüm en üstte.
> Format: development-log skill'i (Claude) tarafından otomatik bakılır.

## 2026-08-11 — Villa Serin butik otel sitesi (Next.js 16 + submitcms)

| Ekran / Servis | Arayüz Adresi | API Endpoint(ler) | Not |
|---|---|---|---|
| Ana sayfa | `/` | submitcms `delivery.init()`, `delivery.records('oda')`, `delivery.records('hizmet')` | yeni · hero, hızlı sorgu çubuğu, ev hikâyesi, öne çıkan odalar, hizmetler, galeri, CTA |
| Odalar listesi | `/odalar` | submitcms `delivery.records('oda')` | yeni |
| Oda detayı | `/odalar/{slug}` | submitcms `delivery.record('oda', slug)` | yeni · 6 oda, `generateStaticParams` ile SSG |
| Hizmetler listesi | `/hizmetler` | submitcms `delivery.records('hizmet')` | yeni |
| Hizmet detayı | `/hizmetler/{slug}` | submitcms `delivery.record('hizmet', slug)` | yeni · 6 hizmet, SSG |
| Rezervasyon formu | `/rezervasyon` (`?oda=&giris=&cikis=&yetiskin=` ile ön dolu) | `POST /api/rezervasyon` | yeni · tarih/kişi/oda + iletişim, tahmini toplam |
| Rezervasyon sonucu | `/rezervasyon/basarili` | — | yeni · `noindex`, PII query'de taşınmaz |
| İletişim | `/iletisim` | `POST /api/iletisim` | yeni · adres, telefon, ulaşım + form |
| 404 | `/_not-found` | — | yeni |
| Rezervasyon servisi | — | `POST /api/rezervasyon` | yeni · Zod doğrulama + IP başına 5 istek/dk + submitcms `delivery.submitTicket` |
| İletişim servisi | — | `POST /api/iletisim` | yeni · aynı doğrulama/rate limit hattı |
| SEO | `/sitemap.xml`, `/robots.txt` | — | yeni · oda ve hizmet slug'ları sitemap'e dahil |

### Notlar

- **submitcms:** `src/lib/cms/` — `client.ts` SDK singleton'ı (site token'ı, yalnızca `delivery` modülü),
  `mappers.ts` kayıt → `Room`/`Service`/`SiteInfo` dönüşümü, `index.ts` `react.cache`'li erişim.
  İçerik tipleri: `oda`, `hizmet` (`src/lib/content.ts` → `CONTENT_TYPES`).
- **Demo modu:** `SUBMITCMS_TOKEN` yoksa ya da servis hata verirse `src/data/fallback.ts` içeriği kullanılır;
  hata SistemTakip'e `error` seviyesinde düşer. Rezervasyon/iletişim uçları bu modda `stored: false` döner.
- **Bildirim:** `src/lib/sistemtakip.ts` → `notifySafe()`. Rezervasyon talebi `confirm`, rate limit `warn`,
  submitcms hatası `error`. `SISTEMTAKIP_API_KEY` yoksa olay sunucu log'una yazılır.
- **Rate limit:** süreç içi `Map` (`src/lib/rate-limit.ts`). Çok instance'lı kurulumda Redis'e taşınacak.
- **Önbellek:** içerik sayfaları `revalidate = 300`, sitemap `3600`.
- **Sıradaki adım:** panelde `oda` / `hizmet` içerik tipleri açılıp token `.env.local`'e yazıldığında
  kod değişikliği gerekmez; `delivery.submitTicket` yerine ayrı bir `rezervasyon` içerik tipine kayıt
  istenirse `submitTicket()` yerine oturumlu `records.create()` hattı eklenir.
