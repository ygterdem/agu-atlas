# Aghustos'un Youtube Atlas'ı 🛰️

Videolarımda birlikte oynadığım oyuncuların bağlantı haritası.
Ortada ben varım; herkes bana bağlı. Bir oyuncu ne kadar çok videoda çıktıysa
baloncuğu o kadar **büyük** ve merkeze o kadar **yakın**. Aynı klandakiler
aynı renkte ve bir arada kümelenir.

Yerleşim sayfa açılırken bir kere hesaplanır ve **sabitlenir** — baloncuklar
kıpırdamaz, her açılışta tam olarak aynı yerde durur.

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

**Sadece `data/atlas-data.js` dosyasını düzenle.** Başka hiçbir dosyaya
dokunmana gerek yok. Üç liste var:

### 1) `clans` — klanlar

```js
{ tag: "AGU", name: "Aghustos Ekibi", color: "#ffd166" }
```

- `tag` → oyuncularda kullanacağın kısa kod
- `color` → boş bırakırsan otomatik renk atanır

### 2) `videos` — videolar

```js
{ id: "v12", title: "Klan Savaşı Geri Döndü", url: "https://youtube.com/watch?v=abc123", date: "2025-02-03", game: "PUBG" }
```

- `id` → benzersiz kısa kod (`v12`, `gta-04`… fark etmez)
- `date` → `YYYY-AA-GG` biçiminde; sıralama için kullanılır

### 3) `players` — oyuncular

```js
{ name: "Kerem", clan: "KRT", videos: ["v1","v3","v4"], link: "https://youtube.com/@kerem", note: "İlk squad'ım" }
```

- `videos` → oyuncunun göründüğü video id'leri.
  **Boyut ve merkeze yakınlık bu listenin uzunluğundan otomatik hesaplanır.**
- `clan` → klanı yoksa `""` bırak, "Bağımsız" grubuna düşer
- `link` ve `note` → isteğe bağlı

Dosyayı kaydedip GitHub'a push'ladığında site kendiliğinden güncellenir.

### Hızlı kontrol

Video id'sini yanlış yazarsan o video sessizce atlanır; tarayıcı konsolunda
(F12) hangi oyuncularda sorun olduğunu yazan bir uyarı görürsün.

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
| Baloncuğu taşı | Tut ve sürükle — bıraktığın yerde kalır, `⟳` eski hâline döndürür |

---

## 📁 Dosyalar

```
index.html            sayfa iskeleti
assets/style.css      görünüm
assets/atlas.js       görselleştirme motoru (dokunma gerekmez)
data/atlas-data.js    ← SENİN DÜZENLEYECEĞİN DOSYA
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
