# Geliştirme notları

Bu dosya, projenin nasıl çalıştığını ve **neden öyle çalıştığını** kaydeder.
Kullanım talimatları `README.md` içinde; burada kararlar ve ayar düğmeleri var.

Son güncelleme: 23 Ağustos 2026 — veri: 733 oyuncu, 115 video, 63 klan, 10 takım.

---

## Site nerede

- Harita: https://ygterdem.github.io/agu-atlas/
- Repo: https://github.com/ygterdem/agu-atlas

**Düzenleyici yayında değil.** GitHub Pages `main` dalını olduğu gibi
sunuyor; `editor.html` orada dursaydı adresi bilen herkes veriyi
düzenleyebilirdi. Bu yüzden düzenleyici dosyaları `main`'den çıkarıldı
(`.gitignore`'da) ve yalnızca diskte duruyor — `serve.py` onları yerelde
sunuyor. Yedekleri `editor` dalında; yeni bir kopya çıkarınca geri getir:

```bash
git checkout editor -- editor.html assets/editor.js assets/editor.css
```

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
| **Zaman çizgisi** | Alt çubuk: harita o tarihteki hâli |

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

### Köşe kutuları

Sol altta **Klanlar**, sağ altta **Aghustos** (sosyal hesaplar). İkisi de
`.side-box` sınıfını paylaşıyor: başlığın kendisi aç/kapat düğmesi, kapalıyken
sadece başlık şeridi kalıyor. Tercih `localStorage`'da (`atlas-kutu-legend`,
`atlas-kutu-social`) saklanıyor.

Dar ekranda (≤820px) ikisi de **varsayılan kapalı** açılıyor, zaman çizgisi de
onların üstüne (`bottom:52px`) çekiliyor — yoksa üç kutu alt kenarda üst üste
biniyordu. Kayıtlı tercih varsa ekran genişliğine bakılmıyor.

Sosyal hesapların adresleri `index.html` içinde sabit:
`youtube.com/@aghustos`, `instagram.com/aghustos`, `tiktok.com/@aghustos`.

Bir sınır: detay paneli (`.panel`) sağ kenarı tepeden dibe kaplıyor, yani bir
oyuncuya tıklayınca sosyal kutusunun üstünü örtüyor. Panel kapanınca geri
geliyor.

### Zaman çizgisi

Alttaki çubuk haritayı **o tarihteki hâline** döndürür: o güne kadar hiç
oynamamışlar kaybolur, kalanların baloncuğu o günkü video sayısı kadar olur.
Adımlar videoların **ayrı tarihleri** (bu veride 108 durak); `▶` 220ms'de bir
ilerler.

Kritik karar: **yerleşim yeniden hesaplanmaz.** Kuvvet simülasyonu tüm veriyle
bir kez koşup dondurulmuştu, zaman çizgisi konumlara hiç dokunmuyor. Her adımda
yeniden koşsaydı baloncuklar her sürüklemede yer değiştirirdi ve büyümeyi
izlemek imkânsız olurdu. Şimdi herkes yerinde belirip büyüyor.

`rScale` de tüm zamanların en yükseğine (47 video) sabit. Her adımda yeniden
ölçeklenseydi en büyük baloncuk her tarihte 58px olurdu ve büyüme hissi
kaybolurdu.

Zamana uyanlar: baloncukların varlığı ve boyutu, isim eşiği, alt bardaki
sayılar, efsanedeki klan sayıları, detay panelindeki her şey (video listesi,
"en çok birlikte oynadıkları", klan/takım arkadaşları, yüzde). Çubuk sondayken
her şey eskisiyle birebir aynı — 733 oyuncu, 115 video, 63 klan.

Bir ayrıntı: erken tarihlerde toplulukta `LABEL_ALL_UNDER` (120) kişiden az
varsa isim eşiği uygulanmaz, herkesin adı yazılır. Yoksa 2022'de haritada 21
kişi olurdu ve hiçbirinin ismi görünmezdi (hepsinin 1 videosu var).

### Boyut neden düz karekök değil

Veri çok çarpık: 573 kişi tek videoda, tepede ise 47 ve 28 videolu ikisi var.
Karekök ölçek (alan orantılı, "doğru" olan) bu uçları birbirine yapıştırıyordu
— 47 ile 28 arasında 34px'e karşı 28px kalıyordu, gözle ayırt edilmiyordu.
`R_POW` bu eğriyi açıyor: 0.78'de 47 → 58px, 28 → 41px, 1 video → 9px. Tepedeki
fark okunuyor, alttaki kalabalık yine küçük kalıyor.

### İsimler

İki ayrı kısıt var: bir isim başka bir ismin üstüne **asla** binmez, ama
baloncuğun üstüne binebilir. Baloncuklar bu yoğunlukta o kadar sıkışık ki
"hiçbir şeye binmesin" demek isimlerin neredeyse tamamını yutuyordu (143 yerine
~30 isim görünüyordu). Metnin koyu konturu sayesinde baloncuk üstünde de
okunuyor; o yüzden baloncuk örtüşmesi yasak değil, **puanlanıyor** ve aday
konumlar arasından en az örtüşen seçiliyor.

