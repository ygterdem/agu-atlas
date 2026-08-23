/* =========================================================================
   Aghustos'un Youtube Atlas'ı — görselleştirme motoru
   Veriyi düzenlemek için data/atlas-data.js dosyasına bak.
   Bu dosyayı değiştirmene normalde gerek yok.
   ========================================================================= */
(function () {
  "use strict";

  // ----------------------------------------------------------------- ayarlar
  var CFG = {
    R_NEAR: 130,       // en son birlikte oynadıklarımın merkeze uzaklığı
    R_FAR: 620,        // uzun zamandır oynamadıklarımın merkeze uzaklığı
    BUBBLE_PAD: 6,     // baloncuklar arası boşluk (isimlere yer açar)
    RECENCY_PULL: 0.22,// merkeze uzaklık ne kadar tarihe uysun (0 = sadece kümeler)
    TEAM_MIN: 4,       // kaç kişilik public grubu kendi rengini alsın
    HUB_ALPHA: 0.11,   // bana giden bağların görünürlüğü
    HUB_PULL: 0.20,    // bana giden bağların çekim gücü
    CHARGE: -70,       // baloncukların birbirini itmesi (küme aralığı)
    R_MIN: 9,          // en az videoda çıkanın baloncuk yarıçapı
    R_MAX: 58,         // en çok videoda çıkanın baloncuk yarıçapı
    R_POW: 0.78,       // boyut eğrisi. 0.5 = alan orantılı (üst uçta fark silinir),
                       // 1 = yarıçap orantılı (fark abartılır). 0.78 ikisinin arası:
                       // 47 video ile 28 video gözle ayrılır, 1 videoluk kalabalık
                       // yine küçük kalır.
    R_CENTER: 66,      // merkez baloncuk yarıçapı (en büyük oyuncudan büyük kalsın)
    CENTER_LOGO: "assets/Aghustos Logo Black.png",  // ortadaki logo (data.center.logo ile değiştirilebilir)
    LABEL_FONT: 9,     // isim puntosu. Küçültmek kalabalığı seyreltir ve
                       // daha çok ismin sığmasını sağlar
    LABEL_MIN_VIDEOS: 2, // bu kadar videodan az çıkanın ismi normalde gizli
    LABEL_ALL_UNDER: 120, // zaman çizgisi geride ve toplulukta bu kadar az kişi
                       // varsa eşiği uygulama, herkesin ismini yaz
                       // (yarıçapa bağlamak yanlıştı: boyut eğrisini her
                       // değiştirdiğinde kaç isim göründüğü de kayıyordu)
    PUBLIC_GROUP_MIN: 2, // kaç ayrı videoda birlikte oynayanlar aynı grup sayılsın
    PALETTE: ["#ffd166", "#ff5c8a", "#5cc8ff", "#8bd450", "#b18cff",
              "#ff9f45", "#4ecdc4", "#e05be0", "#7ea6ff", "#d4b483"],
    NO_CLAN: { tag: "__none__", name: "Public", color: "#7d87ad" }
  };

  var DATA = window.ATLAS_DATA;
  if (!DATA) { document.body.innerHTML = "<p style='padding:40px;font:16px sans-serif;color:#fff'>data/atlas-data.js yüklenemedi.</p>"; return; }

  // ------------------------------------------------------------- yardımcılar
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function norm(s) {
    return String(s || "").toLocaleLowerCase("tr")
      .replace(/ı/g, "i").replace(/İ/g, "i").replace(/ş/g, "s")
      .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c");
  }
  function fmtDate(d) {
    if (!d) return "";
    var p = String(d).split("-");
    if (p.length < 3) return d;
    var aylar = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
    return (+p[2]) + " " + (aylar[(+p[1]) - 1] || "") + " " + p[0];
  }

  // klan rengi verilmemişse: önce palet, sonra altın açı ile ayrık tonlar
  function autoColor(i) {
    if (i < CFG.PALETTE.length) return CFG.PALETTE[i];
    return d3.hsl((45 + i * 137.508) % 360, 0.62, 0.64).formatHex();
  }

  // --------------------------------------------------------- veriyi hazırla
  var videoById = {};
  (DATA.videos || []).forEach(function (v) { videoById[v.id] = v; });

  var clanByTag = {};
  var clans = (DATA.clans || []).map(function (c, i) {
    var o = { tag: c.tag, name: c.name || c.tag, color: c.color || autoColor(i), count: 0 };
    clanByTag[o.tag] = o;
    return o;
  });
  clanByTag[CFG.NO_CLAN.tag] = { tag: CFG.NO_CLAN.tag, name: CFG.NO_CLAN.name, color: CFG.NO_CLAN.color, count: 0 };

  var players = (DATA.players || []).map(function (p, i) {
    var vids = (p.videos || []).filter(function (id) { return !!videoById[id]; });
    var tag = p.clan && clanByTag[p.clan] ? p.clan : CFG.NO_CLAN.tag;
    clanByTag[tag].count++;
    return {
      id: "p" + i,
      name: p.name,
      aliases: (p.aliases || []).map(function (a) { return String(a).trim(); }).filter(Boolean),
      clanAt: p.clanAt || {},
      clan: tag,
      videos: vids,
      missing: (p.videos || []).length - vids.length,
      count: vids.length,
      link: p.link || "",
      note: p.note || "",
      isCenter: false
    };
  }).filter(function (p) { return p.count > 0; });

  // Hangi videoda kimler var / id ile oyuncuya eriş.
  var playerById = {};
  players.forEach(function (p) { playerById[p.id] = p; });
  var videoRoster = {};
  players.forEach(function (p) {
    p.videos.forEach(function (v) { (videoRoster[v] = videoRoster[v] || []).push(p); });
  });

  // Bir oyuncunun en çok birlikte oynadıkları (kaç ayrı videoda birlikte).
  function coPlayers(p) {
    var cut = timeCut(), cnt = {};
    p.videos.forEach(function (v) {
      if (videoDateOf(v) > cut) return;      // zaman çizgisinden sonraki video
      (videoRoster[v] || []).forEach(function (o) {
        if (o.id !== p.id) cnt[o.id] = (cnt[o.id] || 0) + 1;
      });
    });
    return Object.keys(cnt).map(function (id) {
      return { p: playerById[id], n: cnt[id] };
    }).sort(function (a, b) {
      return b.n - a.n || a.p.name.localeCompare(b.p.name, "tr");
    });
  }

  // videosu olmayan oyuncular elendi; klan sayaçlarını yeniden hesapla
  Object.keys(clanByTag).forEach(function (t) { clanByTag[t].count = 0; });
  players.forEach(function (p) { clanByTag[p.clan].count++; });

  // Public bir klan değil: klan listesinden ayrı tutuluyor.
  // Klanlar büyükten küçüğe sıralanır ki çemberde yan yana dursunlar ve
  // renk blokları okunaklı olsun.
  var clanList = clans.filter(function (c) { return c.count > 0; })
    .sort(function (a, b) { return b.count - a.count || a.name.localeCompare(b.name, "tr"); });
  var publicClan = clanByTag[CFG.NO_CLAN.tag];
  var hasPublic = publicClan.count > 0;
  // Efsanedeki (legend) liste, takımlar bulunduktan sonra kurulacak.

  var maxCount = d3.max(players, function (d) { return d.count; }) || 1;
  var rScale = d3.scalePow().exponent(CFG.R_POW)
    .domain([1, Math.max(2, maxCount)]).range([CFG.R_MIN, CFG.R_MAX]).clamp(true);

  // Her oyuncunun birlikte oynadığımız ilk/son video tarihi.
  players.forEach(function (p) {
    var ds = p.videos
      .map(function (id) { return (videoById[id] && videoById[id].date) || ""; })
      .filter(Boolean).sort();
    p.lastDate = ds.length ? ds[ds.length - 1] : "";
    p.firstDate = ds.length ? ds[0] : "";
    p.dates = ds;                   // zaman çizgisi bunu tarıyor (sıralı)
    p.total = p.count;              // tüm zamanların sayısı; p.count "o tarihe kadar"
    p.r = rScale(p.count);          // BOYUT: kaç videoda oynadığı
  });

  // Merkeze uzaklık = en son ne zaman birlikte oynadığımız (BOYUT ise video
  // sayısı; ikisi ayrı iş yapar). Aynı ay içinde son kez oynadıklarım aynı
  // "ay bandında" durur. Bir bantta çok kişi varsa bant, iç içe birkaç sıraya
  // açılır — böylece kalabalık aylar tek çemberde birbirine binmez.
  function monthKey(d) { return d ? String(d).slice(0, 7) : ""; }
  function monthStamp(k) {
    var q = String(k).split("-");
    return Date.UTC(+q[0], (+q[1] || 1) - 1, 1);
  }
  function monthsBetween(a, b) {
    var qa = a.split("-"), qb = b.split("-");
    return Math.abs((+qa[0] - +qb[0]) * 12 + (+qa[1] - +qb[1]));
  }


  // Klan geçmişi: her video için o dönemki klan (clanAt) yoksa mevcut klan.
  // Ardışık aynı klanlar tek bir döneme birleştirilir.
  players.forEach(function (p) {
    var items = p.videos.map(function (id) {
      var v = videoById[id];
      var at = p.clanAt && p.clanAt[id];
      var tag = (at === undefined || at === null) ? p.clan : String(at);
      if (!tag || !clanByTag[tag]) tag = CFG.NO_CLAN.tag;
      return { id: id, date: (v && v.date) || "", tag: tag };
    }).sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });

    var spans = [];
    items.forEach(function (it) {
      var last = spans[spans.length - 1];
      if (last && last.tag === it.tag) { last.to = it.date || last.to; last.n++; }
      else spans.push({ tag: it.tag, from: it.date, to: it.date, n: 1 });
    });
    p.clanItems = {};
    items.forEach(function (it) { p.clanItems[it.id] = it.tag; });
    p.history = spans;
    p.formerClans = [];
    spans.forEach(function (sp) {
      if (sp.tag !== p.clan && p.formerClans.indexOf(sp.tag) === -1) p.formerClans.push(sp.tag);
    });
  });

  // merkez düğüm
  var center = {
    id: "center", isCenter: true,
    name: DATA.center && DATA.center.name ? DATA.center.name : "Ben",
    subtitle: (DATA.center && DATA.center.subtitle) || "",
    color: (DATA.center && DATA.center.color) || "#ffd166",
    channel: (DATA.center && DATA.center.channel) || "",
    clan: null, count: (DATA.videos || []).length,
    r: CFG.R_CENTER, fx: 0, fy: 0, x: 0, y: 0
  };

  var publics = players.filter(function (p) { return p.clan === CFG.NO_CLAN.tag; });

  // Public'ler klansız ama gruplaşabilir: birbirleriyle CFG.PUBLIC_GROUP_MIN
  // veya daha fazla AYRI videoda oynayanlar aynı takım sayılır ve haritada
  // yan yana durur. (Birleşme geçişlidir: A-B ve B-C bağlıysa üçü bir grup.)
  var publicGroups = (function () {
    if (!publics.length) return [];
    var idx = {};
    publics.forEach(function (p, i) { idx[p.id] = i; });

    var pairs = {};
    Object.keys(videoRoster).forEach(function (v) {
      var list = videoRoster[v].filter(function (p) { return p.clan === CFG.NO_CLAN.tag; });
      for (var i = 0; i < list.length; i++) {
        for (var j = i + 1; j < list.length; j++) {
          var a = idx[list[i].id], b = idx[list[j].id];
          var k = a < b ? a + "|" + b : b + "|" + a;
          pairs[k] = (pairs[k] || 0) + 1;
        }
      }
    });

    var parent = publics.map(function (_, i) { return i; });
    function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
    Object.keys(pairs).forEach(function (k) {
      if (pairs[k] < CFG.PUBLIC_GROUP_MIN) return;
      var ab = k.split("|"), a = find(+ab[0]), b = find(+ab[1]);
      if (a !== b) parent[b] = a;
    });

    var byRoot = {};
    publics.forEach(function (p, i) {
      var r = find(i);
      (byRoot[r] = byRoot[r] || []).push(p);
    });
    var groups = Object.keys(byRoot).map(function (r) { return byRoot[r]; });
    groups.forEach(function (g) {
      g.sort(function (a, b) { return b.count - a.count || a.name.localeCompare(b.name, "tr"); });
      g.forEach(function (p) { p.pubGroupSize = g.length; });
    });
    // Kalabalık takımlar önce; tek başına oynayanlar en sona.
    groups.sort(function (a, b) {
      return b.length - a.length || b[0].count - a[0].count ||
             a[0].name.localeCompare(b[0].name, "tr");
    });
    return groups;
  })();

  // Klanı olmayan ama hep birlikte oynayanlar birer "takım": haritada kendi
  // renklerini alıyorlar, böylece kümeler referanstaki gibi renkle okunuyor.
  var teams = [];
  publicGroups.forEach(function (g) {
    if (g.length < CFG.TEAM_MIN) return;
    var i = teams.length;
    var t = {
      tag: "__team" + i,
      name: "Takım " + (i + 1),
      color: d3.hsl((32 + i * 137.508) % 360, 0.62, 0.62).formatHex(),
      count: g.length,
      isTeam: true
    };
    teams.push(t);
    g.forEach(function (p) { p.teamTag = t.tag; p.team = t; });
  });
  var legendList = clanList.concat(teams).concat(
    publics.length > teams.reduce(function (a, t) { return a + t.count; }, 0)
      ? [publicClan] : []);
  publicClan.count = publics.length - teams.reduce(function (a, t) { return a + t.count; }, 0);

  // ---- yerleşim ----
  // Artık merkeze giden tekerlek parmakları yok. Oyuncular BİRBİRİNE bağlı:
  // aynı videoda oynayan herkes arasında bir bağ var, bağın gücü kaç ayrı
  // videoda birlikte oynadıklarıdır. Kuvvet simülasyonu bu bağlardan doğal
  // kümeler çıkarır — hep beraber oynayanlar kendiliğinden bir öbek olur.
  var TAU = Math.PI * 2;

  // Merkeze uzaklık hedefi: en son ne zaman birlikte oynadığımız.
  (function () {
    var seen = {};
    players.forEach(function (p) { seen[monthKey(p.lastDate)] = 1; });
    var dated = Object.keys(seen).filter(Boolean).sort().reverse();
    var undated = !!seen[""];
    var n = dated.length;
    var byMonth = {};
    dated.forEach(function (k, i) {
      byMonth[k] = n > 1
        ? CFG.R_NEAR + (CFG.R_FAR - CFG.R_NEAR) * (i / (n - 1))
        : (CFG.R_NEAR + CFG.R_FAR) / 2;
    });
    if (undated) byMonth[""] = CFG.R_FAR;
    players.forEach(function (p) { p.recR = byMonth[monthKey(p.lastDate)]; });
    center.recR = 0;
  })();

  // Ortak oynama bağları.
  var coLinks = (function () {
    var w = {}, out = [];
    Object.keys(videoRoster).forEach(function (v) {
      var list = videoRoster[v];
      for (var i = 0; i < list.length; i++) {
        for (var j = i + 1; j < list.length; j++) {
          var a = list[i].id, b = list[j].id;
          var k = a < b ? a + "\u0000" + b : b + "\u0000" + a;
          w[k] = (w[k] || 0) + 1;
        }
      }
    });
    Object.keys(w).forEach(function (k) {
      var ab = k.split("\u0000");
      out.push({ source: playerById[ab[0]], target: playerById[ab[1]], w: w[k] });
    });
    return out;
  })();

  // Ben her videodayım: herkes bana da bağlı. Bu bağlar hem haritayı tek
  // parça tutuyor (kimse kopuk bir ada olarak savrulmuyor) hem de merkeze
  // uzaklığın tarihe göre ayarlanmasını sağlıyor. Çizimde çok soluklar ki
  // harita yine tekerleğe dönmesin.
  var hubLinks = players.map(function (p) { return { source: center, target: p }; });

  // Başlangıç konumları (altın açı sarmalı) — her açılışta aynı sonuç.
  players.forEach(function (p, i) {
    var ang = i * 2.399963229728653;
    p.x = Math.cos(ang) * p.recR;
    p.y = Math.sin(ang) * p.recR;
  });

  // düğüm görselleri
  players.forEach(function (p) {
    var c = clanByTag[p.clan];
    p.color = p.team ? p.team.color : c.color;
    p.clanName = p.team ? p.team.name : c.name;
    p.isPublic = p.clan === CFG.NO_CLAN.tag;
    p.search = [norm(p.name), norm(c.name), norm(c.tag), norm(p.team ? p.team.name : "")]
      .concat(p.aliases.map(norm))
      .concat(p.formerClans.map(function (t) {
        var fc = clanByTag[t];
        return fc ? norm(fc.name) + " " + norm(fc.tag) : norm(t);
      })).join(" ");
  });

  var nodes = [center].concat(players);

  // ------------------------------------------------------------------ durum
  var state = { hidden: {}, query: "", selected: null, allLabels: false, hover: null };

  // ------------------------------------------------------------------ sahne
  var stage = document.getElementById("stage");
  var svg = d3.select("#atlas");
  var W = 0, H = 0;

  var defs = svg.append("defs");
  var glow = defs.append("filter").attr("id", "glow").attr("x", "-60%").attr("y", "-60%").attr("width", "220%").attr("height", "220%");
  glow.append("feGaussianBlur").attr("stdDeviation", "7").attr("result", "b");
  var gm = glow.append("feMerge");
  gm.append("feMergeNode").attr("in", "b");
  gm.append("feMergeNode").attr("in", "SourceGraphic");

  var root = svg.append("g").attr("class", "root");
  var gRings = root.append("g").attr("class", "rings");
  var gNodes = root.append("g").attr("class", "nodes");
  // İsimler baloncuklarla aynı <g> içindeyken kendilerinden sonra çizilen
  // baloncukların altında kalıyordu ("Mavili1211" yerine "Mavil...11").
  // Ayrı ve en üstteki katmana alındılar; hepsi her şeyin üstüne biniyor.
  var gLabels = root.append("g").attr("class", "labels")
    .style("font-size", CFG.LABEL_FONT + "px");   // CFG tek kaynak olsun

  // merkezden dışa doğru yoğunluk halkaları
  // 15 binden fazla çizgiyi tek tek DOM'a koymak ağır olurdu; aynı renkteki
  // bağlar tek bir <path> içinde birleştiriliyor. Hafif kavisli çizilince
  // referanstaki lif görünümü çıkıyor.
  function edgePath(list) {
    var d = [];
    for (var i = 0; i < list.length; i++) {
      var l = list[i];
      var x1 = l.source.x, y1 = l.source.y, x2 = l.target.x, y2 = l.target.y;
      var mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      d.push("M", x1.toFixed(1), " ", y1.toFixed(1),
             "Q", (mx * 0.82).toFixed(1), " ", (my * 0.82).toFixed(1), " ",
             x2.toFixed(1), " ", y2.toFixed(1));
    }
    return d.join("");
  }
  // Bana giden bağlar en altta, çok soluk.
  var gHub = root.insert("g", ".nodes").attr("class", "hublinks");
  var hubPath = gHub.append("path")
    .attr("fill", "none")
    .attr("stroke", "#c9d3f2")
    .attr("stroke-opacity", CFG.HUB_ALPHA)
    .attr("stroke-width", 0.55)
    .attr("d", "");

  // Oyuncular arası bağlar normalde çizilmez — harita temiz kalsın diye.
  // Bir baloncuğa tıklayınca YALNIZCA o kişinin bağları görünür.
  var gHi = root.insert("g", ".nodes").attr("class", "hilinks");
  var hiPath = gHi.append("path")
    .attr("fill", "none").attr("stroke-width", 1.3).attr("stroke-opacity", 0.7)
    .attr("d", "");

  var node = gNodes.selectAll("g.node").data(nodes, function (d) { return d.id; }).join("g")
    .attr("class", function (d) { return "node" + (d.isCenter ? " center" : ""); });

  // merkez halkası
  node.filter(function (d) { return d.isCenter; })
    .append("circle")
    .attr("r", CFG.R_CENTER + 12)
    .attr("fill", "none")
    .attr("stroke", center.color)
    .attr("stroke-opacity", .3)
    .attr("stroke-dasharray", "3 7");

  node.append("circle")
    .attr("class", "bub")
    .attr("r", function (d) { return d.r; })
    .attr("fill", function (d) { return d.color; })
    .attr("fill-opacity", function (d) { return d.isCenter ? 1 : 0.85; })
    .attr("stroke", function (d) { return d.isCenter ? "#fff" : "rgba(8,10,18,.55)"; })
    .attr("stroke-width", function (d) { return d.isCenter ? 3 : 1.5; })
    .attr("filter", function (d) { return d.isCenter ? "url(#glow)" : null; });

  // Ortadaki baloncuğun içine logo. Daire biçiminde kırpılıyor; kenarda
  // ince bir sarı halka kalsın diye biraz küçük çiziliyor.
  (function () {
    var logo = (DATA.center && DATA.center.logo) || CFG.CENTER_LOGO;
    if (!logo) return;
    var rr = CFG.R_CENTER - 4;
    defs.append("clipPath").attr("id", "hub-clip")
      .append("circle").attr("r", rr);
    node.filter(function (d) { return d.isCenter; })
      .append("image")
      .attr("href", encodeURI(logo))
      .attr("x", -rr).attr("y", -rr)
      .attr("width", rr * 2).attr("height", rr * 2)
      .attr("clip-path", "url(#hub-clip)")
      .attr("preserveAspectRatio", "xMidYMid slice")
      .attr("pointer-events", "none");
  })();

  // Etiketin kendi <g>'si baloncuğun konumuna taşınır; applyLabelRule ise
  // x/y'yi baloncuğa göre uzaklık olarak yazar. Böylece yerleştirme hesabı
  // yine dünya koordinatlarında ve baloncuk merkezli kalıyor.
  var label = gLabels.selectAll("text").data(nodes, function (d) { return d.id; })
    .join("text")
    .attr("class", function (d) { return "lbl" + (d.isCenter ? " center" : ""); })
    .attr("text-anchor", "middle")
    .attr("x", 0)
    .attr("y", function (d) { return d.r + 13; })
    .text(function (d) { return d.name; });

  // Hangi oyuncu kiminle oynamış (tıklayınca vurgulamak için).
  var neighbours = {};
  coLinks.forEach(function (l) {
    (neighbours[l.source.id] = neighbours[l.source.id] || {})[l.target.id] = l.w;
    (neighbours[l.target.id] = neighbours[l.target.id] || {})[l.source.id] = l.w;
  });

  // Kuvvet simülasyonu bir kez çalışır, sonra herkes yerine çivilenir.
  function layout() {
    center.x = 0; center.y = 0; center.fx = 0; center.fy = 0;
    players.forEach(function (p) { p.fx = null; p.fy = null; });

    var sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(coLinks)
        .id(function (d) { return d.id; })
        .distance(function (l) { return Math.max(18, 90 / l.w); }))
      .force("hub", d3.forceLink(hubLinks)
        .id(function (d) { return d.id; })
        .distance(function (l) { return l.target.recR; })
        .strength(CFG.HUB_PULL))
      .force("charge", d3.forceManyBody()
        .strength(function (d) { return d.isCenter ? -1500 : CFG.CHARGE; })
        .distanceMax(900))
      .force("collide", d3.forceCollide(function (d) { return d.r + CFG.BUBBLE_PAD; }).iterations(2))
      .force("recency", d3.forceRadial(function (d) { return d.recR || 0; }, 0, 0)
        .strength(function (d) { return d.isCenter ? 0 : CFG.RECENCY_PULL; }))
      .alphaDecay(0.025)
      .stop();

    var ticks = Math.ceil(Math.log(0.001) / Math.log(1 - 0.025));
    for (var i = 0; i < ticks; i++) sim.tick();
    sim.stop();

    nodes.forEach(function (n) { n.fx = n.x; n.fy = n.y; });   // artık kıpırdamazlar
    draw();
  }

  function draw() {
    hubPath.attr("d", edgePath(hubLinks.filter(function (l) { return l.target.count > 0; })));
    var pos = function (d) { return "translate(" + d.x + "," + d.y + ")"; };
    node.attr("transform", pos);
    label.attr("transform", pos);
  }

  // -------------------------------------------------------------- zoom & fit
  var userMoved = false;
  var zoom = d3.zoom().scaleExtent([0.12, 6]).on("zoom", function (ev) {
    if (ev.sourceEvent) userMoved = true;
    root.attr("transform", ev.transform);
    label.attr("opacity", ev.transform.k < 0.32 ? 0 : 1);
  });
  svg.call(zoom).on("dblclick.zoom", null);

  function resize() {
    W = stage.clientWidth; H = stage.clientHeight;
    svg.attr("viewBox", [-W / 2, -H / 2, W, H].join(" "));
  }
  function outerRadius() { return CFG.R_FAR + 60; }
  function extentRadius() {
    var m = 0;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var d = Math.sqrt(n.x * n.x + n.y * n.y) + n.r + 14;
      if (d > m) m = d;
    }
    return m || outerRadius();
  }
  function fit(animate, useExtent) {
    resize();
    var R = useExtent ? extentRadius() : outerRadius();
    var pad = 18;
    var k = Math.min(W / (2 * (R + pad)), H / (2 * (R + pad)));
    k = Math.max(0.12, Math.min(1.15, k));
    var cur = d3.zoomTransform(svg.node()).k;
    if (!animate && cur && Math.abs(k - cur) / cur < 0.01) return;
    var t = d3.zoomIdentity.scale(k);
    (animate ? svg.transition().duration(650) : svg).call(zoom.transform, t);
  }
  window.addEventListener("resize", function () { resize(); });
  resize();
  layout();
  fit(false, true);

  // Baloncuklar sürüklenemez: konumları kalıcı olarak sabit.

  function isVisible(d) {
    if (d.isCenter) return true;
    if (d.count < 1) return false;          // o tarihte henüz ortada yok
    if (d.teamTag) return !state.hidden[d.teamTag];
    return !state.hidden[d.clan];
  }
  function matches(d) {
    if (!state.query) return true;
    if (d.isCenter) return true;
    return d.search.indexOf(state.query) !== -1;
  }

  // İsim etiketlerini üst üste bindirmeden yerleştirir. Her isim için dört
  // aday konum denenir (alt, üst, sağ, sol); hiçbiri boş değilse o isim
  // gizlenir ve baloncuğun üstüne gelince görünür. Metin haritayla birlikte
  // ölçeklendiğinden hesap dünya koordinatlarında yapılır.
  function overlaps(a, b) {
    return !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);
  }
  function overlapArea(a, b) {
    var w = Math.min(a[2], b[2]) - Math.max(a[0], b[0]);
    var h = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
    return w > 0 && h > 0 ? w * h : 0;
  }

  // 700+ baloncuğa karşı 8 aday konumu tek tek denemek her fare hareketinde
  // milyonlarca karşılaştırma demek. Baloncukları kaba bir ızgaraya atıp
  // sadece etiketin düştüğü hücrelere bakıyoruz.
  var GRID = 70;
  function gridOf(boxes) {
    var g = {};
    boxes.forEach(function (b) {
      for (var cx = Math.floor(b[0] / GRID); cx <= Math.floor(b[2] / GRID); cx++) {
        for (var cy = Math.floor(b[1] / GRID); cy <= Math.floor(b[3] / GRID); cy++) {
          (g[cx + ":" + cy] || (g[cx + ":" + cy] = [])).push(b);
        }
      }
    });
    return g;
  }
  function gridPenalty(g, box) {
    var seen = [], pen = 0;
    for (var cx = Math.floor(box[0] / GRID); cx <= Math.floor(box[2] / GRID); cx++) {
      for (var cy = Math.floor(box[1] / GRID); cy <= Math.floor(box[3] / GRID); cy++) {
        var cell = g[cx + ":" + cy];
        if (!cell) continue;
        for (var i = 0; i < cell.length; i++) {
          if (seen.indexOf(cell[i]) !== -1) continue;
          seen.push(cell[i]);
          pen += overlapArea(box, cell[i]);
        }
      }
    }
    return pen;
  }
  // Kutu ölçüleri puntodan türetilir; CFG.LABEL_FONT'u değiştirince
  // yerleşim hesabı da kendiliğinden uyar.
  var LF = CFG.LABEL_FONT;
  function labelWidth(name) { return name.length * LF * 0.535 + 6; }
  function labelBox(ox, oy, w, anchor) {
    var up = LF, dn = LF * 0.28;
    if (anchor === "start") return [ox - 2, oy - up, ox + w, oy + dn];
    if (anchor === "end") return [ox - w, oy - up, ox + 2, oy + dn];
    return [ox - w / 2, oy - up, ox + w / 2, oy + dn];
  }

  // Baloncuk yeterince büyükse ismi İÇİNE yazarız. Dışarı yazılınca büyük
  // baloncuğun ismi yanındaki küçüğün ismiymiş gibi okunuyordu. Sığmıyorsa
  // (uzun isim, küçük baloncuk) 0 döner, isim yine dışarı yazılır.
  function insideFontSize(p) {
    if (p.r < 22) return 0;
    var fit = (2 * p.r - 14) / Math.max(1, p.name.length * 0.55);
    var fs = Math.min(p.r * 0.44, 19, fit);
    return fs >= 10 ? Math.round(fs * 10) / 10 : 0;
  }
  // Baloncuğun rengi açıksa koyu, koyuysa açık yaz.
  function inkOn(hex) {
    var c = d3.color(hex);
    if (!c) return "#0b0e1a";
    return (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255 > 0.55 ? "#0b0e1a" : "#f2f5ff";
  }

  function applyLabelRule() {
    var show = {}, taken = [], bubbles = [];

    // İki ayrı kısıt var, ve bunları ayırmak önemli:
    //   · etiket etiketin üstüne ASLA binmez — iki isim üst üste okunmaz.
    //   · etiket baloncuğun üstüne binmesin, ama şartsa binebilir. Baloncuklar
    //     bu yoğunlukta o kadar sıkışık ki "hiç binmesin" demek isimlerin
    //     neredeyse tamamını yutuyordu. Metnin koyu konturu sayesinde baloncuk
    //     üstünde de okunuyor; o yüzden örtüşme yasak değil, puanlanıyor ve
    //     en az örtüşen konum seçiliyor.
    var outside = [];
    players.forEach(function (p) { p.lin = 0; p.lfs = 0; });

    // Sıra video sayısına göre: en çok oynayan yerini ilk seçer.
    var order = players.slice().sort(function (a, b) {
      return b.count - a.count || b.r - a.r || a.name.localeCompare(b.name, "tr");
    });

    // 1. tur — kimin ismi görünecek, ve büyüklerde isim içeri sığıyor mu?
    order.forEach(function (p) {
      if (!isVisible(p)) return;
      var must = state.selected === p.id || state.hover === p.id ||
                 (state.query && matches(p));
      if (!must && !state.allLabels && p.count < CFG.LABEL_MIN_VIDEOS &&
          tActive > CFG.LABEL_ALL_UNDER) return;
      if (!must && !matches(p)) return;
      p.lmust = must;
      p.lfs = insideFontSize(p);
      if (p.lfs) {
        p.lin = 1; p.lx = 0; p.ly = p.lfs * 0.35; p.la = "middle";
        show[p.id] = 1;                       // yeri garanti, yarışmaya girmez
      } else {
        outside.push(p);
      }
    });

    // 2. tur — kısıtlar. İsmi içine yazılmış baloncuklar da dokunulmaz:
    // üstlerine başka bir isim düşerse o isim onlarınmış gibi okunuyor.
    nodes.forEach(function (n) {
      if (!isVisible(n)) return;
      var b = [n.x - n.r, n.y - n.r, n.x + n.r, n.y + n.r];
      if (n.isCenter || n.lin) taken.push(b);
      else bubbles.push(b);
    });
    var bubbleGrid = gridOf(bubbles);

    // 3. tur — kalan isimleri baloncuğun dışına yerleştir.
    outside.forEach(function (p) {
      var must = p.lmust;
      var w = labelWidth(p.name);
      // İsim HER ZAMAN baloncuğun altında ve ortalanmış. Tek konum, tek kural.
      // Yana yazılanlar yanındaki baloncuğun ismi sanılıyordu; üste/alta
      // dönüşümlü yazmak da göz için tahmin edilemez oluyordu. Tek yer =
      // isme baktığın anda hangi baloncuğun olduğunu biliyorsun.
      // Bedeli: yeri dolu olanın ismi görünmüyor, başka yere kaçamıyor.
      var cands = [
        { x: 0, y: p.r + LF + 2, a: "middle" }
      ];
      var chosen = null, chosenBox = null, best = Infinity;
      for (var i = 0; i < cands.length; i++) {
        var c = cands[i];
        var box = labelBox(p.x + c.x, p.y + c.y, w, c.a);
        var clash = false;
        for (var j = 0; j < taken.length; j++) {
          if (overlaps(box, taken[j])) { clash = true; break; }
        }
        if (clash) continue;                     // başka bir isim orada: olmaz
        var pen = gridPenalty(bubbleGrid, box);
        if (pen < best) { best = pen; chosen = c; chosenBox = box; }
        if (pen === 0) break;                    // tertemiz yer, daha iyisi yok
      }
      if (!chosen) {
        if (!must) return;                       // sekiz yön de dolu: gizle
        chosen = cands[0];                       // seçili/aranan isim yine de görünsün
        chosenBox = labelBox(p.x + chosen.x, p.y + chosen.y, w, chosen.a);
      }
      taken.push(chosenBox);
      p.lx = chosen.x; p.ly = chosen.y; p.la = chosen.a;
      show[p.id] = 1;
    });

    label
      .attr("x", function (d) { return d.isCenter ? 0 : (d.lx || 0); })
      .attr("y", function (d) { return d.isCenter ? d.r + 13 : (d.ly == null ? d.r + 13 : d.ly); })
      .attr("text-anchor", function (d) { return d.isCenter ? "middle" : (d.la || "middle"); })
      .classed("inside", function (d) { return !d.isCenter && !!d.lin; })
      // attr() değil style(): CSS'teki .lbl{fill,font-size} sunum
      // özniteliklerini ezer, satır içi stil ise CSS'i ezer.
      .style("font-size", function (d) { return (!d.isCenter && d.lin) ? d.lfs + "px" : null; })
      .style("fill", function (d) { return (!d.isCenter && d.lin) ? inkOn(d.color) : null; })
      .classed("hide-label", function (d) { return d.isCenter ? false : !show[d.id]; });
  }

  function render() {
    var vis = function (d) { return isVisible(d) ? null : "none"; };
    var fade = function (d) {
      if (d.isCenter) return false;
      if (!matches(d)) return true;
      if (state.query) return false;   // arama varken seçim soldurmasın
      return !!(state.selected && state.selected !== d.id && !isNeighbourOfSelected(d));
    };
    node.style("display", vis).classed("faded", fade);
    // İsimler ayrı katmanda; aynı gizleme/soldurma onlara da uygulanmalı.
    label.style("display", vis).classed("faded", fade);
    // Bağ katmanı: tek tek değil topluca sönümlenir (15 binden fazla bağ var).
    var dim = !!(state.query || state.selected);
    gHub.attr("opacity", dim ? 0.3 : 1);

    // Seçili oyuncunun bağları öne çıkar.
    if (state.selected && playerById[state.selected]) {
      var sel = playerById[state.selected];
      var mine = coLinks.filter(function (l) { return l.source === sel || l.target === sel; });
      mine = mine.concat(hubLinks.filter(function (l) { return l.target === sel; }));
      hiPath.attr("stroke", sel.color).attr("d", edgePath(mine));
    } else {
      hiPath.attr("d", "");
    }
    applyLabelRule();
    renderLegend();
  }

  // Seçili oyuncuyla birlikte oynamış mı? (Tıklayınca sadece onlar parlar.)
  function isNeighbourOfSelected(d) {
    var sel = playerById[state.selected];
    if (!sel) return true;                       // merkez seçiliyse herkes
    return !!(neighbours[sel.id] && neighbours[sel.id][d.id]);
  }

  // --------------------------------------------------------------- etkileşim
  var tip = document.getElementById("tooltip");

  node
    .on("mouseenter", function (ev, d) {
      state.hover = d.id; applyLabelRule();
      d3.select(this).select("circle.bub").attr("stroke", "#fff").attr("stroke-width", 2.5);
      showTip(ev, d);
    })
    .on("mousemove", function (ev) { moveTip(ev); })
    .on("mouseleave", function (ev, d) {
      state.hover = null; applyLabelRule();
      d3.select(this).select("circle.bub")
        .attr("stroke", d.isCenter ? "#fff" : "rgba(0,0,0,.45)")
        .attr("stroke-width", d.isCenter ? 3 : 1.5);
      tip.hidden = true;
    })
    .on("click", function (ev, d) { ev.stopPropagation(); select(d.id); });

  svg.on("click", function () { select(null); });

  function showTip(ev, d) {
    if (d.isCenter) {
      tip.innerHTML = "<b>" + esc(d.name) + "</b>" +
        "<div class='tt-meta'>" + players.length + " oyuncu · " + (DATA.videos || []).length + " video</div>";
    } else {
      tip.innerHTML =
        "<div class='tt-clan' style='color:" + d.color + "'>" + esc(d.clanName) + "</div>" +
        "<b>" + esc(d.name) + "</b>" +
        (d.formerClans.length
          ? "<div class='tt-meta'>eskiden: " +
            esc(d.formerClans.map(clanLabel).join(", ")) + "</div>"
          : "") +
        (d.aliases.length
          ? "<div class='tt-meta'>diğer adları: " +
            esc(d.aliases.slice(0, 3).join(", ")) + (d.aliases.length > 3 ? " …" : "") + "</div>"
          : "") +
        "<div class='tt-meta'>" + d.count + " videoda birlikte oynadık" +
          (d.lastDate ? " · son: " + fmtDate(d.lastDate) : "") + "</div>";
    }
    tip.hidden = false;
    moveTip(ev);
  }
  function moveTip(ev) {
    var r = stage.getBoundingClientRect();
    var x = ev.clientX - r.left + 16, y = ev.clientY - r.top + 16;
    if (x + tip.offsetWidth > r.width - 8) x = ev.clientX - r.left - tip.offsetWidth - 16;
    if (y + tip.offsetHeight > r.height - 8) y = ev.clientY - r.top - tip.offsetHeight - 16;
    tip.style.left = x + "px"; tip.style.top = y + "px";
  }

  // ------------------------------------------------------------- detay paneli
  var panel = document.getElementById("panel");
  var panelBody = document.getElementById("panel-body");
  document.getElementById("panel-close").onclick = function () { select(null); };

  function select(id) {
    state.selected = id;
    if (!id) { panel.hidden = true; render(); return; }
    var d = nodes.find(function (n) { return n.id === id; });
    if (!d) { panel.hidden = true; render(); return; }
    panelBody.innerHTML = d.isCenter ? centerPanel() : playerPanel(d);
    panel.hidden = false;
    panel.scrollTop = 0;
    wireChips();
    render();
  }

  function clanLabel(tag) {
    var c = clanByTag[tag];
    return c ? c.name : (tag || CFG.NO_CLAN.name);
  }
  function clanColorOf(tag) {
    var c = clanByTag[tag];
    return c ? c.color : CFG.NO_CLAN.color;
  }
  function yearOf(d) { return d ? String(d).slice(0, 4) : ""; }

  function videoRow(v, atTag) {
    var meta = [esc(v.game || ""), fmtDate(v.date)];
    if (atTag !== undefined && atTag !== null && atTag !== "") {
      meta.push("<span style='color:" + clanColorOf(atTag) + "'>" + esc(clanLabel(atTag)) + "</span>");
    }
    return "<a class='vid' href='" + esc(v.url || "#") + "' target='_blank' rel='noopener'>" +
      "<span class='play'>▶</span><span><span class='vtitle'>" + esc(v.title) + "</span>" +
      "<span class='vmeta'>" + meta.filter(Boolean).join(" · ") + "</span></span></a>";
  }

  function playerPanel(d) {
    // Panel de zaman çizgisine uyar: haritada 2023'e bakarken panelin 2026
    // rakamlarını göstermesi kafa karıştırırdı.
    var cut = timeCut();
    var vids = d.videos.map(function (id) { return videoById[id]; })
      .filter(function (v) { return v && (v.date || "") <= cut; })
      .sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
    var mates = players.filter(function (p) {
      return p.count > 0 && p.id !== d.id &&
        (d.teamTag ? p.teamTag === d.teamTag : (!p.teamTag && p.clan === d.clan));
    })
      .sort(function (a, b) { return b.count - a.count; });
    var share = Math.round(d.count / (activeVideos() || 1) * 100);

    var h = "<h2 class='p-name'>" + esc(d.name) + "</h2>" +
      "<span class='p-clan' style='background:" + d.color + "22;color:" + d.color + "'>" + esc(d.clanName) + "</span>";
    if (d.lastDate) {
      h += "<p class='p-note' style='margin-top:8px'>Son birlikte oynadığımız video: <b style='color:#dfe4f7'>" +
        fmtDate(d.lastDate) + "</b>" +
        (d.firstDate && d.firstDate !== d.lastDate ? " · ilk: " + fmtDate(d.firstDate) : "") + "</p>";
    }
    if (d.note) h += "<p class='p-note'>" + esc(d.note) + "</p>";
    if (d.link) h += "<a class='p-link' href='" + esc(d.link) + "' target='_blank' rel='noopener'>Kanalına git →</a>";

    h += "<div class='p-stats'>" +
      "<div class='p-stat'><b>" + d.count + "</b><span>Video</span></div>" +
      "<div class='p-stat'><b>%" + share + "</b><span>Videolarımın</span></div>" +
      "<div class='p-stat'><b>" + ((d.isPublic && !d.teamTag) ? d.count : mates.length + 1) +
        "</b><span>" + ((d.isPublic && !d.teamTag) ? "Video" : (d.teamTag ? "Takım üyesi" : "Klan üyesi")) +
        "</span></div>" +
      "</div>";

    if (d.aliases.length) {
      h += "<div class='p-sec'>Diğer adları</div><div class='chips'>" +
        d.aliases.map(function (a) {
          return "<span class='chip' style='cursor:default'>" + esc(a) + "</span>";
        }).join("") + "</div>";
    }

    if (d.history.length > 1) {
      h += "<div class='p-sec'>Klan geçmişi</div><div class='chips'>" +
        d.history.map(function (sp, i) {
          var yr = yearOf(sp.from), yr2 = yearOf(sp.to);
          var when = yr ? (yr === yr2 ? yr : yr + "–" + yr2) : "";
          var col = clanColorOf(sp.tag);
          return (i ? "<span style='align-self:center;color:var(--ink-dim)'>→</span>" : "") +
            "<span class='chip' style='cursor:default;border-color:" + col + "55;background:" +
            col + "18'>" + esc(clanLabel(sp.tag)) +
            "<span style='opacity:.6'> " + sp.n + " video" + (when ? " · " + when : "") + "</span></span>";
        }).join("") + "</div>";
    }

    h += "<div class='p-sec'>Birlikte oynadığımız videolar</div>" +
      vids.map(function (v) {
        var at = d.clanItems[v.id];
        return videoRow(v, at !== d.clan ? at : "");
      }).join("");

    var co = coPlayers(d).filter(function (x) { return x.n > 1; }).slice(0, 8);
    if (co.length) {
      h += "<div class='p-sec'>En çok birlikte oynadıkları" +
        (d.isPublic && d.pubGroupSize > 1
          ? " <span style='text-transform:none;letter-spacing:0'>· haritada yanında duruyorlar</span>"
          : "") + "</div><div class='chips'>" +
        co.map(function (x) {
          return "<span class='chip' data-go='" + x.p.id + "' style='border-color:" +
            x.p.color + "55'>" + esc(x.p.name) +
            " <span style='opacity:.55'>" + x.n + " video</span></span>";
        }).join("") + "</div>";
    }

    if (mates.length && (!d.isPublic || d.teamTag)) {
      h += "<div class='p-sec'>" + (d.teamTag ? "Aynı takımdan" : "Aynı klandan") +
        "</div><div class='chips'>" +
        mates.map(function (m) {
          return "<span class='chip' data-go='" + m.id + "'>" + esc(m.name) + " <span style='opacity:.55'>" + m.count + "</span></span>";
        }).join("") + "</div>";
    }
    return h;
  }

  function centerPanel() {
    var cut = timeCut();
    var top = players.filter(function (p) { return p.count > 0; })
      .sort(function (a, b) { return b.count - a.count || a.name.localeCompare(b.name, "tr"); }).slice(0, 8);
    var recent = (DATA.videos || []).filter(function (v) { return (v.date || "") <= cut; })
      .sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); }).slice(0, 5);
    var h = "<h2 class='p-name'>" + esc(center.name) + "</h2>" +
      "<span class='p-clan' style='background:" + center.color + "22;color:" + center.color + "'>" + esc(center.subtitle || "Merkez") + "</span>";
    if (center.channel) h += "<a class='p-link' href='" + esc(center.channel) + "' target='_blank' rel='noopener'>YouTube kanalım →</a>";
    h += "<div class='p-stats'>" +
      "<div class='p-stat'><b>" + players.filter(function (p) { return p.count > 0; }).length +
        "</b><span>Oyuncu</span></div>" +
      "<div class='p-stat'><b>" + activeVideos() + "</b><span>Video</span></div>" +
      "<div class='p-stat'><b>" + activeClans() + "</b><span>Klan</span></div>" +
      "</div>";
    h += "<div class='p-sec'>En çok birlikte oynadıklarım</div><div class='chips'>" +
      top.map(function (m) {
        return "<span class='chip' data-go='" + m.id + "' style='border-color:" + m.color + "55'>" + esc(m.name) + " <span style='opacity:.55'>" + m.count + "</span></span>";
      }).join("") + "</div>";
    h += "<div class='p-sec'>Son videolar</div>" + recent.map(videoRow).join("");
    return h;
  }

  function wireChips() {
    panelBody.querySelectorAll("[data-go]").forEach(function (el) {
      el.onclick = function () { select(el.getAttribute("data-go")); focusNode(el.getAttribute("data-go")); };
    });
  }

  function focusNode(id) {
    var d = nodes.find(function (n) { return n.id === id; });
    if (!d) return;
    var k = Math.max(1.1, d3.zoomTransform(svg.node()).k);
    svg.transition().duration(600).call(zoom.transform,
      d3.zoomIdentity.scale(k).translate(-d.x, -d.y));
  }

  // -------------------------------------------------------------------- legend
  var legendBox = document.getElementById("legend-list");
  // Efsanedeki sayılar da zaman çizgisine uyar; alt bar "45 video" derken
  // solda tüm zamanların sayısının durması kafa karıştırırdı. Satırlar
  // kaybolmaz (henüz kimsesi yoksa 0 yazar) — süzgeç olarak yerinde kalsınlar.
  function legendCounts() {
    var m = {};
    players.forEach(function (p) {
      if (!p.count) return;
      var t = p.teamTag || p.clan;
      m[t] = (m[t] || 0) + 1;
    });
    return m;
  }
  function renderLegend() {
    var cnt = legendCounts();
    legendBox.innerHTML = legendList.map(function (c) {
      var sep = c.tag === CFG.NO_CLAN.tag
        ? ";margin-top:6px;padding-top:9px;border-top:1px solid rgba(255,255,255,.12)" : "";
      return "<div class='legend-item" + (state.hidden[c.tag] ? " off" : "") + "' data-clan='" +
        esc(c.tag) + "' style='border-radius:8px" + sep + "'>" +
        "<span class='swatch' style='background:" + c.color + "'></span>" +
        "<span class='lname'>" + esc(c.name) + "</span>" +
        "<span class='lcount'>" + (cnt[c.tag] || 0) + "</span></div>";
    }).join("");
    legendBox.querySelectorAll("[data-clan]").forEach(function (el) {
      el.onclick = function () {
        var t = el.getAttribute("data-clan");
        state.hidden[t] = !state.hidden[t];
        render();
      };
    });
  }
  document.getElementById("legend-all").onclick = function () { state.hidden = {}; render(); };

  // -------------------------------------------------- köşe kutularını aç/kapat
  // Klanlar ve Aghustos kutuları başlıklarından katlanır. Tercih tarayıcıda
  // saklanır. Dar ekranda haritaya yer kalsın diye varsayılan kapalı.
  var BOXKEY = "atlas-kutu-";
  function setBox(box, collapsed) {
    box.classList.toggle("collapsed", collapsed);
    var t = box.querySelector(".box-toggle");
    if (t) t.setAttribute("aria-expanded", collapsed ? "false" : "true");
  }
  function initBox(id) {
    var box = document.getElementById(id);
    if (!box) return;
    var saved = null;
    try { saved = localStorage.getItem(BOXKEY + id); } catch (e) { /* gizli sekme */ }
    var dar = window.matchMedia("(max-width:820px)").matches;
    setBox(box, saved ? saved === "kapali" : dar);
    var btn = box.querySelector(".box-toggle");
    if (btn) btn.onclick = function () {
      var kapali = !box.classList.contains("collapsed");
      setBox(box, kapali);
      try { localStorage.setItem(BOXKEY + id, kapali ? "kapali" : "acik"); } catch (e) {}
    };
  }
  initBox("legend");
  initBox("social");

  // -------------------------------------------------------------------- arama
  var search = document.getElementById("search");
  search.addEventListener("input", function () {
    state.query = norm(search.value.trim());
    render();
  });
  document.getElementById("search-clear").onclick = function () {
    search.value = ""; state.query = ""; render(); search.focus();
  };

  // ------------------------------------------------------------------ butonlar
  var btnLabels = document.getElementById("btn-labels");
  btnLabels.onclick = function () {
    state.allLabels = !state.allLabels;
    btnLabels.classList.toggle("on", state.allLabels);
    applyLabelRule();
  };
  document.getElementById("btn-reset").onclick = function () {
    state.hidden = {}; state.query = ""; search.value = "";
    resetTime();
    select(null); userMoved = false; fit(true, true);
  };
  var help = document.getElementById("help");
  document.getElementById("btn-help").onclick = function () { help.hidden = false; };
  document.getElementById("help-close").onclick = function () { help.hidden = true; };
  help.onclick = function (e) { if (e.target === help) help.hidden = true; };

  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && document.activeElement !== search) { e.preventDefault(); search.focus(); }
    else if (e.key === "Escape") { help.hidden = true; select(null); search.blur(); }
    else if ((e.key === "r" || e.key === "R") && document.activeElement !== search) { document.getElementById("btn-reset").click(); }
  });

  // ------------------------------------------------------------ zaman çizgisi
  // Yerleşim TÜM veriyle bir kez hesaplanıp donduruldu; zaman çizgisi
  // konumlara dokunmuyor. Sadece o tarihe kadar ortaya çıkmış olanlar çizilir
  // ve baloncuklar o tarihteki video sayısı kadar büyür. Böylece çubuğu
  // sürüklerken topluluk yerinde büyüyor — harita her adımda baştan
  // dağılmıyor, kimse yer değiştirmiyor.
  //
  // Ölçek (rScale) tüm zamanların en yükseğine göre sabit; yoksa her adımda
  // en büyük baloncuk yeniden 58px olur ve büyüme hissi kaybolurdu.
  var timeStops = (function () {
    var seen = {}, out = [];
    (DATA.videos || []).forEach(function (v) {
      if (v.date && !seen[v.date]) { seen[v.date] = 1; out.push(v.date); }
    });
    out.sort();
    // Sıfırdan başla: ilk videodan bir gün öncesi de bir durak. O noktada
    // haritada sadece ben varım, kimse yok. Çubuğu ilk kademeye çekince
    // topluluk gerçekten boştan başlıyor — ilk durak ilk video olsaydı
    // harita daha açılır açılmaz 21 kişiyle dolu görünürdü.
    if (out.length) out.unshift(dayBefore(out[0]));
    return out;
  }());
  function dayBefore(d) {
    var q = String(d).split("-");
    var t = new Date(Date.UTC(+q[0], (+q[1]) - 1, (+q[2])) - 86400000);
    function iki(n) { return (n < 10 ? "0" : "") + n; }
    return t.getUTCFullYear() + "-" + iki(t.getUTCMonth() + 1) + "-" + iki(t.getUTCDate());
  }
  state.tIdx = timeStops.length ? timeStops.length - 1 : 0;
  var tActive = players.length;

  function timeCut() { return timeStops.length ? timeStops[state.tIdx] : "9999-12-31"; }
  function atEnd() { return !timeStops.length || state.tIdx === timeStops.length - 1; }
  function videoDateOf(id) { var v = videoById[id]; return (v && v.date) || ""; }
  function activeVideos() {
    var cut = timeCut(), n = 0;
    (DATA.videos || []).forEach(function (v) { if ((v.date || "") <= cut) n++; });
    return n;
  }
  function activeClans() {
    var seen = {}, n = 0;
    players.forEach(function (p) {
      if (!p.count || p.isPublic || seen[p.clan]) return;
      seen[p.clan] = 1; n++;
    });
    return n;
  }

  function applyTime() {
    var cut = timeCut(), act = 0;
    players.forEach(function (p) {
      var c = 0;
      // p.dates sıralı: ilk büyük tarihte durabiliriz.
      for (var i = 0; i < p.dates.length; i++) {
        if (p.dates[i] <= cut) c++; else break;
      }
      p.count = c;
      p.r = c ? rScale(c) : 0;
      p.firstDate = c ? p.dates[0] : "";
      p.lastDate = c ? p.dates[c - 1] : "";
      if (c) act++;
    });
    tActive = act;
    center.count = activeVideos();
    node.select("circle.bub").attr("r", function (d) { return d.isCenter ? CFG.R_CENTER : d.r; });
    hubPath.attr("d", edgePath(hubLinks.filter(function (l) { return l.target.count > 0; })));
    // Seçili kişi o tarihte henüz yoksa paneli kapat.
    if (state.selected && playerById[state.selected] && !playerById[state.selected].count) {
      select(null);
    }
    renderStats();
    renderLegend();
    render();
  }

  var tlBox = document.getElementById("timeline");
  var tlRange = document.getElementById("tl-range");
  var tlDate = document.getElementById("tl-date");
  var tlPlay = document.getElementById("tl-play");
  var tlEnd = document.getElementById("tl-end");
  var playTimer = null;

  function setTime(i) {
    if (!timeStops.length) return;
    i = Math.max(0, Math.min(timeStops.length - 1, i));
    if (i !== state.tIdx) { state.tIdx = i; applyTime(); }
    syncTimeline();
  }
  function syncTimeline() {
    if (!timeStops.length) return;
    tlRange.value = state.tIdx;
    var pct = timeStops.length > 1 ? (state.tIdx / (timeStops.length - 1)) * 100 : 100;
    tlRange.style.setProperty("--pct", pct + "%");
    tlDate.textContent = fmtDate(timeCut());
    tlBox.classList.toggle("at-end", atEnd());
    tlPlay.textContent = playTimer ? "❚❚" : "▶";
    tlPlay.title = playTimer ? "Durdur" : "Oynat";
  }
  function startPlay() {
    if (!timeStops.length || playTimer) return;
    if (atEnd()) setTime(0);              // sondaysak baştan al
    playTimer = setInterval(function () {
      if (atEnd()) { stopPlay(); return; }
      setTime(state.tIdx + 1);
    }, 220);
    syncTimeline();
  }
  function stopPlay() {
    if (!playTimer) return;
    clearInterval(playTimer); playTimer = null; syncTimeline();
  }
  function resetTime() { stopPlay(); setTime(timeStops.length - 1); }

  if (!timeStops.length) {
    if (tlBox) tlBox.hidden = true;       // tarihsiz veri: çubuğun anlamı yok
  } else {
    tlRange.min = 0;
    tlRange.max = timeStops.length - 1;
    tlRange.value = state.tIdx;
    tlRange.addEventListener("input", function () { stopPlay(); setTime(+tlRange.value); });
    tlPlay.onclick = function () { playTimer ? stopPlay() : startPlay(); };
    tlEnd.onclick = resetTime;
    syncTimeline();
  }

  // -------------------------------------------------------------------- alt bar
  function renderStats() {
    var nPlayer = 0, nJoin = 0, nPub = 0, nClan = 0, nTeam = 0, cSeen = {}, tSeen = {};
    players.forEach(function (p) {
      if (!p.count) return;
      nPlayer++; nJoin += p.count;
      if (p.teamTag) {
        if (!tSeen[p.teamTag]) { tSeen[p.teamTag] = 1; nTeam++; }
      } else if (p.isPublic) {
        nPub++;
      }
      if (!p.isPublic && !cSeen[p.clan]) { cSeen[p.clan] = 1; nClan++; }
    });
    document.getElementById("stats").innerHTML =
      "<span><b>" + nPlayer + "</b> oyuncu</span>" +
      "<span><b>" + activeVideos() + "</b> video</span>" +
      "<span><b>" + nClan + "</b> klan</span>" +
      (nTeam ? "<span><b>" + nTeam + "</b> takım</span>" : "") +
      (nPub ? "<span><b>" + nPub + "</b> public</span>" : "") +
      "<span><b>" + nJoin + "</b> katılım</span>";
  }
  renderStats();

  var sub = document.getElementById("brand-sub");
  if (sub && DATA.center && DATA.center.subtitle) sub.textContent = DATA.center.subtitle;

  render();

  // konsola küçük bir sağlık raporu
  var missing = players.filter(function (p) { return p.missing > 0; });
  if (missing.length) {
    console.warn("Bu oyuncuların bazı video id'leri videos listesinde yok:",
      missing.map(function (p) { return p.name; }).join(", "));
  }
})();
