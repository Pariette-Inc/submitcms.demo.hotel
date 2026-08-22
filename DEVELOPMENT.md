# Geliştirme Kaydı

> Her ekran/servis geliştirmesinden sonra güncellenir. En yeni bölüm en üstte.
> Format: development-log skill'i (Claude) tarafından otomatik bakılır.

## 2026-08-22 (2) — "Sürekli çalışıyor / odalar listelenemedi" düzeltmesi

| Ekran / Servis | Arayüz Adresi | API Endpoint(ler) | Not |
|---|---|---|---|
| Önbellek düşürme | — | `POST /api/yenile` | yeni · `SUBMITCMS_REVALIDATE_SECRET` ile korumalı; tanımsızsa uç kapalı (404) |
| Tüm submitcms okumaları | — | — | güncellendi · `unstable_cache` ile 5 dk, `submitcms` etiketiyle |

### Sorun

İki ayrı kusur aynı anda görünüyordu:

1. **Her istek yeniden çağırıyordu.** `submitcms` SDK'sı **axios** kullanıyor,
   `fetch` değil — Next'in fetch önbelleği bu çağrılara hiç uygulanmıyor,
   `react.cache` de yalnız tek istek içinde tekrarı önlüyor. `/rezervasyon`
   arama parametresi okuduğu için dinamik; `export const revalidate = 300`
   ona işlemiyor. Sonuç: her ziyarette `getRooms()` + `getSiteInfo()` +
   iki menü çağrısı yeniden gidiyordu.
2. **Her hata bildirim üretiyordu.** `reportCmsError` her çağrıda SistemTakip'e
   yazıyordu ve `oda` tipi panelde yoksa dönen **404** de "hata" sayılıyordu.

İkisi çarpışınca "sayfa sürekli çalışıyor, sürekli odalar listelenemedi
uyarısı geliyor" tablosu çıkıyor.

