# Aghustos'un Youtube Atlas'ı 🛰️

Videolarımda birlikte oynadığım oyuncuların bağlantı haritası.
Ortada ben varım; herkes bana bağlı. Bir oyuncu ne kadar çok videoda çıktıysa
baloncuğu o kadar **büyük** ve merkeze o kadar **yakın**. Aynı klandakiler
aynı renkte ve bir arada kümelenir.

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
python -m http.server 8899
# sonra tarayıcıda: http://127.0.0.1:8899
```

---

## ✏️ Veri nasıl güncellenir?

### Kolay yol: düzenleyici (önerilen)

**https://ygterdem.github.io/agu-atlas/editor.html**
(haritadaki sağ üstteki ✎ butonu da buraya götürür)

Kod yazmadan, form doldurarak veri girersin:

| Sekme | Ne yapar |
|---|---|
| **Kadro** | Asıl kullanacağın ekran. Soldan videoyu seç, sağda o videoda oynayanları yaz. İsmi yazıp Enter'a bas; oyuncu yoksa anında oluşturulur. Sık oynayanlar “Hızlı ekle” olarak tek tıkla eklenir. |
| **Videolar** | YouTube linkini yapıştır → başlık otomatik çekilir, video id'si linkten üretilir. |
| **Oyuncular** | İsim, klan, kanal linki, not düzenleme. Video sayısı kadrodan gelir, elle girilmez. |
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
{ name: "Kerem", clan: "TPS", videos: ["v1","v3","v4"], link: "", note: "" }
```

`videos` → oyuncunun göründüğü video id'leri.
**Boyut ve merkeze yakınlık bu listenin uzunluğundan otomatik hesaplanır.**
Klanı yoksa `clan: ""` bırak.

> En sık yapılan hata: `players` içindeki `clan` değerinin `clans` içindeki
> hiçbir `tag` ile eşleşmemesi. O oyuncular sessizce gri “Bağımsız” olur.
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
| `R_FAR` / `R_NEAR` | En uzak / en yakın halkanın merkeze mesafesi |
| `R_MIN` / `R_MAX` | En küçük / en büyük baloncuk boyutu |
| `R_CENTER` | Ortadaki (senin) baloncuğun boyutu |
| `LABEL_MIN_R` | Bu boyutun altındaki isimler sadece üzerine gelince görünür |
| `PALETTE` | Rengi belirtilmemiş klanlara atanacak renkler |
