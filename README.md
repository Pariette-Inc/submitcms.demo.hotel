# Pariette Hotel — Butik Otel (submitcms demo)

Alaçatı'da on bir odalı bir butik otel için tasarlanmış tanıtım ve rezervasyon sitesi.
Next.js 16 (App Router) + Tailwind v4 + TypeScript strict; içerik ve form kaydı
[submitcms](https://www.npmjs.com/package/submitcms) SDK'sı üzerinden.

```bash
npm install
cp .env.example .env.local   # SUBMITCMS_TOKEN boş bırakılabilir
npm run dev
```

`http://localhost:3000`

## Rotalar

| Rota | İçerik |
|---|---|
| `/` | Hero, hızlı uygunluk çubuğu, evin hikâyesi, öne çıkan odalar, hizmetler, galeri |
| `/odalar` | Tüm odalar |
| `/odalar/[slug]` | Oda detayı: açıklama, olanaklar, fiyat kartı, galeri |
| `/hizmetler` | Tüm hizmetler |
| `/hizmetler/[slug]` | Hizmet detayı: saatler, yer, detaylar |
| `/rezervasyon` | Rezervasyon talep formu (`?oda=&giris=&cikis=&yetiskin=` ile ön dolu gelir) |
| `/rezervasyon/basarili` | Talep sonrası bilgilendirme (`noindex`) |
| `/iletisim` | Adres, ulaşım, iletişim formu |
| `POST /api/rezervasyon` | Zod doğrulama + rate limit + submitcms kaydı |
| `POST /api/iletisim` | Aynı hat, iletişim mesajı |
| `GET /api/durum` | Kurulum teşhisi: token tanımlı mı, ticket şeması geliyor mu |

## submitcms bağlantısı

Ziyaretçiye açık tarafın tamamı **site token'ı** ile çalışır, oturum gerekmez —
SDK'nın `delivery` modülü kullanılır (`src/lib/cms/`).

| Ne | Nasıl |
|---|---|
| Site bilgisi (ad, iletişim, giriş/çıkış saati) | `sdk.delivery.init()` |
| Odalar | `sdk.delivery.records('oda')` / `sdk.delivery.record('oda', slug)` |
| Hizmetler | `sdk.delivery.records('hizmet')` / `sdk.delivery.record('hizmet', slug)` |
| İletişim formu şeması | `sdk.delivery.ticketForm()` → `POST /api/public/ticket-content` |
| Rezervasyon ve iletişim formu | `sdk.delivery.submitTicket(payload)` → `POST /api/public/ticket-submit` |

### İçerik tipleri

Panelde iki içerik tipi açılır. Alan kodları için birkaç yaygın karşılık destekleniyor
(`src/lib/cms/mappers.ts`), yani `ad`/`baslik`/`title` gibi varyasyonlar aynı yere düşer.

**`oda`** — `ad`, `ozet`, `aciklama`, `fiyat`, `kapasite`, `alan`, `yatak`, `manzara`,
`gorsel`, `galeri`, `olanaklar`, `one_cikan`
_(fiyat/para birimi `commerce.price` alanından da okunur)_

**`hizmet`** — `ad`, `ozet`, `aciklama`, `gorsel`, `saatler`, `konum`, `detaylar`, `one_cikan`

İçerik tiplerinin ve demo kayıtların panele aktarılabilir şablonları
[`submitcms/`](submitcms/) klasöründe: `content-types/` (tip tanımları),
`records/` (6 oda + 6 hizmet). Ayrıntı için [submitcms/README.md](submitcms/README.md).

### Ticket (form) akışı

Alan adları panelde tanımlı olduğu ve SDK payload'ı olduğu gibi geçirdiği için,
gönderim öncesi şema çekilip değerler o alan kodlarına eşleniyor
(`src/lib/cms/ticket.ts`):

1. `delivery.ticketForm()` → alan listesi (10 dk bellekte tutulur).
2. `buildTicketPayload()` → `ad soyad / e-posta / telefon / konu / mesaj` değerleri
   şemadaki koda eşlenir. Eşleme önce alan koduna, sonra etikete bakar; yani
   `full_name`, `adsoyad` ya da kodu `f_1` olup etiketi "Ad Soyad" olan alan aynı yere düşer.
3. Şemada karşılığı olmayan bir değer (örn. panelde telefon alanı yoksa) uydurma
   anahtarla gönderilmez — mesaj alanının sonuna iliştirilir, veri kaybolmaz.
4. Panelde zorunlu olup formda karşılığı olmayan alan varsa SistemTakip'e `warn` düşer.
5. Şema alınamazsa varsayılan anahtarlar kullanılır: `ad`, `eposta`, `telefon`, `konu`, `mesaj`.

Rezervasyon formu da aynı hattan geçer; tarih/kişi/oda detayları `veri` anahtarında,
form tipi `tip` (`rezervasyon` | `iletisim`) alanında taşınır.

### Demo modu

`SUBMITCMS_TOKEN` boşken ya da servis yanıt vermezken **içerik** `src/data/fallback.ts`
demo verisinden gelir; böylece repo klonlanır klonlanmaz ayağa kalkar.

**Formlar bunun dışındadır.** Token yoksa gönderim hiçbir yere yazılamayacağı için uç
`503 CMS_NOT_CONFIGURED` döner ve kullanıcıya hata gösterilir — "gitti" deyip mesajı
sessizce düşürmez. Kurulumu `GET /api/durum` ile kontrol edebilirsin:

```bash
curl -s https://<site>/api/durum
# {"data":{"cmsConfigured":true,"mode":"production","ticketFormFields":["ad","eposta",...],"formsPersist":true}}
```

## Ortam değişkenleri

| Değişken | Açıklama |
|---|---|
| `SUBMITCMS_TOKEN` | Site (delivery) token'ı. Boşsa demo içerik, formlar 503 döner. `SUBMIT_TOKEN` adı da okunur. |
| `SUBMITCMS_MODE` | `production` (varsayılan) veya `test` |
| `SUBMITCMS_API_URL` | Self-hosted/yerel API kökü — verilirse `MODE` yok sayılır |
| `SUBMITCMS_MEDIA_HOST` | Medya kendi alan adındaysa `next/image` için host |
| `SISTEMTAKIP_API_KEY` | Olay bildirimi (`wh_in_…` incoming webhook anahtarı). Yoksa olaylar sunucu log'una yazılır. |
| `NEXT_PUBLIC_SITE_URL` | Kanonik adres — metadata ve `sitemap.xml` |

Hiçbiri `NEXT_PUBLIC_` ile başlamaz (site adresi dışında); token'lar sunucuda kalır.

## Tasarım kararları

- Sıcak kâğıt (`#fbf7f1`), koyu çam yeşili vurgu, altın; keskin köşeler, geniş beyaz alan.
- Cormorant Garamond (başlıklar) + Inter (metin).
- Hero dışında tüm görseller `next/image` ile, oda kartlarında yavaş hover zoom.
- Formlar iki katman doğrulanır: istemcide ve sunucuda aynı Zod şeması (`src/lib/schemas.ts`).

## Güvenlik notları

- Rezervasyon/iletişim uçlarında IP başına 5 istek/dk (süreç içi `Map`).
  Çok instance'lı kurulumda Redis'e taşınmalı.
- Kişisel veri query string'e yazılmaz; rezervasyon sonucu sayfası `noindex`.
- KVKK onayı olmadan form gönderilemez (`consent` alanı sunucuda da zorunlu).

## Görseller

Demo görselleri Unsplash'ten çekiliyor (`next.config.ts` → `remotePatterns`).
Gerçek kurulumda submitcms medya kütüphanesinin host'u eklenir.
