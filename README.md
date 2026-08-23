# Aghustos'un Youtube Atlas'ı 🛰️

Videolarımda birlikte oynadığım oyuncuların bağlantı haritası. Aynı videoda
oynayanlar birbirine bağlanır, yerleşimi bu bağlar belirler — hep beraber
oynayanlar haritada kendiliğinden bir küme oluşturur.

- **Baloncuk boyutu** = kaç videoda çıktığı
- **Merkeze yakınlık** = en son ne zaman birlikte oynandığı
- **Renk** = klan (klansız olup sürekli birlikte oynayanlar "takım" sayılır)
- **Alttaki çubuk** = zaman çizgisi; haritayı o tarihteki hâline döndürür

**Site:** https://ygterdem.github.io/agu-atlas/
**Düzenleyici:** https://ygterdem.github.io/agu-atlas/editor.html

---

## Veri nasıl güncellenir

1. Düzenleyiciyi aç (haritadaki ✎ butonu), **Kadro** sekmesinden video seç ve
   oyuncuları yaz.
2. **Kaydet** sekmesinden `atlas-data.js indir`.
3. İnen dosyayı `data/atlas-data.js` üzerine yaz.
4. `git add -A && git commit -m "yeni oyuncular" && git push`

GitHub Pages `main` dalından yayın yapıyor; push'tan 1-2 dakika sonra site
güncellenir. Düzenleyici sunucusuz çalışır, veri hiçbir yere gitmez.

## Yerelde çalıştırmak

```bash
python serve.py     # http://127.0.0.1:8899/
```

`python -m http.server` kullanma: `Cache-Control` göndermediği için tarayıcı
eski JS'i önbellekten veriyor.

## Dosyalar

```
index.html / editor.html    harita ve düzenleyici sayfaları
assets/atlas.js             harita motoru
assets/editor.js            düzenleyici motoru
data/atlas-data.js          ← VERİ (düzenleyicinin ürettiği dosya)
serve.py                    yerel önizleme sunucusu (önbelleksiz)
tests/                      tarayıcıda koşan testler
```

Tek dış bağımlılık D3.js (CDN). Derleme adımı yok.

---

Kararlar, ayar düğmeleri, veri modeli ve geliştirme notları:
**[NOTLAR.md](NOTLAR.md)**
