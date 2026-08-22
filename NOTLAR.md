# Geliştirme notları

Bu dosya, projenin nasıl çalıştığını ve **neden öyle çalıştığını** kaydeder.
Kullanım talimatları `README.md` içinde; burada kararlar ve ayar düğmeleri var.

Son güncelleme: 23 Ağustos 2026 — veri: 525 oyuncu, 78 video, 50 klan, 10 takım.

---

## Site nerede

- Harita: https://ygterdem.github.io/agu-atlas/
- Düzenleyici: https://ygterdem.github.io/agu-atlas/editor.html
- Repo: https://github.com/ygterdem/agu-atlas

Yerelde: `python serve.py` → http://127.0.0.1:8899
(`python -m http.server` **kullanma**: `Cache-Control` göndermediği için
tarayıcı eski JS'i önbellekten veriyor, "değişiklik görünmüyor" derdi oradan
çıkıyordu.)

---

## Haritanın kuralları

| Ne | Neyi gösterir |
|---|---|
| **Baloncuk boyutu** | Kaç videoda çıktığı |
| **Merkeze yakınlık** | En son ne zaman birlikte oynandığı (kesin değil, eğilim) |
| **Konum / kümelenme** | Kimin kiminle oynadığı |
| **Renk** | Klan; klanı olmayıp hep birlikte oynayanlar "takım" olarak renklenir |

### Yerleşim nasıl çalışıyor

Kuvvet tabanlı bir graf (d3-force). Kenarlar **oyuncular arasında**: aynı
videoda oynayan herkes birbirine bağlı, bağın ağırlığı kaç ayrı videoda
birlikte oynadıkları. Bu veride ~15 bin bağ çıkıyor. Kümeleri bu bağlar
oluşturuyor.

Ayrıca herkes **bana** da bağlı (her videoda ben varım). Bu bağlar haritayı
tek parça tutuyor — kimse kopuk bir ada olarak savrulmuyor — ve merkeze
uzaklığı tarihe göre ayarlıyor.

Simülasyon bir kez çalışıp **donduruluyor**: baloncuklar hiçbir koşulda
kıpırdamıyor, sürüklenemiyor, her açılışta aynı yerde.

### Çizim

Oyuncular arası bağlar **normalde çizilmiyor** (15 bin çizgi haritayı
boğuyordu). Sadece bana giden soluk bağlar görünüyor. Bir baloncuğa
tıklayınca yalnızca o kişinin bağları çıkıyor ve sadece birlikte oynadıkları
parlıyor.

---

## Ayar düğmeleri

Hepsi `assets/atlas.js` en üstteki `CFG` bloğunda.

| Ayar | Varsayılan | Ne yapar |
|---|---|---|
| `RECENCY_PULL` | 0.22 | Merkeze uzaklık ne kadar tarihe uysun. `0` = sadece kümeler, yüksek = sıkı halkalar |
| `HUB_PULL` | 0.20 | Bana giden bağların çekim gücü. Yükseltirsen tekerleğe yaklaşır |
| `HUB_ALPHA` | 0.11 | Bana giden bağların görünürlüğü |
| `CHARGE` | -70 | Baloncukların birbirini itmesi (kümeler arası boşluk) |
| `TEAM_MIN` | 4 | Kaç kişilik public grubu kendi rengini alsın |
| `PUBLIC_GROUP_MIN` | 2 | Kaç ayrı videoda birlikte oynayanlar aynı grup sayılsın |
| `R_MIN` / `R_MAX` | 10 / 34 | En küçük / en büyük baloncuk |
| `R_NEAR` / `R_FAR` | 130 / 620 | En yeni / en eski için hedef uzaklık |
| `CENTER_LOGO` | `assets/Aghustos Logo Black.png` | Ortadaki logo |

---

## Veri modeli

`data/atlas-data.js` — tek veri dosyası. Düzenleyici bunu üretiyor.

```js
{ name: "Kerem", clan: "K2", videos: ["v1","v3"],
  aliases: ["eski_kerem"],        // isim değiştirenler tek baloncuk kalsın diye
  clanAt: { "v1": "IMBZ" },       // o videodaki klan; klan geçmişi buradan
  link: "", note: "" }
```

- `aliases` → eski adlar. Arama ve kadro girişi bunları da tanır.
- `clanAt` → yalnızca **farklı** olan videolar için yazılır; yazılmayanlarda
  oyuncunun şu anki `clan` alanı geçerli. Panelde "Klan geçmişi" bundan
  türetiliyor.
- Boyut/uzaklık için elle sayı **girilmez**, hepsi hesaplanır.

---

## Nasıl güncelleniyor

1. Düzenleyiciyi aç (haritadaki ✎ butonu).
2. **Kadro** sekmesi: video seç, isim yaz + Enter. Asıl iş burada.
3. **Kaydet** sekmesi: hataları kontrol et, `atlas-data.js indir`.
4. İnen dosyayı `data/atlas-data.js` üzerine yaz.
5. `git add -A && git commit -m "yeni oyuncular" && git push`

Düzenleyici taslağı tarayıcıya kaydeder (localStorage), sekme kapansa da
durur. Site ancak dosyayı push edince değişir.

---

## Yol boyunca çözülen sorunlar

Bir daha aynı yere düşmemek için:

- **Yerleşim kalabalıkta bozuluyordu.** 179 kişinin son videosu aynı aya
  denk geldiği için tek halkaya sığmıyorlardı. Önce bantlara/sıralara açtık;
  sonra zaten kuvvet tabanlı grafa geçtik.
- **2022 ile 2024 yan yana çıkıyordu.** Halkalar sıraya göre yerleşiyordu,
  takvim farkına göre değil.
- **Klan etiketi uyuşmazlığı sessizce oyuncuları "Public" yapıyordu.**
  Düzenleyici artık bunu yakalayıp tek tıkla düzeltiyor.
- **Yerelde değişiklik görünmüyordu.** Sunucu `Cache-Control` göndermiyordu,
  `serve.py` bunu çözdü.
- **Etiketler üst üste biniyordu.** Her isim için dört aday konum deneniyor.

---

## Yapılabilecekler

- 344 oyuncunun klanı yok; klan girilirse harita çok daha renkli olur.
- Takımlara elle isim verilebilir (şu an "Takım 1, 2, 3…").
- Mobil görünüm haritada dar kalıyor; ayrı bir düzen düşünülebilir.
- Video başına oyuncu listesi (bir videoyu seçip kadrosunu görmek) yok.
