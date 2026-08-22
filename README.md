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
| `POST /api/rezervasyon` | Zod doğrulama + rate limit; önce rezervasyon takvimi, olmazsa talep kutusu |
| `POST /api/musaitlik` | Seçilen oda/tarih için canlı müsaitlik ve fiyat |
| `GET /api/takvim` | Oda müsaitlik takvimi (en çok 120 gün) |
| `POST /api/iletisim` | İletişim mesajı — ticket hattı |
| `POST /api/goruntuleme` | Görüntülenme bildirimi (`sendBeacon`) |
| `GET /api/durum` | Kurulum teşhisi: token, içerik kaynağı, menü/galeri/banner, rezervasyon modülü |

## submitcms bağlantısı

Ziyaretçiye açık tarafın tamamı **site token'ı** ile çalışır, oturum gerekmez —
SDK'nın `delivery` modülü kullanılır (`src/lib/cms/`).

| Ne | Nasıl |
|---|---|
| Site kimliği (ad, dil, adres kökü) | `sdk.delivery.init()` |
| İletişim, saatler, evin hikâyesi | `sdk.delivery.record('site', 'genel')` |
| Odalar | `sdk.delivery.records('oda')` / `sdk.delivery.record('oda', slug)` |
| Hizmetler | `sdk.delivery.records('hizmet')` / `sdk.delivery.record('hizmet', slug)` |
| Üst ve alt menü | `sdk.delivery.menu('ana-menu')` / `sdk.delivery.menu('alt-menu')` |
| Ana sayfa galerisi | `sdk.delivery.gallery('anasayfa')` |
| Duyuru şeridi | `sdk.delivery.banners()` |
| "Diğer odalar / hizmetler" | `sdk.delivery.alsoRead(tip, slug)` |
| Görüntülenme sayacı | `sdk.delivery.ping(tip, slug, saniye)` |
| Müsaitlik ve fiyat | `sdk.delivery.reservations.availability('oda', slug, {…})` |
| Müsaitlik takvimi | `sdk.delivery.reservations.calendar('oda', slug, {…})` |
| Rezervasyon yazma | `sdk.delivery.reservations.book('oda', slug, {…})` |
| İletişim formu ve yedek talep hattı | `sdk.delivery.submitTicket(payload)` |

**Site bilgisi neden iki kaynaktan geliyor?** `delivery.init()` environment
satırını döner; o tabloda telefon/adres sütunu yoktur (`title`, `url`, `locale`
var). İletişim bilgileri bu yüzden tek kayıtlı `site` içerik tipinde tutulur ve
`init()` yanıtının üstüne yazılır.

### İçerik tipleri

Panelde üç içerik tipi açılır. Alan kodları için birkaç yaygın karşılık destekleniyor
(`src/lib/cms/mappers.ts`), yani `ad`/`baslik`/`title` gibi varyasyonlar aynı yere düşer.

**`oda`** — `ad`, `ozet`, `aciklama`, `fiyat`, `kapasite`, `alan`, `yatak`, `manzara`,
`gorsel`, `galeri`, `olanaklar`, `one_cikan`
_(fiyat/para birimi `commerce.price` alanından da okunur)_

**`hizmet`** — `ad`, `ozet`, `aciklama`, `gorsel`, `saatler`, `konum`, `detaylar`, `one_cikan`

**`site`** (tek kayıt, slug `genel`) — `ad`, `slogan`, `hakkinda`, `telefon`,
`whatsapp`, `eposta`, `instagram`, `adres`, `ilce`, `harita`, `giris_saati`,
`cikis_saati`

İçerik tiplerinin ve demo kayıtların panele aktarılabilir şablonları
[`submitcms/`](submitcms/) klasöründe: `content-types/` (tip tanımları),
`records/` (6 oda + 6 hizmet + 1 site kaydı). Ayrıntı için [submitcms/README.md](submitcms/README.md).

### İçe aktarma

Panelde tip ve kayıt açmak yazma tarafıdır, oturum ister. Tek komut:

```bash
node scripts/submitcms-import.mjs hizmet             # tip + 6 kayıt
node scripts/submitcms-import.mjs site oda hizmet    # üçü birden
node scripts/submitcms-import.mjs --menus            # ana-menu + alt-menu
node scripts/submitcms-import.mjs --reservations     # odaları rezervasyona açar
node scripts/submitcms-import.mjs hizmet --dry-run
```

`--menus` menüleri `POST/PUT /api/menus` ile yazar. `sdk.menus.*` **bilerek
kullanılmıyor**: SDK 1.1.0 gövdeyi `{ code, label, items }` diye kuruyor, uç ise
`{ code, name, tree }` bekliyor — SDK ile çağırınca 422 dönüyor. Script isteği
`sdk.client` üzerinden elle kuruyor; SDK düzeltilince o iki satır `sdk.menus.*`
ile değiştirilebilir.

`--reservations` her `oda` kaydı için `sdk.reservations.settings.save()` çağırır
(gecelik, kapasite 1, `auto_confirm: false`). `reservations` modülü kapalıysa uç
403 döner ve script durur — modül panelden açılmalı.

