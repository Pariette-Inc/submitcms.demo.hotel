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

## submitcms bağlantısı

Ziyaretçiye açık tarafın tamamı **site token'ı** ile çalışır, oturum gerekmez —
SDK'nın `delivery` modülü kullanılır (`src/lib/cms/`).

| Ne | Nasıl |
|---|---|
| Site bilgisi (ad, iletişim, giriş/çıkış saati) | `sdk.delivery.init()` |
| Odalar | `sdk.delivery.records('oda')` / `sdk.delivery.record('oda', slug)` |
| Hizmetler | `sdk.delivery.records('hizmet')` / `sdk.delivery.record('hizmet', slug)` |
| Rezervasyon ve iletişim formu | `sdk.delivery.submitTicket(payload)` |

### İçerik tipleri

Panelde iki içerik tipi açılır. Alan kodları için birkaç yaygın karşılık destekleniyor
(`src/lib/cms/mappers.ts`), yani `ad`/`baslik`/`title` gibi varyasyonlar aynı yere düşer.

**`oda`** — `ad`, `ozet`, `aciklama`, `fiyat`, `kapasite`, `alan`, `yatak`, `manzara`,
`gorsel`, `galeri`, `olanaklar`, `one_cikan`
_(fiyat/para birimi `commerce.price` alanından da okunur)_

**`hizmet`** — `ad`, `ozet`, `aciklama`, `gorsel`, `saatler`, `konum`, `detaylar`, `one_cikan`

### Demo modu

`SUBMITCMS_TOKEN` boşken ya da servis yanıt vermezken site `src/data/fallback.ts`
içindeki demo içerikle çalışır; hata SistemTakip'e bildirilir. Böylece repo klonlanır
klonlanmaz ayağa kalkar. Token tanımlandığında kod değişikliği gerekmez.

## Ortam değişkenleri

| Değişken | Açıklama |
|---|---|
| `SUBMITCMS_TOKEN` | Site (delivery) token'ı. Boşsa demo içerik. |
| `SUBMITCMS_MODE` | `production` (varsayılan) veya `test` |
| `SUBMITCMS_API_URL` | Self-hosted/yerel API kökü — verilirse `MODE` yok sayılır |
| `SUBMITCMS_MEDIA_HOST` | Medya kendi alan adındaysa `next/image` için host |
| `SISTEMTAKIP_API_KEY` | Olay bildirimi. Yoksa olaylar sunucu log'una yazılır. |
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
