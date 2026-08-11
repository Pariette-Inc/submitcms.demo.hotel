import type { Room, Service, SiteInfo } from "@/lib/content";

/**
 * submitcms token'ı tanımlı değilken (ya da servis yanıt vermezken) sitenin
 * gösterdiği demo içerik. Panelde `oda` ve `hizmet` içerik tipleri
 * doldurulduğunda bu dosyaya hiç düşülmez.
 */

const img = (id: string, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const fallbackSite: SiteInfo = {
  name: "Villa Serin",
  tagline: "Alaçatı'nın arka sokağında, on bir odalı küçük bir ev",
  intro: [
    "1912'de bir bağ evi olarak yapılan taş yapıyı, avlusundaki incir ağacına dokunmadan onardık. Bugün on bir oda, bir mutfak ve gün boyu gölge veren bir avlu var.",
    "Resepsiyon yok; kapıda sizi biz karşılıyoruz. Kahvaltı, komşu bahçelerden gelenle sabah kuruluyor. Akşamüstü çayı avluda, güneş taş duvarları turuncuya çevirirken.",
  ],
  phone: "+90 232 716 00 11",
  whatsapp: "+90 555 716 00 11",
  email: "merhaba@villaserin.example",
  address: "2010 Sokak No 7, Alaçatı",
  district: "Çeşme, İzmir",
  mapUrl: "https://maps.google.com/?q=Alacati+Cesme+Izmir",
  instagram: "https://instagram.com",
  checkIn: "14:00",
  checkOut: "12:00",
};

export const fallbackRooms: Room[] = [
  {
    slug: "bahce-odasi",
    name: "Bahçe Odası",
    summary:
      "Zemin katta, kapısı doğrudan lavanta tarhına açılan sakin bir oda.",
    description: [
      "Sabah ilk ışığı doğu duvarından alır; perdeyi araladığınızda yatağın ayakucuna kadar gelir. Kalın taş duvarlar öğle sıcağını içeri sokmaz.",
      "Kendi küçük terasında iki hasır koltuk ve bir sehpa var. Kahvaltınızı odanıza istemeniz halinde buraya kuruyoruz.",
    ],
    price: 4200,
    currency: "TRY",
    capacity: 2,
    size: 28,
    bed: "Çift kişilik (160 cm)",
    view: "Bahçe",
    image: img("1590490360182-c33d57733427"),
    gallery: [img("1578683010236-d716f9a3f461"), img("1502672260266-1c1ef2d93688")],
    amenities: [
      "Özel teras",
      "Klima",
      "Yağmurlama duş",
      "Pamuk çarşaf",
      "Minibar (ikram)",
      "Ücretsiz Wi-Fi",
    ],
    featured: true,
  },
  {
    slug: "tas-ev-suiti",
    name: "Taş Ev Süiti",
    summary:
      "Evin en eski bölümü: kemerli tavan, oturma köşesi ve gömme şömine.",
    description: [
      "Yapının 1912'den kalan tek odası. Kemerli tavanı ve gömme şöminesi restorasyonda olduğu gibi bırakıldı; sadece harcı yenilendi.",
      "Yatak odasıyla oturma bölümü kemerle ayrılıyor. İki kişilik konfor, üçüncü kişi için ilave yatak mümkün.",
    ],
    price: 6400,
    currency: "TRY",
    capacity: 3,
    size: 45,
    bed: "King (180 cm) + tek kişilik ilave",
    view: "Avlu",
    image: img("1611892440504-42a792e24d32"),
    gallery: [img("1600607687939-ce8a6c25118c"), img("1600566753086-00f18fb6b3ea")],
    amenities: [
      "Oturma köşesi",
      "Gömme şömine",
      "Küvet",
      "Nespresso",
      "Çalışma masası",
      "Ücretsiz Wi-Fi",
    ],
    featured: true,
  },
  {
    slug: "deniz-manzarali-oda",
    name: "Deniz Manzaralı Oda",
    summary:
      "Üst katın köşesinde; iki penceresinden biri değirmenlere, biri denize bakar.",
    description: [
      "Havanın açık olduğu günlerde Çeşme körfezi ufukta ince bir çizgi gibi görünür. Akşamüstü ışığı için evin en iyi odası.",
      "Yatak pencereye dönük yerleştirildi; sabah gözünüzü açtığınızda ilk gördüğünüz şey manzara oluyor.",
    ],
    price: 5300,
    currency: "TRY",
    capacity: 2,
    size: 32,
    bed: "Çift kişilik (160 cm)",
    view: "Deniz ve değirmenler",
    image: img("1582719478250-c89cae4dc85b"),
    gallery: [img("1584132967334-10e028bd69f7"), img("1516483638261-f4dbaf036963")],
    amenities: [
      "Deniz manzarası",
      "Klima",
      "Yağmurlama duş",
      "Karartma perde",
      "Bluetooth hoparlör",
      "Ücretsiz Wi-Fi",
    ],
    featured: true,
  },
  {
    slug: "cati-kati-suiti",
    name: "Çatı Katı Süiti",
    summary: "Eğimli ahşap tavan, özel çatı terası ve iki kişilik bir küvet.",
    description: [
      "Merdivenin sonundaki tek oda. Ahşap kirişler açıkta bırakıldı, tavan penceresinden gece yıldız görünür.",
      "On beş metrekarelik özel terasında şezlong ve gölgelik var; akşam yemeğini burada kurmamızı isteyebilirsiniz.",
    ],
    price: 7800,
    currency: "TRY",
    capacity: 2,
    size: 52,
    bed: "King (180 cm)",
    view: "Çatılar ve gün batımı",
    image: img("1618773928121-c32242e63f39"),
    gallery: [img("1512918728675-ed5a9ecdebfd"), img("1578898887932-dce23a595ad4")],
    amenities: [
      "Özel çatı terası",
      "Serbest duran küvet",
      "Tavan penceresi",
      "Nespresso",
      "Yastık menüsü",
      "Ücretsiz Wi-Fi",
    ],
    featured: true,
  },
  {
    slug: "avlu-odasi",
    name: "Avlu Odası",
    summary: "İncir ağacının gölgesine bakan, evin en serin odası.",
    description: [
      "Avluya açılan çift kanatlı kapısı yaz boyunca açık durur. Ağacın gölgesi öğleden sonra tam pencerenin önüne düşer.",
      "Tek başına gelen konuklar için sık tercih edilen oda; sessiz ve iç tarafta.",
    ],
    price: 3800,
    currency: "TRY",
    capacity: 2,
    size: 26,
    bed: "Çift kişilik (140 cm)",
    view: "Avlu",
    image: img("1631049307264-da0ec9d70304"),
    gallery: [img("1591088398332-8a7791972843"), img("1522708323590-d24dbb6b0267")],
    amenities: [
      "Avluya açılan kapı",
      "Klima",
      "Yağmurlama duş",
      "Çalışma masası",
      "Kitaplık",
      "Ücretsiz Wi-Fi",
    ],
    featured: false,
  },
  {
    slug: "bag-evi",
    name: "Bağ Evi",
    summary:
      "Bahçenin ucunda müstakil ev: iki oda, küçük mutfak ve kendi havuzu.",
    description: [
      "Ana binadan ayrı, kendi girişi olan taş ev. Bir aile ya da iki çift için düşünüldü.",
      "Mutfağı çalışır durumda; isterseniz alışverişinizi biz yapar, dolabı siz gelmeden doldururuz. Havuzu dört metre, gün boyu güneş alır.",
    ],
    price: 12500,
    currency: "TRY",
    capacity: 4,
    size: 70,
    bed: "İki yatak odası — King + iki tek kişilik",
    view: "Bağ ve havuz",
    image: img("1600585154340-be6161a56a0c"),
    gallery: [img("1554995207-c18c203602cb"), img("1600210492486-724fe5c67fb0")],
    amenities: [
      "Özel havuz",
      "Tam donanımlı mutfak",
      "İki banyo",
      "Müstakil giriş",
      "Çamaşır makinesi",
      "Ücretsiz Wi-Fi",
    ],
    featured: false,
  },
];

export const fallbackServices: Service[] = [
  {
    slug: "bahce-kahvaltisi",
    name: "Bahçe Kahvaltısı",
    summary:
      "Uzun masada, komşu bahçelerden gelenle kurulan ve saat tutmayan kahvaltı.",
    description: [
      "Peynirler Karaburun'dan, zeytinyağı üç kilometre ötedeki değirmenden, yumurtalar arka bahçedeki kümesten geliyor. Reçelleri kışın biz kaynatıyoruz.",
      "Masaya saat 08.00'de kuruluyor ve 11.30'a kadar toplanmıyor. Geç kalkanlar için sorun değil.",
    ],
    image: img("1493770348161-369560ae357d"),
    hours: "08.00 – 11.30",
    location: "Avlu, incir ağacının altı",
    highlights: [
      "Konaklamaya dahil",
      "Vegan ve glutensiz alternatif",
      "Odaya servis mümkün",
    ],
    featured: true,
  },
  {
    slug: "spa-hamam",
    name: "Hamam & Masaj",
    summary:
      "Bodrum kattaki iki kişilik taş hamam ve randevuyla gelen masaj terapisti.",
    description: [
      "Hamam evin kendi kuyusundan beslenen su ısıtıcısıyla çalışıyor. Göbek taşı tek parça mermer; kubbe delikleri restore edildi.",
      "Masaj için terapistimiz haftanın altı günü geliyor. Bir gün önceden haber vermeniz yeterli.",
    ],
    image: img("1544161515-4ab6ce6db874"),
    hours: "11.00 – 20.00 · randevulu",
    location: "Bodrum kat",
    highlights: [
      "45 dk kese & köpük",
      "60 dk aromaterapi masajı",
      "Çift kullanımı için özel seans",
    ],
    featured: true,
  },
  {
    slug: "havuz-ve-teras",
    name: "Havuz & Güneş Terası",
    summary: "Sekiz metrelik havuz, on şezlong, sessizlik kuralı.",
    description: [
      "Havuz sabah 08.00'de açılıyor, akşam 20.00'de kapanıyor. Kenarında sekiz şezlong, iki gölgelik ve bir küçük bar var.",
      "Müzik yok, yüksek ses yok — bu, konuklarımızın en çok teşekkür ettiği kuralımız.",
    ],
    image: img("1571003123894-1f0594d2b5d9"),
    hours: "08.00 – 20.00",
    location: "Arka bahçe",
    highlights: ["Isıtmalı (nisan–ekim)", "Havlu servisi", "Hafif atıştırma menüsü"],
    featured: true,
  },
  {
    slug: "mutfak",
    name: "Akşam Mutfağı",
    summary:
      "Haftanın dört akşamı, on iki kişilik tek masa ve o gün ne bulunduysa ondan menü.",
    description: [
      "Perşembeden pazara, akşam 20.00'de tek oturum. Menü sabit; pazardan ne geldiyse o pişiyor.",
      "Masada oteldeki konuklar ve rezervasyon yaptıran birkaç misafir birlikte oturuyor. Yer sınırlı, aynı gün sabahına kadar haber vermenizi rica ediyoruz.",
    ],
    image: img("1517248135467-4c7edcad34c4"),
    hours: "Perşembe – Pazar · 20.00",
    location: "Mutfak, uzun masa",
    highlights: ["Sabit menü, 5 tabak", "Yerel şarap eşleşmesi", "12 kişilik tek masa"],
    featured: true,
  },
  {
    slug: "bisiklet-ve-koylar",
    name: "Bisiklet & Koy Turu",
    summary: "Altı bisiklet, üç koy rotası ve sırt çantasında hazır öğle sepeti.",
    description: [
      "Bisikletler ücretsiz; kask ve kilit dahil. Rotaları biz çizdik: en kısası 6 km, en uzunu 22 km.",
      "Bir akşam önceden söylerseniz öğle sepetini hazırlıyoruz — sandviç, meyve, su, soğuk kalan bir şişe.",
    ],
    image: img("1485965120184-e220f721d03e"),
    hours: "Gün boyu",
    location: "Kapı önü, bisiklet sundurması",
    highlights: ["Ücretsiz bisiklet", "Basılı rota haritası", "Öğle sepeti (ek ücretli)"],
    featured: false,
  },
  {
    slug: "ozel-etkinlik",
    name: "Özel Etkinlik & Nikah",
    summary:
      "Evin tamamının kapatıldığı, en çok altmış kişilik küçük kutlamalar.",
    description: [
      "Avlu ve bahçe birlikte altmış kişiye kadar oturmalı düzen alıyor. Bu tür günlerde ev dışa kapanıyor, tüm odalar davete ayrılıyor.",
      "Menü, çiçek ve müzik için birlikte çalıştığımız ekipler var; isterseniz kendi ekibinizle de gelebilirsiniz.",
    ],
    image: img("1519741497674-611481863552"),
    hours: "Talebe göre",
    location: "Avlu, bahçe ve tüm ev",
    highlights: ["Maks. 60 kişi", "11 oda dahil", "Nikah için resmi düzen"],
    featured: false,
  },
];

/** Ana sayfadaki galeri şeridi — CMS'te `galeri` menüsü yoksa buradan. */
export const fallbackGallery: string[] = [
  img("1445019980597-93fa8acb246c", 1200),
  img("1504754524776-8f4f37790ca0", 1200),
  img("1559339352-11d035aa65de", 1200),
  img("1414235077428-338989a2e8c0", 1200),
  img("1584132967334-10e028bd69f7", 1200),
  img("1548013146-72479768bada", 1200),
];

export const heroImage = img("1533104816931-20fa691ff6ca", 2000);
export const storyImage = img("1523531294919-4bcd7c65e216", 1400);
