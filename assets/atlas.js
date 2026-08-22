/* =========================================================================
   Aghustos'un Youtube Atlas'ı — görselleştirme motoru
   Veriyi düzenlemek için data/atlas-data.js dosyasına bak.
   Bu dosyayı değiştirmene normalde gerek yok.
   ========================================================================= */
(function () {
  "use strict";

  // ----------------------------------------------------------------- ayarlar
  var CFG = {
    R_FAR: 430,        // 1 videoda görünenlerin merkeze uzaklığı
    R_NEAR: 155,       // en çok videoda görünenlerin merkeze uzaklığı
    R_MIN: 9,          // en küçük baloncuk yarıçapı
    R_MAX: 30,         // en büyük baloncuk yarıçapı
    R_CENTER: 46,      // merkez baloncuk yarıçapı
    LABEL_MIN_R: 13,   // bu yarıçapın altındakilerin ismi normalde gizli
    PALETTE: ["#ffd166", "#ff5c8a", "#5cc8ff", "#8bd450", "#b18cff",
              "#ff9f45", "#4ecdc4", "#e05be0", "#7ea6ff", "#d4b483"],
    NO_CLAN: { tag: "__none__", name: "Bağımsız", color: "#7d87ad" }
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

  // videosu olmayan oyuncular elendi; klan sayaçlarını yeniden hesapla
  Object.keys(clanByTag).forEach(function (t) { clanByTag[t].count = 0; });
  players.forEach(function (p) { clanByTag[p.clan].count++; });

  // boş klanları listeden düş, bağımsızlar varsa en sona ekle
  var clanList = clans.filter(function (c) { return c.count > 0; });
  if (clanByTag[CFG.NO_CLAN.tag].count > 0) clanList.push(clanByTag[CFG.NO_CLAN.tag]);

  var maxCount = d3.max(players, function (d) { return d.count; }) || 1;
  var rScale = d3.scaleSqrt().domain([1, Math.max(2, maxCount)]).range([CFG.R_MIN, CFG.R_MAX]).clamp(true);

  function radiusFor(count) {
    var t = maxCount > 1 ? (count - 1) / (maxCount - 1) : 1;
    return CFG.R_FAR - (CFG.R_FAR - CFG.R_NEAR) * Math.sqrt(t);
  }

  // Her oyuncunun birlikte oynadığımız ilk/son video tarihi.
  players.forEach(function (p) {
    var ds = p.videos
      .map(function (id) { return (videoById[id] && videoById[id].date) || ""; })
      .filter(Boolean).sort();
    p.lastDate = ds.length ? ds[ds.length - 1] : "";
    p.firstDate = ds.length ? ds[0] : "";
  });

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

  // Aynı video sayısına sahip oyuncular arasında sıralamayı tarih belirler:
  // en son birlikte oynadığım merkeze daha yakın durur. Kaydırma, bir üst
  // basamağa kadar olan boşluğun bir kısmıyla sınırlı — yani 3 videolu biri
  // hiçbir zaman 4 videolu birinden içeride kalmaz.
  var TIE_SHARE = 0.45;
  (function () {
    var groups = {};
    players.forEach(function (p) {
      (groups[p.count] = groups[p.count] || []).push(p);
    });
    Object.keys(groups).forEach(function (key) {
      var g = groups[key], c = +key;
      g.sort(function (a, b) {
        return String(b.lastDate).localeCompare(String(a.lastDate)) ||
               String(b.firstDate).localeCompare(String(a.firstDate)) ||
               a.name.localeCompare(b.name, "tr");
      });
      var base = radiusFor(c);
      var share = Math.max(0, base - radiusFor(c + 1)) * TIE_SHARE;
      g.forEach(function (p, i) {
        p.recencyRank = i;                                  // 0 = en yeni
        var f = g.length > 1 ? 1 - i / (g.length - 1) : 0;  // 1 = en yeni, 0 = en eski
        p.home = base - share * f;
      });
    });
  })();

  // klanlara üye sayısıyla orantılı yay payı ver
  var total = players.length || 1, acc = 0;
  clanList.forEach(function (c) {
    var span = (c.count / total) * Math.PI * 2;
    c.a0 = acc; c.a1 = acc + span; c.angle = acc + span / 2 - Math.PI / 2;
    acc += span;
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

  // düğüm konumlarını klan yayı içine yay
  var perClanIndex = {};
  players.forEach(function (p) {
    var c = clanByTag[p.clan];
    var i = perClanIndex[p.clan] = (perClanIndex[p.clan] || 0);
    perClanIndex[p.clan]++;
    var span = Math.max(0.12, (c.a1 - c.a0) * 0.86);
    var frac = c.count > 1 ? (i / (c.count - 1) - 0.5) : 0;
    p.r = rScale(p.count);
    p.color = c.color;
    p.clanName = c.name;
    p.angle = c.angle + frac * span;
    p.tx = Math.cos(p.angle) * p.home;
    p.ty = Math.sin(p.angle) * p.home;
    p.x = p.tx; p.y = p.ty;
    p.search = [norm(p.name), norm(c.name), norm(c.tag)]
      .concat(p.aliases.map(norm))
      .concat(p.formerClans.map(function (t) {
        var fc = clanByTag[t];
        return fc ? norm(fc.name) + " " + norm(fc.tag) : norm(t);
      })).join(" ");
  });

  var nodes = [center].concat(players);
  var links = players.map(function (p) { return { source: center, target: p }; });

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
  var gLinks = root.append("g").attr("class", "links");
  var gNodes = root.append("g").attr("class", "nodes");

  // merkezden dışa doğru yoğunluk halkaları
  var ringCounts = (function () {
    var all = Array.from(new Set(players.map(function (p) { return p.count; })))
      .sort(function (a, b) { return radiusFor(a) - radiusFor(b); });
    var keep = [], last = -1e9;
    all.forEach(function (c) {
      var r = radiusFor(c);
      if (r - last >= 48) { keep.push(c); last = r; }
    });
    if (all.length && keep.indexOf(all[all.length - 1]) === -1) keep.push(all[all.length - 1]);
    return keep;
  })();
  gRings.selectAll("circle").data(ringCounts).join("circle")
    .attr("r", function (c) { return radiusFor(c); })
    .attr("fill", "none")
    .attr("stroke", "#ffffff")
    .attr("stroke-opacity", 0.045)
    .attr("stroke-dasharray", "2 6");
  gRings.selectAll("text").data(ringCounts).join("text")
    .attr("x", 0).attr("y", function (c) { return -radiusFor(c) - 6; })
    .attr("text-anchor", "middle")
    .attr("fill", "#ffffff").attr("fill-opacity", 0.22)
    .attr("font-size", 9).attr("letter-spacing", 0.5)
    .text(function (c) { return c + " video"; });

  var link = gLinks.selectAll("line").data(links).join("line").attr("class", "link");

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
    .attr("stroke", function (d) { return d.isCenter ? "#fff" : "rgba(0,0,0,.45)"; })
    .attr("stroke-width", function (d) { return d.isCenter ? 3 : 1.5; })
    .attr("filter", function (d) { return d.isCenter ? "url(#glow)" : null; });

  node.append("text")
    .attr("text-anchor", "middle")
    .attr("x", 0)
    .attr("y", function (d) { return d.r + 13; })
    .text(function (d) { return d.name; });

  // ------------------------------------------------------------- simülasyon
  function homingForce(alpha) {
    var k = 0.075 * alpha;
    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      p.vx += (p.tx - p.x) * k;
      p.vy += (p.ty - p.y) * k;
    }
  }

  var ALPHA_DECAY = 0.022;
  var SETTLE_TICKS = Math.ceil(Math.log(0.001) / Math.log(1 - ALPHA_DECAY));

  // Simülasyon ekranda dönmez: yerleşim bir kerede hesaplanır, sonra dondurulur.
  var sim = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(function (d) { return d.id; })
      .distance(function (d) { return d.target.home; }).strength(0.05))
    .force("charge", d3.forceManyBody().strength(function (d) { return d.isCenter ? -900 : -55; }))
    .force("collide", d3.forceCollide(function (d) { return d.r + (d.isCenter ? 16 : 4); }).strength(1).iterations(2))
    .force("home", homingForce)
    .alphaDecay(ALPHA_DECAY)
    .stop();

  // Bir düğümü, açısını koruyarak tam olarak kendi yarıçapına oturtur.
  // Merkeze uzaklık = "kaç video + ne kadar yakın tarihte" sıralamasıdır;
  // bu yüzden yarıçap pazarlık konusu değil, çarpışma sadece açıyı değiştirebilir.
  function project(p) {
    var a = Math.atan2(p.y, p.x);
    if (!isFinite(a)) a = p.angle;
    p.x = Math.cos(a) * p.home;
    p.y = Math.sin(a) * p.home;
  }

  // Üst üste binen baloncukları yalnızca açısal olarak ayırır.
  function spreadAngular(iters) {
    for (var it = 0; it < iters; it++) {
      var moved = false;
      for (var i = 0; i < players.length; i++) {
        var a = players[i];
        for (var j = i + 1; j < players.length; j++) {
          var b = players[j];
          var dx = b.x - a.x, dy = b.y - a.y;
          var d = Math.sqrt(dx * dx + dy * dy);
          var min = a.r + b.r + 3;
          if (d >= min) continue;
          if (d < 0.01) { dx = Math.cos(a.angle) * 0.01; dy = Math.sin(a.angle) * 0.01; d = 0.01; }
          var push = ((min - d) / d) * 0.5;
          a.x -= dx * push; a.y -= dy * push;
          b.x += dx * push; b.y += dy * push;
          moved = true;
        }
      }
      for (var k = 0; k < players.length; k++) project(players[k]);
      if (!moved) break;
    }
  }

  // Yerleşimi bir kere hesapla ve her baloncuğu yerine çivile.
  // Bu fonksiyon sayfa ömrü boyunca yalnızca bir kez çalışır.
  function layout() {
    players.forEach(function (p) {
      p.x = p.tx; p.y = p.ty; p.vx = 0; p.vy = 0; p.fx = null; p.fy = null;
    });
    center.x = 0; center.y = 0; center.fx = 0; center.fy = 0;
    sim.alpha(1);
    for (var i = 0; i < SETTLE_TICKS; i++) sim.tick();
    sim.stop();
    // Simülasyon açıları ve kümeleri belirledi; şimdi yarıçapları tam
    // sıralamaya oturtup kalan çakışmaları açıdan çözüyoruz.
    players.forEach(project);
    spreadAngular(60);
    nodes.forEach(function (n) { n.fx = n.x; n.fy = n.y; });  // artık kıpırdamazlar
    draw();
  }

  function draw() {
    link
      .attr("x1", function (d) { return d.source.x; })
      .attr("y1", function (d) { return d.source.y; })
      .attr("x2", function (d) { return d.target.x; })
      .attr("y2", function (d) { return d.target.y; });
    node.attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });
  }

  // -------------------------------------------------------------- zoom & fit
  var userMoved = false;
  var zoom = d3.zoom().scaleExtent([0.12, 6]).on("zoom", function (ev) {
    if (ev.sourceEvent) userMoved = true;
    root.attr("transform", ev.transform);
    gNodes.selectAll("text").attr("opacity", ev.transform.k < 0.32 ? 0 : 1);
  });
  svg.call(zoom).on("dblclick.zoom", null);

  function resize() {
    W = stage.clientWidth; H = stage.clientHeight;
    svg.attr("viewBox", [-W / 2, -H / 2, W, H].join(" "));
  }
  function extentRadius() {
    var m = 0;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var d = Math.sqrt(n.x * n.x + n.y * n.y) + n.r + 14;
      if (d > m) m = d;
    }
    return m || CFG.R_FAR;
  }
  function fit(animate, useExtent) {
    resize();
    var R = useExtent ? extentRadius() : CFG.R_FAR + 40;
    var pad = 34;
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

  function isVisible(d) { return d.isCenter || !state.hidden[d.clan]; }
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
  function labelBox(ox, oy, w, anchor) {
    if (anchor === "start") return [ox - 2, oy - 11, ox + w, oy + 3];
    if (anchor === "end") return [ox - w, oy - 11, ox + 2, oy + 3];
    return [ox - w / 2, oy - 11, ox + w / 2, oy + 3];
  }

  function applyLabelRule() {
    var show = {}, taken = [];

    // Baloncukların kendisi de doludur: etiket hiçbirinin üstüne binmesin.
    nodes.forEach(function (n) {
      if (!isVisible(n)) return;
      taken.push([n.x - n.r, n.y - n.r, n.x + n.r, n.y + n.r]);
    });

    var order = players.slice().sort(function (a, b) {
      return b.count - a.count || b.r - a.r || a.name.localeCompare(b.name, "tr");
    });
    order.forEach(function (p) {
      if (!isVisible(p)) return;
      var must = state.selected === p.id || state.hover === p.id ||
                 (state.query && matches(p));
      if (!must && !state.allLabels && p.r < CFG.LABEL_MIN_R) return;
      if (!must && !matches(p)) return;

      var w = p.name.length * 5.9 + 8;
      var cands = [
        { x: 0, y: p.r + 13, a: "middle" },
        { x: 0, y: -p.r - 7, a: "middle" },
        { x: p.r + 7, y: 4, a: "start" },
        { x: -p.r - 7, y: 4, a: "end" }
      ];
      var chosen = null;
      for (var i = 0; i < cands.length; i++) {
        var c = cands[i];
        var box = labelBox(p.x + c.x, p.y + c.y, w, c.a);
        var clash = false;
        for (var j = 0; j < taken.length; j++) {
          if (overlaps(box, taken[j])) { clash = true; break; }
        }
        if (!clash) { chosen = c; taken.push(box); break; }
      }
      if (!chosen) {
        if (!must) return;                       // yer yoksa gizle
        chosen = cands[0];                       // seçili/aranan isim her hâlükârda görünsün
        taken.push(labelBox(p.x + chosen.x, p.y + chosen.y, w, chosen.a));
      }
      p.lx = chosen.x; p.ly = chosen.y; p.la = chosen.a;
      show[p.id] = 1;
    });

    gNodes.selectAll("g.node").select("text")
      .attr("x", function (d) { return d.isCenter ? 0 : (d.lx || 0); })
      .attr("y", function (d) { return d.isCenter ? d.r + 13 : (d.ly == null ? d.r + 13 : d.ly); })
      .attr("text-anchor", function (d) { return d.isCenter ? "middle" : (d.la || "middle"); });

    gNodes.selectAll("g.node").select("text").classed("hide-label", function (d) {
      return d.isCenter ? false : !show[d.id];
    });
  }

  function render() {
    node
      .style("display", function (d) { return isVisible(d) ? null : "none"; })
      .classed("faded", function (d) {
        if (d.isCenter) return false;
        if (!matches(d)) return true;
        if (state.query) return false;   // arama varken seçim soldurmasın
        return !!(state.selected && state.selected !== d.id && !isNeighbourOfSelected(d));
      });
    link
      .style("display", function (d) { return isVisible(d.target) ? null : "none"; })
      .attr("stroke-opacity", function (d) {
        if (state.selected === d.target.id) return .55;
        if (!matches(d.target)) return .03;
        return .10;
      })
      .attr("stroke", function (d) { return state.selected === d.target.id ? d.target.color : "#fff"; });
    applyLabelRule();
    renderLegend();
  }

  function isNeighbourOfSelected(d) {
    var sel = nodes.find(function (n) { return n.id === state.selected; });
    if (!sel || sel.isCenter) return true;
    return d.clan === sel.clan;
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
    var vids = d.videos.map(function (id) { return videoById[id]; })
      .sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
    var mates = players.filter(function (p) { return p.clan === d.clan && p.id !== d.id; })
      .sort(function (a, b) { return b.count - a.count; });
    var share = Math.round(d.count / ((DATA.videos || []).length || 1) * 100);

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
      "<div class='p-stat'><b>" + (mates.length + 1) + "</b><span>Klan üyesi</span></div>" +
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

    if (mates.length) {
      h += "<div class='p-sec'>Aynı klandan</div><div class='chips'>" +
        mates.map(function (m) {
          return "<span class='chip' data-go='" + m.id + "'>" + esc(m.name) + " <span style='opacity:.55'>" + m.count + "</span></span>";
        }).join("") + "</div>";
    }
    return h;
  }

  function centerPanel() {
    var top = players.slice().sort(function (a, b) { return b.count - a.count || a.name.localeCompare(b.name, "tr"); }).slice(0, 8);
    var recent = (DATA.videos || []).slice().sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); }).slice(0, 5);
    var h = "<h2 class='p-name'>" + esc(center.name) + "</h2>" +
      "<span class='p-clan' style='background:" + center.color + "22;color:" + center.color + "'>" + esc(center.subtitle || "Merkez") + "</span>";
    if (center.channel) h += "<a class='p-link' href='" + esc(center.channel) + "' target='_blank' rel='noopener'>YouTube kanalım →</a>";
    h += "<div class='p-stats'>" +
      "<div class='p-stat'><b>" + players.length + "</b><span>Oyuncu</span></div>" +
      "<div class='p-stat'><b>" + (DATA.videos || []).length + "</b><span>Video</span></div>" +
      "<div class='p-stat'><b>" + clanList.length + "</b><span>Klan</span></div>" +
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
  var legendList = document.getElementById("legend-list");
  function renderLegend() {
    legendList.innerHTML = clanList.map(function (c) {
      return "<div class='legend-item" + (state.hidden[c.tag] ? " off" : "") + "' data-clan='" + esc(c.tag) + "'>" +
        "<span class='swatch' style='background:" + c.color + "'></span>" +
        "<span class='lname'>" + esc(c.name) + "</span>" +
        "<span class='lcount'>" + c.count + "</span></div>";
    }).join("");
    legendList.querySelectorAll("[data-clan]").forEach(function (el) {
      el.onclick = function () {
        var t = el.getAttribute("data-clan");
        state.hidden[t] = !state.hidden[t];
        render();
      };
    });
  }
  document.getElementById("legend-all").onclick = function () { state.hidden = {}; render(); };

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

  // -------------------------------------------------------------------- alt bar
  document.getElementById("stats").innerHTML =
    "<span><b>" + players.length + "</b> oyuncu</span>" +
    "<span><b>" + (DATA.videos || []).length + "</b> video</span>" +
    "<span><b>" + clanList.length + "</b> klan</span>" +
    "<span><b>" + players.reduce(function (a, p) { return a + p.count; }, 0) + "</b> katılım</span>";

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
