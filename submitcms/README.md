# submitcms import şablonları

Bu klasördeki dosyalar sitenin içeriğini submitcms paneline aktarmak içindir.
Biçim, `sema-sablon.json` referansıyla birebir aynı (`code` / `name` / `kind` /
`options` / `schema.fields[]`).

```
content-types/oda.json       → "Oda" içerik tipi (12 alan)
content-types/hizmet.json    → "Hizmet" içerik tipi (8 alan)
records/oda.json             → 6 oda kaydı
records/hizmet.json          → 6 hizmet kaydı
```

## Sıra

1. Önce **içerik tipleri** (`content-types/`) — alanlar tanımlanmadan kayıt açılamaz.
2. Sonra **kayıtlar** (`records/`).

## Alan anahtarları koda bağlı

`schema.fields[].key` değerleri, sitenin okuduğu anahtarlarla eşleşecek şekilde seçildi
(`src/lib/cms/mappers.ts`). Panelde bir anahtarı değiştirirsen mapper'daki karşılığını da
güncelle — mapper birkaç varyasyonu tanır (`ad`/`baslik`/`title`, `kapak`/`gorsel`/`image`),
ama sınırsız değil.

| Site alanı | `oda` anahtarı | `hizmet` anahtarı |
|---|---|---|
| Ad | `ad` | `ad` |
| Özet | `ozet` | `ozet` |
| Açıklama | `aciklama` | `aciklama` |
| Kapak görseli | `kapak` | `kapak` |
| Galeri | `galeri` | — |
| Fiyat / kapasite / alan | `fiyat`, `kapasite`, `alan` | — |
| Yatak / manzara | `yatak`, `manzara` | — |
| Saatler / konum | — | `saatler`, `konum` |
| Madde listesi | `olanaklar` | `detaylar` |
| Öne çıkar | `one_cikan` | `one_cikan` |

## İçe aktarmadan önce kontrol edilecek iki şey

1. **Alan tipleri.** Referans şablonda yalnızca `text`, `textarea`, `media`, `date`,
   `richtext` geçiyordu. Bu şablonlarda ayrıca `number`, `boolean`, `gallery` ve `list`
   kullandım. Panelin desteklediği tam liste `sdk.schema.fieldTypes()` ile alınır;
   ad farklıysa (örn. `list` yerine `repeater`/`tags`, `gallery` yerine `media_multiple`)
   yalnızca `type` değerini değiştirmen yeterli — anahtarlara dokunma.
2. **Medya alanları.** `kapak` ve `galeri` şu an Unsplash URL'leri taşıyor. Panel medya
   kütüphanesi id bekliyorsa görselleri önce yükleyip (`sdk.storage.uploadImage()`)
   dönen id'leri bu dosyalara yazmak gerekir. Site tarafındaki okuyucu ikisini de kaldırır
   (düz URL ya da `{url|src|path}` nesnesi).

## Kayıt dosyalarının şekli

```jsonc
{
  "type": "oda",            // içerik tipi kodu
  "locale": "tr",
  "status": "published",    // tüm kayıtlar için varsayılan
  "records": [
    {
      "slug": "bahce-odasi",
      "data": { /* alan anahtarları → değer */ },
      "seo": { "meta_title": "…", "meta_description": "…" },
      "commerce": { "price": 4200, "currency": "TRY" }   // yalnızca oda
    }
  ]
}
```

`data`, `slug`, `status`, `locale`, `seo`, `commerce` alanları SDK'nın `RecordPayload`
tipiyle aynı; yani panel içe aktarma beklediğinden farklı bir zarf isterse bile bu dosyalar
`sdk.records.create(type, payload)` çağrısına doğrudan verilebilir:

```ts
await sdk.auth.console({ email, password })      // yazma tarafı oturum ister
for (const record of file.records) {
  await sdk.records.create(file.type, {
    ...record,
    status: file.status,
    locale: file.locale,
  })
}
```

`oda` kayıtlarındaki `commerce` bloğu yalnızca içerik tipi `kind: "product"` ise ve
`catalog` modülü açıksa yazılır; `kind: "content"` bıraktığımız için fiyat `data.fiyat`
alanından okunuyor. İkisini birden bırakmamın sebebi, ileride ürüne çevirirsen veri kaybı
olmaması.