**Galeri script'le kurulmaz.** SDK'da galeri yazma ucu yok; `anasayfa` galerisi
panelden açılır. Açılana kadar ana sayfa `src/data/fallback.ts` karelerini
gösterir.

`.env.local` içinde `SUBMITCMS_TOKEN` yanında panel girişi de gerekir:
`SUBMITCMS_CONSOLE_EMAIL`, `SUBMITCMS_CONSOLE_PASSWORD`. Script önce
`schema.fieldTypes()` ile panelin tanıdığı alan tiplerini alır, şablondaki bir tip
desteklenmiyorsa hiçbir şey yazmadan durur ve desteklenen listeyi yazdırır.
Tekrar çalıştırmak güvenlidir: var olan tip yeniden kurulmaz, aynı slug'a sahip
kayıt güncellenir. Son adımda `delivery.records()` ile okuyup doğrular.

### Rezervasyon akışı

Rezervasyon **kayıt üstüne zaman ekler**: `oda` içerik tipindeki her kayıt,
panelde `reservations.settings.save()` ile rezervasyona açılır. Açılmamış kayıtta
müsaitlik `not_reservable` döner.

Sitede üç uç kullanılır, üçü de yalnız site token'ıyla çalışır:

| Adım | Nerede | Uç |
|---|---|---|
| Takvim (60 gün, gün gün müsaitlik ve fiyat) | oda detayı | `reservations.calendar` |
| Tarih seçilince canlı kontrol | rezervasyon formu | `reservations.availability` |
| Talebi yazma | form gönderimi | `reservations.book` |

`POST /api/rezervasyon` iki hatlıdır:

1. **Oda seçildiyse** `book()` denenir. Başarılıysa misafire referans kodu
   (`REZ-…`) döner, takvimde yer tutulur. `auto_confirm` kapalıysa talep
   `pending` olarak personelin önüne düşer.
2. **Oda seçilmediyse ya da kayıt rezervasyona açılmamışsa** (403/404) talep
   `submitTicket()` ile talep kutusuna yazılır. Takvimde yer tutmaz.

422 (`dolu`, `sezon dışı`, `çok erken`) ticket'a **düşürülmez**: uç `409` döner ve
misafire gerekçe gösterilir. "Gitti" deyip sessizce kaybetmek, dolu odayı
satmaktan daha kötüdür.

Ziyaretçiye kalan kapasite gösterilmez — uç de dönmez. Takvimde yalnız
"müsait / dolu" ve o günün fiyatı vardır.

Referans kodu query string'de taşınmaz; form kodu `sessionStorage`'a yazar,
`/rezervasyon/basarili` oradan okur.

### Ticket (form) akışı

İletişim formu ve yedek rezervasyon hattı `delivery.submitTicket()` ile gönderilir (`POST /api/public/ticket-submit`).
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
curl -s "https://<site>/api/durum?probe=1"   # menü/galeri/banner/manifest da sorulur
```

Yanıtta üç başlık işe yarar:

- `icerik` — hangi içerik tipi submitcms'ten geliyor, hangisi demo verisinden.
- `panel` — menü, galeri, banner ve `site` kaydı açılmış mı (`?probe=1`).
- `rezervasyon.hat` — `açık` / `modül kapalı (403)` / `oda rezervasyona
  açılmamış (404)`. İlki dışında rezervasyon talebi ticket hattına düşer.

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
| `SUBMITCMS_CONSOLE_EMAIL` / `_PASSWORD` | Yalnızca içe aktarma script'i için panel oturumu; çalışan site istemez |

Hiçbiri `NEXT_PUBLIC_` ile başlamaz (site adresi dışında); token'lar sunucuda kalır.

## Tasarım kararları

- Sıcak kâğıt (`#fbf7f1`), koyu çam yeşili vurgu, altın; keskin köşeler, geniş beyaz alan.
- Cormorant Garamond (başlıklar) + Inter (metin).
- Hero dışında tüm görseller `next/image` ile, oda kartlarında yavaş hover zoom.
- Formlar iki katman doğrulanır: istemcide ve sunucuda aynı Zod şeması (`src/lib/schemas.ts`).

## Güvenlik notları

- Rezervasyon/iletişim uçlarında IP başına 5 istek/dk, müsaitlik ve takvim
  sorgularında 30/dk, görüntülenme bildiriminde 60/dk (süreç içi `Map`).
  Çok instance'lı kurulumda Redis'e taşınmalı. submitcms tarafında da
  `reservations.book` için 10/dk sınırı var.
- Kişisel veri query string'e yazılmaz; rezervasyon sonucu sayfası `noindex`.
- KVKK onayı olmadan form gönderilemez (`consent` alanı sunucuda da zorunlu).

## Görseller

Demo görselleri Unsplash'ten çekiliyor (`next.config.ts` → `remotePatterns`).
Gerçek kurulumda submitcms medya kütüphanesinin host'u eklenir.