**İsim her zaman baloncuğun altında ve ortalanmış.** Tek konum, tek kural.
Yol boyunca sırasıyla denendi ve elendi: sağ/sol (isim yanındaki baloncuğun
sanılıyor), köşegen (daha beter), üst/alt dönüşümlü (göz için tahmin edilemez).
Tek yerde durunca isme baktığın anda hangi baloncuğun olduğunu biliyorsun.

Bedeli var: yeri dolu olan ismini gösteremiyor, başka yere kaçamıyor. Dört
aday konumluyken 143 isim görünüyordu, tek konumla 129. Bilerek verilen taviz —
14 isim için okunabilirlikten vazgeçilmedi.

**Büyük baloncuklarda isim içeri yazılır.** Dışarı yazılınca büyük baloncuğun
ismi yanındaki küçüğün ismiymiş gibi okunuyordu. Yarıçap 22'yi geçiyor ve isim
en az 10px puntoyla sığıyorsa isim baloncuğun ortasına, zemine göre koyu ya da
açık renkle yazılır (`insideFontSize` / `inkOn`). Punto baloncukla birlikte
büyür — boyut farkı isimden de okunur. Sığmayan uzun isimler dışarıda kalır.
İsmi içine yazılmış baloncuklar ayrıca **dokunulmaz**: üstlerine başka bir isim
düşemez.

İsimler kendi katmanında (`.labels`), baloncukların hepsinin üstünde çizilir.
Aynı `<g>` içindeyken sonradan çizilen baloncukların altında kalıyorlardı.

Bir uyarı: bu katmanda punto ve renk `attr()` ile değil `style()` ile
yazılıyor. CSS'teki `.lbl{fill,font-size}` kuralları sunum özniteliklerini
(`attr`) ezer; satır içi stil ise CSS'i ezer.

Sağ üstteki **Aa** düğmesi eşiği kaldırıp herkesin ismini açar (559 isim).

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
| `R_MIN` / `R_MAX` | 9 / 58 | En küçük / en büyük baloncuk |
| `R_POW` | 0.78 | Boyut eğrisi. `0.5` = alan orantılı (üst uçtaki fark silinir), `1` = yarıçap orantılı (fark abartılır) |
| `LABEL_FONT` | 9 | İsim puntosu. Küçültmek kalabalığı seyreltir ve daha çok isim sığdırır. Kutu hesapları buradan türer, elle başka yer değiştirmeye gerek yok |
| `LABEL_MIN_VIDEOS` | 2 | Bu kadar videodan az çıkanın ismi normalde gizli |
| `LABEL_ALL_UNDER` | 120 | Zaman çizgisi geride ve toplulukta bu kadar az kişi varsa eşiği uygulama, herkesin adını yaz |
| `BUBBLE_PAD` | 6 | Baloncuklar arası boşluk; isimlere yer açar |
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

1. `python serve.py` ile düzenleyiciyi aç: http://127.0.0.1:8899/editor.html
   (haritada ona giden bir bağlantı yok, kasıtlı).
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
- **Etiketler üst üste biniyordu.** Yeri dolu olan ismini göstermiyor.
- **Yana yazılan isimler karıştırıyordu.** Sağa/sola/köşegene yazılan isim
  yanındaki baloncuğa aitmiş gibi duruyordu. Punto 11'den 9'a indi ve isim
  yalnızca alta yazılır oldu.
- **Büyük baloncuğun ismi komşusunun ismi gibi duruyordu.** 58px'lik baloncuğun
  yanına yazılan isim, hemen bitişikteki küçük baloncuğa aitmiş gibi
  okunuyordu. Artık büyüklerde isim içeri yazılıyor.
- **İsimler baloncukların altında kalıyordu.** "Mavili1211" yerine "Mavil…11"
  görünüyordu: metin baloncukla aynı `<g>` içindeydi, sonraki baloncuklar
  üstünü boyuyordu. Ayrı ve en üstteki katmana alındı.
- **Boyut video sayısını anlatmıyordu.** Karekök ölçek üst uçtaki farkı
  siliyordu; `R_POW` eklendi.

---

## Yapılabilecekler

- 344 oyuncunun klanı yok; klan girilirse harita çok daha renkli olur.
- Zaman çizgisi klan **geçmişini** kullanmıyor: baloncuğun rengi her tarihte
  kişinin *şu anki* klanı. `clanAt` verisi duruyor, istenirse renk de tarihe
  uydurulabilir.
- Takımlara elle isim verilebilir (şu an "Takım 1, 2, 3…").
- Mobil görünüm haritada dar kalıyor; ayrı bir düzen düşünülebilir.
- Video başına oyuncu listesi (bir videoyu seçip kadrosunu görmek) yok.
