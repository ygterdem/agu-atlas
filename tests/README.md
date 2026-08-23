# Testler

Bu klasördeki her `mk_*.py`, projenin kökünde geçici bir `_*.html` test sayfası
üretir. Sayfa normal siteyi yükler, üstüne kendi test verisini enjekte eder,
tarayıcıda birtakım kontroller çalıştırır ve sonucu `document.title` içine
yazar. Böylece testler gerçek sayfada, gerçek yerleşim motoruyla koşar.

## Çalıştırma

Önce yerel sunucuyu başlat:

```bash
python serve.py
```

Sonra test sayfasını üret ve başsız (headless) tarayıcıda aç:

```bash
python tests/mk_graphtest.py          # kökte _graphtest.html oluşur
```

Tarayıcıyı açıp `http://127.0.0.1:8899/_graphtest.html` adresine gidersen
sonucu **sekme başlığında** görürsün (`TESTS PASS ... | FAIL ...`).

Komut satırından okumak için (Playwright'ın indirdiği Chromium ile):

```bash
CH="$HOME/AppData/Local/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-win64/chrome-headless-shell.exe"
"$CH" --headless --disable-gpu --no-sandbox --virtual-time-budget=14000 \
      --dump-dom http://127.0.0.1:8899/_graphtest.html \
  | grep -o "<title>TESTS[^<]*</title>"
```

Bitince geçici dosyayı sil: `rm _graphtest.html`

## Hangi test neyi kontrol ediyor?

| Dosya | Konu |
|---|---|
| `mk_graphtest.py` | Yerleşim: birlikte oynayanlar kümeleniyor mu, bağlar tıklayınca çıkıyor mu, herkes bana bağlı mı, boyut video sayısından mı, takımlar renkleniyor mu, baloncuklar sabit mi |
| `mk_pubtest.py` | Public adlandırması, efsane, alt bar sayaçları, seçim davranışı |
| `mk_maptest.py` | Diğer adlar (aliases) ve klan geçmişi: panelde görünüyor mu, eski adla/eski klanla arama çalışıyor mu |
| `mk_actest.py` | Düzenleyici: kadro önerileri, "zaten eklendi", eski adı mevcut oyuncuya bağlama |
| `mk_clantest.py` | Düzenleyici: o videodaki klan (`clanAt`), etiket değişince taşıma, video silinince temizleme |

`mk_actest.py` ve `mk_clantest.py` düzenleyiciyi (`editor.html`) test eder,
diğerleri haritayı.

## Not

Testler `data/atlas-data.js` dosyasına dokunmaz; kendi sentetik verilerini
enjekte ederler. Sadece `mk_actest.py` ile `mk_clantest.py` senin gerçek
verinle çalışır (düzenleyicinin yüklediği veri) — bu yüzden sonuçları
verinin durumuna göre değişebilir.

---

**Not:** düzenleyici testleri (`mk_actest.py`, `mk_clantest.py`) `editor.html`
ve `assets/editor.js` dosyalarını okur. Bunlar `main` dalında yok; yeni bir
kopya çıkardıysan önce geri getir:

```bash
git checkout editor -- editor.html assets/editor.js assets/editor.css
```
