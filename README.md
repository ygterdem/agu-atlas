# Aghustos'un Youtube Atlas'ı 🛰️

Videolarımda birlikte oynadığım oyuncuların bağlantı haritası.
Ortada ben varım; herkes bana bağlı. İki ayrı şey iki ayrı bilgi taşır:

- **Baloncuk boyutu = kaç videoda çıktığı.** Çok videoda oynayan büyük olur.
- **Merkeze yakınlık = en son ne zaman birlikte oynadığımız.** En son
  oynadıklarım merkezde, uzun zamandır oynamadıklarım dışarıda kalır.

Yani tek videoda çıkmış ama dün oynamış biri merkeze yakın küçük bir
baloncuk; 20 videoda çıkmış ama iki yıldır oynamamış biri dışarıda büyük bir
baloncuk olur.

Halkalar **ay**dır: aynı halkadakilerle son kez aynı ay içinde oynanmıştır.
Aylar arası boşluk **gerçek takvim farkını** yansıtır — 2022 ile 2024
arasında iki yıl varsa aralarındaki boşluk da o kadar açıktır, sırada komşu
olsalar bile.

Bir ay çok kalabalıksa (mesela 179 kişinin son videosu aynı aya denk
geliyorsa) o ay tek çembere tıkışmaz: **iç içe birkaç sıraya** açılır.
Her sıra tam bir çemberdir, baloncuklar üst üste binmez.

Klanlar ve birlikte oynayan public grupları çemberde **sabit birer dilim**
tutar; dilim genişliği o grubun en kalabalık ayına göre ayarlanır. Böylece
bir grup hangi ayda olursa olsun hep aynı yönde kalır.

Aynı klandakiler aynı renkte ve bir arada kümelenir; klanlar çemberde
büyükten küçüğe yan yana dizilir.

**Public** bir klan değildir. Klanı olmayan oyuncular tek bir yığın
oluşturmaz; klanların **arasındaki boşluklara** dağıtılırlar.
Böylece klan renkleri blok blok okunur, public'ler de arada kalan yeri
doldurur. Alt bardaki “klan” sayacı public'i saymaz.

Public'ler rastgele de serpiştirilmez: **birbiriyle sık oynayanlar bir arada
tutulur.** En az **2 ayrı videoda** birlikte oynayan iki public aynı gruba
girer ve bu geçişlidir (A-B ile B-C bağlıysa üçü tek grup olur). Her grup
bölünmeden tek bir boşluğa yerleşir, yani klanı olmayan ama hep beraber
oynayan takımlar haritada kendiliğinden bir küme oluşturur. Eşiği
`assets/atlas.js` içindeki `PUBLIC_GROUP_MIN` ile değiştirebilirsin.

Detay panelinde herkes için **“En çok birlikte oynadıkları”** listesi var;
kimin kiminle kaç videoda oynadığını oradan görebilir, tıklayıp o kişiye
geçebilirsin.

Uzaklık sıralaması `videos` listesindeki `date` alanlarından gelir: bir
oyuncunun **en son** çıktığı videonun tarihi neyse halkası odur. Hiç tarihi
olmayanlar en dışta, "tarihsiz" halkasında toplanır — bu yüzden videolara
tarih girmek önemli.

Yerleşim sayfa açılırken bir kere hesaplanır ve **sabitlenir** — baloncuklar
hiçbir şekilde kıpırdamaz, sürüklenemez ve her açılışta tam olarak aynı
yerde durur. Fare tekerleğiyle yakınlaşıp haritada gezebilirsin; bu sadece
kamerayı oynatır, baloncukların birbirine göre yeri hiç değişmez.

