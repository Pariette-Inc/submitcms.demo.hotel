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

### İçe aktarma

Panelde tip ve kayıt açmak yazma tarafıdır, oturum ister. Tek komut:

```bash
node scripts/submitcms-import.mjs hizmet        # tip + 6 kayıt
node scripts/submitcms-import.mjs hizmet oda    # ikisi birden
node scripts/submitcms-import.mjs hizmet --dry-run
```

`.env.local` içinde `SUBMITCMS_TOKEN` yanında panel girişi de gerekir:
`SUBMITCMS_CONSOLE_EMAIL`, `SUBMITCMS_CONSOLE_PASSWORD`. Script önce
`schema.fieldTypes()` ile panelin tanıdığı alan tiplerini alır, şablondaki bir tip
desteklenmiyorsa hiçbir şey yazmadan durur ve desteklenen listeyi yazdırır.
Tekrar çalıştırmak güvenlidir: var olan tip yeniden kurulmaz, aynı slug'a sahip
kayıt güncellenir. Son adımda `delivery.records()` ile okuyup doğrular.

### Ticket (form) akışı

Formlar `delivery.submitTicket()` ile gönderilir (`POST /api/public/ticket-submit`).
Gövde `submitcms@1.0.1`'deki `TicketPayload` tipiyle sabittir; uç şu alanları zorunlu
tutar ve eksik gönderimde 422 + `errors` döner:

```
type, subject, user, name, email, gdpr, advertising, drp   (+ message, phone)
```

Eşleme `src/lib/cms/ticket.ts` içinde: `gdpr` ve `drp` formdaki KVKK onayından gelir,
`advertising` formda sorulmadığı için açıkça `false` gider, `user` verilmezse
gönderenin e-postası kimlik olarak kullanılır. İkisi env ile değiştirilebilir:
`SUBMITCMS_TICKET_TYPE` (varsayılan `iletisim`), `SUBMITCMS_TICKET_USER`.

> `delivery.ticketForm()` bu akışta **kullanılmaz**. Adı form şeması dönecekmiş gibi
> duruyor ama uç `NotificationController@setTicketContent` — mevcut bir ticket'a mesaj
> ekler ve `ticket` + `message` ister. SDK 1.0.1 bunu doğru belgeliyor.

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
| `SUBMITCMS_TICKET_TYPE` | Talep türü kodu (varsayılan `iletisim`) |
| `SUBMITCMS_TICKET_USER` | Ticket'ın `user` alanı; boşsa gönderenin e-postası |

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
