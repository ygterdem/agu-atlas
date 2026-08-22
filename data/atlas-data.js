/* =========================================================================
   AGHUSTOS'UN YOUTUBE ATLAS'I  —  VERİ DOSYASI
   -------------------------------------------------------------------------
   Siteyi güncellemek için SADECE bu dosyayı düzenlemen yeterli.
   Üç liste var: clans (klanlar), videos (videolar), players (oyuncular).

   KURAL 1 : Her oyuncunun "videos" listesi, o oyuncunun göründüğü video
             id'lerini içerir. Kaç video varsa baloncuk o kadar BÜYÜK ve
             merkeze o kadar YAKIN olur. (Otomatik hesaplanır.)
   KURAL 2 : "clan" alanı, clans listesindeki bir "tag" ile aynı olmalı.
             Klanı yoksa: clan: "" bırak (Bağımsız olarak gösterilir).
   KURAL 3 : videos listesindeki "id" değerlerini kısa ve benzersiz tut
             (v1, v2, gta-01 ... fark etmez). YouTube linkini "url" e yaz.
   ========================================================================= */

window.ATLAS_DATA = {

  /* ---------------- MERKEZ (sen) ---------------- */
  center: {
    name: "Aghustos",
    subtitle: "Youtube Atlas'ı",
    color: "#ffd166",
    channel: "https://www.youtube.com/@aghustos"   // kendi kanal linkin
  },

  /* ---------------- KLANLAR ----------------
     tag   : kısa etiket (oyuncularda bunu kullanacaksın)
     name  : ekranda görünen tam ad
     color : baloncuk rengi (istersen değiştir, boş bırakırsan otomatik atanır)
  */
  clans: [
    { tag: "AGU",  name: "Aghustos Ekibi",  color: "#ffd166" },
    { tag: "KRT",  name: "Kurtlar Vadisi",  color: "#ff5c8a" },
    { tag: "NOVA", name: "Nova Clan",       color: "#5cc8ff" },
    { tag: "TR",   name: "TR Squad",        color: "#8bd450" },
    { tag: "GEZ",  name: "Gezginler",       color: "#b18cff" }
  ],

  /* ---------------- VIDEOLAR ----------------
     id    : benzersiz kısa kod (oyuncularda bunu kullanacaksın)
     title : video başlığı
     url   : youtube linki
     date  : YYYY-AA-GG (isteğe bağlı, sıralama için)
     game  : oyun adı (isteğe bağlı)
  */
  videos: [
    { id: "v1", title: "4 Kişilik Squad ile Efsane Tavuk",       url: "https://youtube.com/watch?v=XXXXXXXX", date: "2025-01-12", game: "PUBG"     },
    { id: "v2", title: "Klan Savaşı Geri Döndü",                  url: "https://youtube.com/watch?v=XXXXXXXX", date: "2025-02-03", game: "PUBG"     },
    { id: "v3", title: "Rastgele Takım ile 20 Kill",              url: "https://youtube.com/watch?v=XXXXXXXX", date: "2025-02-20", game: "Warzone"  },
    { id: "v4", title: "Gece Yarısı Custom Maç",                  url: "https://youtube.com/watch?v=XXXXXXXX", date: "2025-03-08", game: "Warzone"  },
    { id: "v5", title: "Abonelerle Oynadım #1",                   url: "https://youtube.com/watch?v=XXXXXXXX", date: "2025-03-29", game: "Valorant" },
    { id: "v6", title: "Turnuva Finali",                          url: "https://youtube.com/watch?v=XXXXXXXX", date: "2025-04-17", game: "Valorant" },
    { id: "v7", title: "Yeni Sezon İlk Maçlar",                   url: "https://youtube.com/watch?v=XXXXXXXX", date: "2025-05-02", game: "Valorant" }
  ],

  /* ---------------- OYUNCULAR ----------------
     name  : ekranda görünen isim
     clan  : clans listesindeki tag   ("" = bağımsız)
     videos: göründüğü video id'leri
     link  : kanal / sosyal medya linki (isteğe bağlı)
     note  : kısa not (isteğe bağlı)
  */
  players: [
    { name: "Mehmet",    clan: "AGU",  videos: ["v1","v2","v3","v4","v5","v6"], link: "", note: "En çok birlikte oynadığım isim." },
    { name: "Burak",     clan: "AGU",  videos: ["v1","v2","v4","v6"],           link: "" },
    { name: "Deniz",     clan: "AGU",  videos: ["v2","v5"],                     link: "" },
    { name: "Kerem",     clan: "KRT",  videos: ["v1","v3","v4","v7"],           link: "" },
    { name: "Selin",     clan: "KRT",  videos: ["v3","v4"],                     link: "" },
    { name: "Emre",      clan: "KRT",  videos: ["v4"],                          link: "" },
    { name: "Arda",      clan: "NOVA", videos: ["v5","v6","v7"],                link: "" },
    { name: "Zeynep",    clan: "NOVA", videos: ["v6","v7"],                     link: "" },
    { name: "Can",       clan: "NOVA", videos: ["v6"],                          link: "" },
    { name: "Berk",      clan: "TR",   videos: ["v2","v3"],                     link: "" },
    { name: "Efe",       clan: "TR",   videos: ["v3"],                          link: "" },
    { name: "Yusuf",     clan: "TR",   videos: ["v7"],                          link: "" },
    { name: "Melis",     clan: "GEZ",  videos: ["v5","v7"],                     link: "" },
    { name: "Onur",      clan: "GEZ",  videos: ["v5"],                          link: "" },
    { name: "Kaan",      clan: "",     videos: ["v1"],                          link: "", note: "Tek videoda misafir oldu." },
    { name: "Ayşe",      clan: "",     videos: ["v6"],                          link: "" }
  ]
};