Ölçüm (yerelde, 404 döndüren sahte API'ye karşı): 20 sayfa isteği → **50** CMS
isteği ve 50 bildirim. Düzeltmeden sonra: **0** (TTL içinde).

### Düzeltme

- **Okumalar `unstable_cache` ile istekler arasında önbelleklendi** (300 sn,
  `CACHE_TAG` etiketli): oda/hizmet listeleri ve tekilleri, site kaydı, menüler,
  banner, galeri, `alsoRead`. Başarısızlık da `null` olarak önbelleğe girer —
  yoksa bozuk uç her istekte yeniden denenir ve gürültü sürerdi.
- **Müsaitlik, takvim ve yazma uçları önbelleğe ALINMADI:** rezervasyon
  müsaitliği beş dakika bayat gösterilemez.
- **404 artık hata değil.** Tip/kayıt panelde yoksa yalnız sunucu log'una
  seyrek bir uyarı düşer (içe aktarma komutunu da yazar); bildirim gitmez.
- **Bildirim soğuma süresi:** aynı bağlam için en çok 15 dakikada bir bildirim.
- **`POST /api/yenile`** eklendi: önbellek `.next/cache` içinde dağıtımlar arası
  kalıcı olduğu için, uç düzeldikten sonra beklemeden temizlemek gerekebiliyor.
- Aynı düzeltme QR menü demosuna da uygulandı.

### Teşhis

Gerçek hata kodunu görmek için (önbelleğe uğramaz, her zaman canlı sorar):

```bash
curl -s "https://<site>/api/durum" | jq '.data.icerik'
```

`kaynak: "demo (fallback)"` ve yanında `hata: "404 — …"` görünüyorsa içerik tipi
panelde açılmamış demektir; `403` ise abonelik/modül kapalıdır.

## 2026-08-22 — Her sayfa ve servis submitcms üzerinden

| Ekran / Servis | Arayüz Adresi | API Endpoint(ler) | Not |
|---|---|---|---|
| Üst ve alt gezinme | tüm sayfalar (`layout`) | `delivery.menu('ana-menu')`, `delivery.menu('alt-menu')` | güncellendi · menü panelde yoksa koddaki varsayılan liste |
| Ana sayfa duyuru şeridi | `/` | `delivery.banners()` | yeni · banner yoksa şerit hiç çizilmez |
| Ana sayfa galerisi | `/` | `delivery.gallery('anasayfa')` | güncellendi · panelde galeri yoksa demo kareleri |
| Site bilgisi (iletişim, saatler, hikâye) | tüm sayfalar | `delivery.init()` + `delivery.record('site','genel')` | güncellendi · `init()` telefon/adres dönmüyor, tek kayıtlı `site` tipi eklendi |
| Oda detayı — müsaitlik takvimi | `/odalar/{slug}` | `GET /api/takvim` → `delivery.reservations.calendar` | yeni · 60 gün, kalan adet gösterilmez |
| Oda detayı — ilgili odalar | `/odalar/{slug}` | `delivery.alsoRead('oda', slug)` | güncellendi · uç yoksa listeden düşer |
| Hizmet detayı — ilgili hizmetler | `/hizmetler/{slug}` | `delivery.alsoRead('hizmet', slug)` | güncellendi |
| Görüntülenme bildirimi | oda ve hizmet detayları | `POST /api/goruntuleme` → `delivery.ping` | yeni · `sendBeacon`, okuma süresiyle |
| Rezervasyon formu — canlı müsaitlik | `/rezervasyon` | `POST /api/musaitlik` → `delivery.reservations.availability` | yeni · tarih seçilince fiyat ve gece kırılımı |
| Rezervasyon sonucu — referans kodu | `/rezervasyon/basarili` | — | güncellendi · kod `sessionStorage` ile taşınır, query'de değil |
| Müsaitlik servisi | — | `POST /api/musaitlik` | yeni · 30 istek/dk; modül kapalıysa `known:false` |
| Takvim servisi | — | `GET /api/takvim?oda=&from=&to=` | yeni · en çok 120 gün |
| Görüntülenme servisi | — | `POST /api/goruntuleme` | yeni · her durumda 202 |
| Rezervasyon servisi | — | `POST /api/rezervasyon` | güncellendi · önce `reservations.book`, olmazsa ticket; 422 → 409 |
| Kurulum teşhisi | — | `GET /api/durum[?probe=1]` | güncellendi · menü/galeri/banner/site kaydı ve rezervasyon modülü durumu |

### Notlar

- **İki hatlı rezervasyon:** oda seçilmişse `delivery.reservations.book()`
  denenir (takvimde yer tutar, referans kodu döner). Kayıt rezervasyona
  açılmamışsa (403/404) talep `submitTicket()` ile talep kutusuna yazılır.
  Kural ihlali (422 — dolu, sezon dışı, çok erken) ticket'a **düşürülmez**;
  uç 409 döner, misafire gerekçe gösterilir.
- **`site` içerik tipi:** `delivery.init()` environment satırını döner ve o
  tabloda telefon/adres sütunu yok. İletişim bilgileri tek kayıtlı `site`
  tipinden (`slug: genel`) okunur ve `init()` yanıtının üstüne yazılır.
- **Menü yazma SDK'yı atlıyor:** `sdk.menus.create/update` gövdeyi
  `{ code, label, items }` kuruyor, `POST/PUT /api/menus` ise
  `{ code, name, tree }` doğruluyor → 422. İçe aktarma script'i isteği
  `sdk.client` üzerinden elle kuruyor. SDK düzeltilince geri alınabilir.
- **Galeri yazma ucu SDK'da yok:** `anasayfa` galerisi panelden açılır.
- **İçe aktarma bayrakları:** `--menus` (ana-menu + alt-menu),
  `--reservations` (`oda` kayıtlarını gecelik/kapasite 1/onay bekler olarak açar).
- **SDK sürümü** `submitcms@^1.1.0`'a yükseltildi — `delivery.reservations`
  1.0.1'de yoktu.

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