[twitchatlas.com](https://twitchatlas.com) tarzı, ama tamamen elle seçilmiş veriyle.

---

## 🌐 Site nerede?

**Yayında:** https://ygterdem.github.io/agu-atlas/
**Repo:** https://github.com/ygterdem/agu-atlas

GitHub Pages `main` dalının kökünden yayın yapacak şekilde ayarlı. Yani
değişikliği push ettiğin an site kendini günceller (1-2 dakika sürer).

```bash
cd "C:/Users/Cenk_/Desktop/AI Projects/agu-atlas"
# data/atlas-data.js dosyasını düzenle
git add -A
git commit -m "yeni oyuncular"
git push
```

Yerelde denemek istersen:

```bash
python serve.py
# Harita      : http://127.0.0.1:8899/
# Düzenleyici : http://127.0.0.1:8899/editor.html
```

`python -m http.server` **kullanma**: yanıtlarında `Cache-Control` başlığı
olmadığı için tarayıcı JS/CSS dosyalarını önbellekte tutuyor ve dosyayı
değiştirsen bile sayfa eski hâlini gösteriyor. `serve.py` her yanıta
`no-store` ekler, düz F5 bile en son hâli getirir.

---

## ✏️ Veri nasıl güncellenir?

### Kolay yol: düzenleyici (önerilen)

**https://ygterdem.github.io/agu-atlas/editor.html**
(haritadaki sağ üstteki ✎ butonu da buraya götürür)

Kod yazmadan, form doldurarak veri girersin:

| Sekme | Ne yapar |
|---|---|
| **Kadro** | Asıl kullanacağın ekran. Soldan videoyu seç, sağda o videoda oynayanları yaz. İsmi yazıp Enter'a bas; oyuncu yoksa anında oluşturulur. Sık oynayanlar “Hızlı ekle” olarak tek tıkla eklenir. Listede zaten eklediğin kişiler “zaten eklendi ✓” diye görünür, eski adlar da aranır, bilinmeyen bir adı mevcut birinin eski adı olarak bağlayabilirsin. |
| ↳ *o dönemki klanlar* | Kadro ekranındaki düğme. Bir kişinin **bu videodaki** klanını ayrıca seçersin; klan değiştirenlerin geçmişi böyle oluşur. Dokunmazsan kişinin şu anki klanı geçerli olur. |
| **Videolar** | YouTube linkini yapıştır → başlık otomatik çekilir, video id'si linkten üretilir. |
| **Oyuncular** | İsim, **diğer adlar**, klan, kanal linki, not düzenleme. Video sayısı kadrodan gelir, elle girilmez. |
| **Klanlar** | Etiket, ad, renk. Etiketi değiştirirsen o klandaki oyuncular otomatik taşınır. Tanımsız etiket kalmışsa tek tıkla düzeltir. |
| **Ayarlar** | Merkezdeki (senin) isim, alt başlık, renk, kanal linki. |
| **Kaydet** | Hataları listeler, dosyayı üretir. |

Yaptığın her değişiklik tarayıcıya anında kaydedilir (sekmeyi kapatsan da durur).
Bitince:

1. **atlas-data.js indir** butonuna bas
2. İnen dosyayı projedeki `data/atlas-data.js` üzerine yaz
3. `git add -A && git commit -m "yeni oyuncular" && git push`

Düzenleyici sunucusuz çalışır, veri hiçbir yere gitmez; dosyayı sen push edene
kadar site değişmez.

### Zor yol: dosyayı elle düzenlemek

`data/atlas-data.js` içinde üç liste var:

**`clans`** — klanlar

```js
{ tag: "TPS", name: "The Perfect Squad", color: "#ffd166" }
```

`tag` sadece içeride kullanılan koddur, haritada `name` görünür.

**`videos`** — videolar

```js
{ id: "v12", title: "Klan Savaşı", url: "https://youtu.be/abc123", date: "2025-02-03", game: "PUBG" }
```

**`players`** — oyuncular

```js
{ name: "Kerem", clan: "K2", videos: ["v1","v3","v4"],
  aliases: ["eski_kerem", "KRM"],
  clanAt: { "v1": "IMBZ" },
  link: "", note: "" }
```

`videos` → oyuncunun göründüğü video id'leri.
**Boyut ve merkeze yakınlık bu listenin uzunluğundan otomatik hesaplanır.**
Klanı yoksa `clan: ""` bırak.

`clanAt` → **o videodaki klan** (isteğe bağlı). Biri zamanla klan
değiştirdiyse, hangi videoda hangi klanda olduğunu buraya yaz. Yazmadığın
videolarda kişinin `clan` alanı geçerlidir. Haritada baloncuğun rengi ve
kümesi her zaman **şu anki** klanına göre; geçmiş ise detay panelinde
“Klan geçmişi” olarak dönem dönem görünür (örn. `IMBZ 2 video · 2022–2023
→ K2 5 video · 2024–2025`) ve eski klanın adıyla da arayabilirsin.
Düzenleyicide Kadro sekmesindeki “o dönemki klanları düzenle” düğmesi bunu
tek tek seçmeni sağlar.

`aliases` → **diğer adları** (isteğe bağlı). Biri zaman içinde ismini
değiştirdiyse eski adlarını buraya yaz. O kişi haritada tek baloncuk olarak
kalır; arama kutusunda eski adıyla da bulunur ve detay panelinde
“Diğer adları” olarak listelenir. Düzenleyicideki kadro girişinde eski adı
yazsan bile aynı kişiyi bulur, ikinci bir kayıt açmaz.

> En sık yapılan hata: `players` içindeki `clan` değerinin `clans` içindeki
> hiçbir `tag` ile eşleşmemesi. O oyuncular sessizce gri “Public” olur.
> Düzenleyici bunu yakalayıp tek tıkla düzeltir; elle yazarken dikkat et.

---

## 🖱️ Sitede neler var

| Ne | Nasıl |
|---|---|
| Oyuncu detayı | Baloncuğa tıkla → sağda hangi videolarda oynadığınız listelenir |
| Arama | Sağ üstteki kutu (`/` tuşu odaklar) — isim veya klan |
| Klan filtresi | Sol alttaki klan listesinden bir klana tıkla (gizler/gösterir) |
| Tüm isimler | `Aa` butonu |
| Görünümü sıfırla | `⟳` butonu veya `R` tuşu |
| Yakınlaştır / gez | Fare tekerleği / boşluğu sürükle |

---

## 📁 Dosyalar

```
serve.py              yerel önizleme sunucusu (önbelleksiz)
index.html            harita sayfası
editor.html           veri düzenleyici
assets/style.css      görünüm
assets/atlas.js       harita motoru (dokunma gerekmez)
assets/editor.css     düzenleyici görünümü
assets/editor.js      düzenleyici motoru
data/atlas-data.js    ← VERİ (düzenleyicinin ürettiği dosya)
.nojekyll             GitHub Pages'in dosyaları olduğu gibi sunması için
```

Tek dış bağımlılık: [D3.js](https://d3js.org) (CDN üzerinden). Derleme adımı yok,
`index.html`'i çift tıklayarak yerelde de açabilirsin.

---

## 🎨 Ayarları değiştirmek

`assets/atlas.js` dosyasının en üstündeki `CFG` bloğu:

| Ayar | Ne işe yarar |
|---|---|
| `R_FAR` / `R_NEAR` | En eski / en yeni tarih halkasının merkeze mesafesi |
| `R_MIN` / `R_MAX` | En az / en çok videosu olanın baloncuk boyutu |
| `R_CENTER` | Ortadaki (senin) baloncuğun boyutu |
| `LABEL_MIN_R` | Bu boyutun altındaki isimler sadece üzerine gelince görünür |
| `PALETTE` | Rengi belirtilmemiş klanlara atanacak renkler |
| `PUBLIC_GROUP_MIN` | Kaç ayrı videoda birlikte oynayan public'ler aynı grup sayılsın (varsayılan 2) |
| `MONTH_GAP` | Aylar arası boşluk (ay başına piksel). Büyütürsen takvim farkı daha belirgin olur, çember büyür |
| `MONTH_GAP_MAX` | En fazla kaç aylık boşluk sayılsın (çok eski tarihler çemberi şişirmesin) |
| `BUBBLE_PAD` | Baloncuklar arası boşluk |
