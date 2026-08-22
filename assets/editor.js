/* =========================================================================
   Atlas Düzenleyici — data/atlas-data.js dosyasını elle yazmadan üretir.
   Her şey tarayıcıda çalışır; sunucu yok. Taslak localStorage'da tutulur.
   ========================================================================= */
(function () {
  "use strict";

  var LS = "aghustos-atlas-taslak-v1";
  var PALETTE = ["#ffd166", "#ff5c8a", "#5cc8ff", "#8bd450", "#b18cff",
                 "#ff9f45", "#4ecdc4", "#e05be0", "#7ea6ff", "#d4b483"];
  var M = null;             // model
  var selVideo = null;      // kadro ekranında seçili video id
  var acIndex = -1;         // autocomplete'te seçili satır
  var NL = String.fromCharCode(10);   // confirm() metinlerinde satır sonu

  // ------------------------------------------------------------ yardımcılar
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function norm(s) {
    return String(s || "").toLocaleLowerCase("tr")
      .replace(/ı/g, "i").replace(/İ/g, "i").replace(/ş/g, "s")
      .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").trim();
  }
  function fmtDate(d) {
    if (!d) return "";
    var p = String(d).split("-");
    if (p.length < 3) return d;
    var a = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
    return (+p[2]) + " " + (a[(+p[1]) - 1] || "") + " " + p[0];
  }
  function ytId(url) {
    var m = String(url || "").match(/(?:youtu\.be\/|v=|\/shorts\/|\/live\/|\/embed\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : "";
  }
  var toastT;
  function toast(msg, kind) {
    var t = $("toast");
    t.textContent = msg;
    t.className = "toast show " + (kind || "");
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.className = "toast " + (kind || ""); }, 2600);
  }

  // ------------------------------------------------------------------ model
  function blank() {
    return {
      center: { name: "Aghustos", subtitle: "Youtube Atlas'ı", color: "#ffd166", channel: "" },
      clans: [], videos: [], players: []
    };
  }
  function normalize(d) {
    d = d || {};
    var m = blank();
    if (d.center) {
      m.center.name = d.center.name || m.center.name;
      m.center.subtitle = d.center.subtitle || "";
      m.center.color = d.center.color || "#ffd166";
      m.center.channel = d.center.channel || "";
    }
    m.clans = (d.clans || []).map(function (c, i) {
      return { tag: String(c.tag || ""), name: c.name || c.tag || "", color: c.color || PALETTE[i % PALETTE.length] };
    });
    m.videos = (d.videos || []).map(function (v) {
      return { id: String(v.id || ""), title: v.title || "", url: v.url || "", date: v.date || "", game: v.game || "" };
    });
    m.players = (d.players || []).map(function (p) {
      return {
        name: p.name || "", clan: String(p.clan || ""),
        aliases: (p.aliases || []).map(function (a) { return String(a).trim(); }).filter(Boolean),
        videos: (p.videos || []).map(String),
        link: p.link || "", note: p.note || ""
      };
    });
    return m;
  }
  function persist() {
    try { localStorage.setItem(LS, JSON.stringify(M)); } catch (e) { /* kota dolu olabilir */ }
    mark(true);
  }
  function mark(d) {
    $("sv-dot").className = "dot" + (d ? " dirty" : "");
    $("sv-text").innerHTML = d
      ? "Taslak kaydedildi — siteye yansıması için <b>indirip push et</b>"
      : "Hazır";
  }

  function clanByTag(t) {
    for (var i = 0; i < M.clans.length; i++) if (M.clans[i].tag === t) return M.clans[i];
    return null;
  }
  function clanColor(t) { var c = clanByTag(t); return c ? c.color : "#7d87ad"; }
  function clanName(t) { var c = clanByTag(t); return c ? c.name : "Bağımsız"; }
  function videoById(id) {
    for (var i = 0; i < M.videos.length; i++) if (M.videos[i].id === id) return M.videos[i];
    return null;
  }
  // Bir ismi ya da eski adı verilen oyuncuyu bulur.
  function playerByName(n) {
    var k = norm(n);
    if (!k) return null;
    var i, j;
    for (i = 0; i < M.players.length; i++) if (norm(M.players[i].name) === k) return M.players[i];
    for (i = 0; i < M.players.length; i++) {
      var al = M.players[i].aliases || [];
      for (j = 0; j < al.length; j++) if (norm(al[j]) === k) return M.players[i];
    }
    return null;
  }
  // Girilen ad, oyuncunun asıl adı mı yoksa eski adlarından biri mi?
  function matchedAlias(p, n) {
    var k = norm(n);
    if (norm(p.name) === k) return null;
    var al = p.aliases || [];
    for (var i = 0; i < al.length; i++) if (norm(al[i]) === k) return al[i];
    return null;
  }
  function parseAliases(str, self) {
    var seen = {}, out = [];
    String(str || "").split(",").forEach(function (a) {
      a = a.trim();
      if (!a) return;
      var k = norm(a);
      if (self && k === norm(self)) return;      // kendi adını diğer ad olarak tutma
      if (seen[k]) return;
      seen[k] = 1; out.push(a);
    });
    return out;
  }
  function inVideo(p, vid) { return p.videos.indexOf(vid) !== -1; }
  function squadOf(vid) { return M.players.filter(function (p) { return inVideo(p, vid); }); }

  function newVideoId(url) {
    var base = ytId(url);
    if (!base) {
      var n = 1;
      while (videoById("v" + n)) n++;
      base = "v" + n;
    }
    if (videoById(base)) {
      var i = 2, c = base + "-" + i;
      while (videoById(c)) { i++; c = base + "-" + i; }
      base = c;
    }
    return base;
  }

  // ------------------------------------------------------------- sekmeler
  function showTab(name) {
    ["roster", "videos", "players", "clans", "settings", "export"].forEach(function (t) {
      $("tab-" + t).hidden = (t !== name);
    });
    document.querySelectorAll(".tab").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-tab") === name);
    });
    if (name === "export") renderExport();
  }
  document.querySelectorAll(".tab").forEach(function (b) {
    b.onclick = function () { showTab(b.getAttribute("data-tab")); };
  });

  // ================================================================ KADRO
  function renderVideoList() {
    var box = $("r-videolist");
    if (!M.videos.length) {
      box.innerHTML = "<div class='empty'>Henüz video yok.<br>Yukarıdaki <b>+ Yeni video</b> ile başla.</div>";
      return;
    }
    var vids = M.videos.slice().sort(function (a, b) {
      return String(b.date || "").localeCompare(String(a.date || ""));
    });
    box.innerHTML = vids.map(function (v) {
      var n = squadOf(v.id).length;
      return "<div class='list-item" + (v.id === selVideo ? " on" : "") + "' data-v='" + esc(v.id) + "'>" +
        "<div class='li-main'>" +
        "<div class='li-title'>" + esc(v.title || "(başlıksız)") + "</div>" +
        "<div class='li-sub'>" + [esc(v.game || ""), fmtDate(v.date)].filter(Boolean).join(" · ") + "</div>" +
        "</div><span class='li-count'>" + n + " kişi</span></div>";
    }).join("");
    box.querySelectorAll("[data-v]").forEach(function (el) {
      el.onclick = function () { selVideo = el.getAttribute("data-v"); renderRoster(); };
    });
  }

  function renderRoster() {
    renderVideoList();
    var box = $("r-detail");
    if (!selVideo || !videoById(selVideo)) {
      selVideo = M.videos.length ? M.videos[0].id : null;
      if (!selVideo) {
        box.innerHTML = "<div class='empty'>Önce bir video ekle, sonra kadrosunu buradan girersin.</div>";
        return;
      }
      renderVideoList();
    }
    var v = videoById(selVideo);
    box.innerHTML =
      "<div style='margin-bottom:14px'>" +
        "<div style='font-size:17px;font-weight:700;margin-bottom:3px'>" + esc(v.title || "(başlıksız)") + "</div>" +
        "<div style='font-size:12px;color:var(--ink-dim)'>" +
          [esc(v.game || ""), fmtDate(v.date), "<code style='opacity:.7'>" + esc(v.id) + "</code>"]
            .filter(Boolean).join(" · ") +
        "</div>" +
      "</div>" +
      "<div class='sec-label'>Bu videoda oynayanlar</div>" +
      "<div class='squad' id='r-squad'></div>" +
      "<div class='ac-wrap' style='margin-top:12px'>" +
        "<input type='text' id='r-input' placeholder='İsim yaz, Enter'a bas…' autocomplete='off' spellcheck='false'>" +
        "<div class='ac' id='r-ac' hidden></div>" +
      "</div>" +
      "<div class='sec-label'>Hızlı ekle</div>" +
      "<div class='squad' id='r-quick'></div>";

    renderSquad();
    wireAutocomplete();
    var inp = $("r-input");
    if (inp) inp.focus();
  }

  function renderSquad() {
    var squad = squadOf(selVideo).sort(function (a, b) { return a.name.localeCompare(b.name, "tr"); });
    $("r-squad").innerHTML = squad.length
      ? squad.map(function (p) {
          var al = (p.aliases || []).length
            ? " title='Diğer adları: " + esc(p.aliases.join(", ")) + "'" : "";
          return "<span class='pchip'" + al + "><span class='swatch' style='background:" +
            clanColor(p.clan) + "'></span>" + esc(p.name) +
            ((p.aliases || []).length ? "<span style='color:var(--ink-dim);font-size:11px'>+" +
              p.aliases.length + "</span>" : "") +
            "<button data-rm='" + esc(p.name) + "' title='Kadrodan çıkar'>×</button></span>";
        }).join("")
      : "<span style='font-size:12.5px;color:var(--ink-dim);align-self:center'>Henüz kimse yok.</span>";

    $("r-squad").querySelectorAll("[data-rm]").forEach(function (b) {
      b.onclick = function () {
        var p = playerByName(b.getAttribute("data-rm"));
        if (!p) return;
        p.videos = p.videos.filter(function (x) { return x !== selVideo; });
        persist(); renderAll();
      };
    });

    var others = M.players.filter(function (p) { return !inVideo(p, selVideo); })
      .sort(function (a, b) { return b.videos.length - a.videos.length || a.name.localeCompare(b.name, "tr"); })
      .slice(0, 24);
    $("r-quick").innerHTML = others.length
      ? others.map(function (p) {
          return "<button class='addchip' data-add='" + esc(p.name) + "'>" +
            "<span class='swatch' style='background:" + clanColor(p.clan) + "'></span>+ " + esc(p.name) + "</button>";
        }).join("")
      : "<span style='font-size:12.5px;color:var(--ink-dim);align-self:center'>Eklenecek başka oyuncu yok.</span>";
    $("r-quick").querySelectorAll("[data-add]").forEach(function (b) {
      b.onclick = function () { addToSquad(b.getAttribute("data-add")); };
    });
  }

  function addToSquad(name) {
    name = String(name || "").trim();
    if (!name) return;
    var p = playerByName(name);
    if (!p) {
      p = { name: name, clan: "", aliases: [], videos: [], link: "", note: "" };
      M.players.push(p);
      toast("“" + name + "” oluşturuldu", "good");
    } else {
      var via = matchedAlias(p, name);
      if (via) toast("“" + via + "” = " + p.name + " olarak eklendi", "good");
    }
    if (!inVideo(p, selVideo)) p.videos.push(selVideo);
    persist(); renderAll();
  }

  function wireAutocomplete() {
    var inp = $("r-input"), ac = $("r-ac");
    if (!inp) return;
    function options() {
      var q = norm(inp.value);
      if (!q) return [];
      return M.players.filter(function (p) {
        if (inVideo(p, selVideo)) return false;
        if (norm(p.name).indexOf(q) !== -1) return true;
        return (p.aliases || []).some(function (a) { return norm(a).indexOf(q) !== -1; });
      }).slice(0, 8);
    }
    function draw() {
      var opts = options(), q = inp.value.trim();
      var exact = !!playerByName(q);
      var qn = norm(inp.value);
      var html = opts.map(function (p, i) {
        var hit = (p.aliases || []).filter(function (a) { return norm(a).indexOf(qn) !== -1; })[0];
        var via = (norm(p.name).indexOf(qn) === -1 && hit)
          ? "<span style='color:var(--ink-dim);font-size:11.5px'>← " + esc(hit) + "</span>" : "";
        return "<div data-i='" + i + "'" + (i === acIndex ? " class='sel'" : "") + ">" +
          "<span class='swatch' style='display:inline-block;width:9px;height:9px;border-radius:50%;background:" +
          clanColor(p.clan) + "'></span>" + esc(p.name) + " " + via +
          "<span style='margin-left:auto;color:var(--ink-dim);font-size:11.5px'>" + p.videos.length + " video</span></div>";
      }).join("");
      if (q && !exact) {
        html += "<div class='new' data-new='1'" + (acIndex === opts.length ? " class='sel'" : "") + ">" +
          "+ “" + esc(q) + "” adında yeni oyuncu oluştur</div>";
      }
      ac.innerHTML = html;
      ac.hidden = !html;
      ac.querySelectorAll("[data-i]").forEach(function (el) {
        el.onclick = function () { addToSquad(opts[+el.getAttribute("data-i")].name); };
      });
      var nu = ac.querySelector("[data-new]");
      if (nu) nu.onclick = function () { addToSquad(inp.value.trim()); };
    }
    inp.oninput = function () { acIndex = -1; draw(); };
    inp.onkeydown = function (e) {
      var opts = options(), max = opts.length + (inp.value.trim() && !playerByName(inp.value.trim()) ? 1 : 0);
      if (e.key === "ArrowDown") { e.preventDefault(); acIndex = Math.min(acIndex + 1, max - 1); draw(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); acIndex = Math.max(acIndex - 1, -1); draw(); }
      else if (e.key === "Escape") { ac.hidden = true; acIndex = -1; }
      else if (e.key === "Enter") {
        e.preventDefault();
        var name = (acIndex >= 0 && acIndex < opts.length) ? opts[acIndex].name : inp.value.trim();
        if (name) { acIndex = -1; addToSquad(name); }
      }
    };
    inp.onblur = function () { setTimeout(function () { ac.hidden = true; }, 160); };
  }

  $("r-newvideo").onclick = function () { showTab("videos"); $("v-url").focus(); };

  // =============================================================== VIDEOLAR
  function addVideoFromForm() {
    var url = $("v-url").value.trim(), title = $("v-title").value.trim();
    if (!url && !title) { toast("Link veya başlık gerekli", "bad"); return; }
    var id = newVideoId(url);
    M.videos.push({
      id: id, title: title || "(başlıksız)", url: url,
      date: $("v-date").value || "", game: $("v-game").value.trim() || ""
    });
    persist();
    $("v-url").value = ""; $("v-title").value = "";
    selVideo = id;
    renderAll();
    toast("Video eklendi — şimdi kadrosunu gir", "good");
    showTab("roster");
  }
  $("v-add").onclick = addVideoFromForm;
  $("v-url").addEventListener("keydown", function (e) { if (e.key === "Enter") lookupTitle(true); });
  $("v-url").addEventListener("paste", function () { setTimeout(function () { lookupTitle(false); }, 40); });

  function lookupTitle(thenAdd) {
    var url = $("v-url").value.trim();
    if (!url) return;
    if ($("v-title").value.trim()) { if (thenAdd) addVideoFromForm(); return; }
    fetch("https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent(url))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.title && !$("v-title").value.trim()) $("v-title").value = d.title;
      })
      .catch(function () { /* olmadıysa elle yazar */ })
      .then(function () { if (thenAdd) addVideoFromForm(); });
  }

  function renderVideos() {
    var box = $("v-table");
    if (!M.videos.length) { box.innerHTML = "<div class='empty'>Henüz video yok.</div>"; return; }
    var vids = M.videos.slice().sort(function (a, b) {
      return String(b.date || "").localeCompare(String(a.date || ""));
    });
    box.innerHTML = "<table class='t'><thead><tr>" +
      "<th style='min-width:220px'>Başlık</th><th style='min-width:120px'>Oyun</th>" +
      "<th style='min-width:140px'>Tarih</th><th style='min-width:200px'>Link</th>" +
      "<th class='num'>Kadro</th><th></th></tr></thead><tbody>" +
      vids.map(function (v) {
        return "<tr data-id='" + esc(v.id) + "'>" +
          "<td><input type='text' data-f='title' value='" + esc(v.title) + "'></td>" +
          "<td><input type='text' data-f='game' value='" + esc(v.game) + "'></td>" +
          "<td><input type='date' data-f='date' value='" + esc(v.date) + "'></td>" +
          "<td><input type='url' data-f='url' value='" + esc(v.url) + "'></td>" +
          "<td class='num'>" + squadOf(v.id).length + "</td>" +
          "<td><button class='btn sm danger' data-del='" + esc(v.id) + "'>Sil</button></td></tr>";
      }).join("") + "</tbody></table>";

    box.querySelectorAll("tr[data-id]").forEach(function (tr) {
      var v = videoById(tr.getAttribute("data-id"));
      tr.querySelectorAll("[data-f]").forEach(function (inp) {
        inp.onchange = function () { v[inp.getAttribute("data-f")] = inp.value.trim(); persist(); renderAll(); };
      });
    });
    box.querySelectorAll("[data-del]").forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute("data-del"), v = videoById(id);
        var n = squadOf(id).length;
        if (!confirm("“" + (v.title || id) + "” silinsin mi?" +
          (n ? "\n" + n + " oyuncunun kadro kaydı da silinecek." : ""))) return;
        M.videos = M.videos.filter(function (x) { return x.id !== id; });
        M.players.forEach(function (p) {
          p.videos = p.videos.filter(function (x) { return x !== id; });
        });
        if (selVideo === id) selVideo = null;
        persist(); renderAll(); toast("Video silindi");
      };
    });
  }

  // ============================================================== OYUNCULAR
  function clanOptions(selected) {
    var orphan = selected && !clanByTag(selected);
    return "<option value=''" + (selected ? "" : " selected") + ">— Bağımsız —</option>" +
      M.clans.map(function (c) {
        return "<option value='" + esc(c.tag) + "'" + (c.tag === selected ? " selected" : "") + ">" +
          esc(c.name) + "</option>";
      }).join("") +
      (orphan ? "<option value='" + esc(selected) + "' selected>⚠ " + esc(selected) +
        " (tanımsız klan)</option>" : "");
  }
  function renderPlayerForm() { $("p-clan").innerHTML = clanOptions(""); }

  $("p-add").onclick = function () {
    var name = $("p-name").value.trim();
    if (!name) { toast("İsim gerekli", "bad"); return; }
    if (playerByName(name)) { toast("Bu isimde bir oyuncu zaten var", "bad"); return; }
    M.players.push({ name: name, clan: $("p-clan").value, aliases: [], videos: [],
                     link: $("p-link").value.trim(), note: "" });
    persist();
    $("p-name").value = ""; $("p-link").value = "";
    renderAll(); toast("Oyuncu eklendi — kadro sekmesinden videolara ekle", "good");
  };
  $("p-name").addEventListener("keydown", function (e) { if (e.key === "Enter") $("p-add").click(); });

  function renderPlayers() {
    var box = $("p-table");
    var q = norm($("p-search").value);
    var list = M.players.slice().sort(function (a, b) {
      return b.videos.length - a.videos.length || a.name.localeCompare(b.name, "tr");
    });
    if (q) list = list.filter(function (p) {
      return norm(p.name).indexOf(q) !== -1 || norm(clanName(p.clan)).indexOf(q) !== -1 ||
        (p.aliases || []).some(function (a) { return norm(a).indexOf(q) !== -1; });
    });
    if (!list.length) { box.innerHTML = "<div class='empty'>Oyuncu yok.</div>"; return; }
    box.innerHTML = "<table class='t'><thead><tr>" +
      "<th style='min-width:140px'>İsim</th><th style='min-width:170px'>Diğer adlar</th>" +
      "<th style='min-width:140px'>Klan</th>" +
      "<th style='min-width:170px'>Kanal linki</th><th style='min-width:150px'>Not</th>" +
      "<th class='num'>Video</th><th></th></tr></thead><tbody>" +
      list.map(function (p, i) {
        var idx = M.players.indexOf(p);
        return "<tr data-i='" + idx + "'>" +
          "<td><input type='text' data-f='name' value='" + esc(p.name) + "'></td>" +
          "<td><input type='text' data-f='aliases' value='" + esc((p.aliases || []).join(", ")) +
            "' placeholder='eski adı, takma adı' title='Virgülle ayır'></td>" +
          "<td><select data-f='clan'>" + clanOptions(p.clan) + "</select></td>" +
          "<td><input type='url' data-f='link' value='" + esc(p.link) + "'></td>" +
          "<td><input type='text' data-f='note' value='" + esc(p.note) + "'></td>" +
          "<td class='num'" + (p.videos.length ? "" : " style='color:#ff9d9d'") + ">" + p.videos.length + "</td>" +
          "<td><button class='btn sm danger' data-del='" + idx + "'>Sil</button></td></tr>";
      }).join("") + "</tbody></table>";

    box.querySelectorAll("tr[data-i]").forEach(function (tr) {
      var p = M.players[+tr.getAttribute("data-i")];
      tr.querySelectorAll("[data-f]").forEach(function (inp) {
        inp.onchange = function () {
          var f = inp.getAttribute("data-f"), val = inp.value.trim();
          if (f === "name") {
            if (!val) { toast("İsim boş olamaz", "bad"); renderAll(); return; }
            var other = playerByName(val);
            if (other && other !== p) { toast("Bu isim zaten kullanılıyor", "bad"); renderAll(); return; }
            var old = p.name;
            p.name = val;
            if (old && norm(old) !== norm(val) &&
                confirm("İsim değişti." + NL + NL +
                        "“" + old + "” eski ad olarak saklansın mı?" + NL +
                        "Böylece eski adıyla arattığında da bulunur ve iki ayrı baloncuk oluşmaz.")) {
              p.aliases = parseAliases((p.aliases || []).concat([old]).join(", "), val);
              toast("“" + old + "” diğer adlara eklendi", "good");
            } else {
              p.aliases = parseAliases((p.aliases || []).join(", "), val);
            }
          } else if (f === "aliases") {
            var next = parseAliases(val, p.name), clash = null;
            next.forEach(function (a) {
              var o = playerByName(a);
              if (o && o !== p) clash = a;
            });
            if (clash) {
              toast("“" + clash + "” zaten başka bir oyuncuya ait", "bad");
              renderAll(); return;
            }
            p.aliases = next;
          } else {
            p[f] = val;
          }
          persist(); renderAll();
        };
      });
    });
    box.querySelectorAll("[data-del]").forEach(function (b) {
      b.onclick = function () {
        var p = M.players[+b.getAttribute("data-del")];
        if (!confirm("“" + p.name + "” silinsin mi?")) return;
        M.players.splice(M.players.indexOf(p), 1);
        persist(); renderAll(); toast("Oyuncu silindi");
      };
    });
  }
  $("p-search").addEventListener("input", renderPlayers);

  // ================================================================= KLANLAR
  $("c-add").onclick = function () {
    var tag = $("c-tag").value.trim(), name = $("c-name").value.trim();
    if (!tag) { toast("Etiket gerekli", "bad"); return; }
    if (clanByTag(tag)) { toast("Bu etiket zaten var", "bad"); return; }
    M.clans.push({ tag: tag, name: name || tag, color: $("c-color").value });
    persist();
    $("c-tag").value = ""; $("c-name").value = "";
    $("c-color").value = PALETTE[M.clans.length % PALETTE.length];
    renderAll(); toast("Klan eklendi", "good");
  };
  $("c-name").addEventListener("keydown", function (e) { if (e.key === "Enter") $("c-add").click(); });

  function orphanTags() {
    var seen = {}, out = [];
    M.players.forEach(function (p) {
      if (p.clan && !clanByTag(p.clan) && !seen[p.clan]) {
        seen[p.clan] = 1;
        out.push({ tag: p.clan, n: M.players.filter(function (x) { return x.clan === p.clan; }).length });
      }
    });
    return out;
  }

  function renderOrphans() {
    var box = $("c-orphans");
    var orph = orphanTags();
    if (!orph.length) { box.innerHTML = ""; return; }
    box.innerHTML = "<div class='note bad'><b>Klansız kalmış etiketler var.</b> " +
      "Aşağıdaki etiketler oyuncularda kullanılmış ama böyle bir klan tanımlı değil, " +
      "bu yüzden o oyuncular haritada gri “Bağımsız” görünür. Tek tıkla düzelt:" +
      "<div style='display:flex;flex-wrap:wrap;gap:8px;margin-top:10px'>" +
      orph.map(function (o) {
        return "<button class='btn sm' data-fix='" + esc(o.tag) + "'>+ “" + esc(o.tag) +
          "” klanını oluştur (" + o.n + " oyuncu)</button>" +
          "<button class='btn sm ghost' data-clear='" + esc(o.tag) + "'>" + o.n +
          " oyuncuyu Bağımsız yap</button>";
      }).join("") + "</div></div>";

    box.querySelectorAll("[data-fix]").forEach(function (b) {
      b.onclick = function () {
        var tag = b.getAttribute("data-fix");
        M.clans.push({ tag: tag, name: tag, color: PALETTE[M.clans.length % PALETTE.length] });
        persist(); renderAll();
        toast("“" + tag + "” klanı oluşturuldu — adını ve rengini aşağıdan değiştirebilirsin", "good");
      };
    });
    box.querySelectorAll("[data-clear]").forEach(function (b) {
      b.onclick = function () {
        var tag = b.getAttribute("data-clear");
        var n = 0;
        M.players.forEach(function (p) { if (p.clan === tag) { p.clan = ""; n++; } });
        persist(); renderAll();
        toast(n + " oyuncu Bağımsız yapıldı");
      };
    });
  }

  function renderClans() {
    renderOrphans();
    var box = $("c-table");
    if (!M.clans.length) { box.innerHTML = "<div class='empty'>Henüz klan yok. Klansız oyuncular “Bağımsız” olur.</div>"; return; }
    box.innerHTML = "<table class='t'><thead><tr>" +
      "<th style='width:120px'>Etiket</th><th style='min-width:180px'>Ad</th>" +
      "<th style='width:70px'>Renk</th><th class='num'>Üye</th><th></th></tr></thead><tbody>" +
      M.clans.map(function (c, i) {
        var n = M.players.filter(function (p) { return p.clan === c.tag; }).length;
        return "<tr data-i='" + i + "'>" +
          "<td><input type='text' data-f='tag' value='" + esc(c.tag) + "'></td>" +
          "<td><input type='text' data-f='name' value='" + esc(c.name) + "'></td>" +
          "<td><input type='color' data-f='color' value='" + esc(c.color) + "'></td>" +
          "<td class='num'>" + n + "</td>" +
          "<td><button class='btn sm danger' data-del='" + i + "'>Sil</button></td></tr>";
      }).join("") + "</tbody></table>";

    box.querySelectorAll("tr[data-i]").forEach(function (tr) {
      var c = M.clans[+tr.getAttribute("data-i")];
      tr.querySelectorAll("[data-f]").forEach(function (inp) {
        inp.onchange = function () {
          var f = inp.getAttribute("data-f"), val = inp.value.trim();
          if (f === "tag") {
            if (!val) { toast("Etiket boş olamaz", "bad"); renderAll(); return; }
            var other = clanByTag(val);
            if (other && other !== c) { toast("Bu etiket zaten var", "bad"); renderAll(); return; }
            var old = c.tag, moved = 0;
            M.players.forEach(function (p) { if (p.clan === old) { p.clan = val; moved++; } });
            c.tag = val;
            if (moved) toast(moved + " oyuncu yeni etikete taşındı", "good");
          } else {
            c[f] = inp.value;
          }
          persist(); renderAll();
        };
      });
    });
    box.querySelectorAll("[data-del]").forEach(function (b) {
      b.onclick = function () {
        var c = M.clans[+b.getAttribute("data-del")];
        var n = M.players.filter(function (p) { return p.clan === c.tag; }).length;
        if (!confirm("“" + c.name + "” klanı silinsin mi?" +
          (n ? "\n" + n + " oyuncu “Bağımsız” olacak (oyuncular silinmez)." : ""))) return;
        M.players.forEach(function (p) { if (p.clan === c.tag) p.clan = ""; });
        M.clans.splice(M.clans.indexOf(c), 1);
        persist(); renderAll(); toast("Klan silindi");
      };
    });
  }

  // ================================================================ AYARLAR
  function renderSettings() {
    $("s-name").value = M.center.name;
    $("s-sub").value = M.center.subtitle;
    $("s-color").value = M.center.color || "#ffd166";
    $("s-channel").value = M.center.channel;
  }
  ["s-name", "s-sub", "s-color", "s-channel"].forEach(function (id) {
    $(id).addEventListener("change", function () {
      M.center.name = $("s-name").value.trim() || "Aghustos";
      M.center.subtitle = $("s-sub").value.trim();
      M.center.color = $("s-color").value;
      M.center.channel = $("s-channel").value.trim();
      persist();
    });
  });
  $("s-reload").onclick = function () {
    if (!confirm("Taslaktaki değişiklikler silinip yayındaki veriye dönülecek. Emin misin?")) return;
    M = normalize(window.ATLAS_DATA);
    try { localStorage.removeItem(LS); } catch (e) {}
    selVideo = null; renderAll(); mark(false); toast("Yayındaki veri yüklendi");
  };
  $("s-wipe").onclick = function () {
    if (!confirm("Her şey silinip boş bir atlas ile başlanacak. Emin misin?")) return;
    M = blank();
    persist(); selVideo = null; renderAll(); toast("Taslak sıfırlandı");
  };

  // ============================================================ KONTROL/ÇIKTI
  function issues() {
    var out = [];
    var tags = {};
    M.clans.forEach(function (c) {
      if (!c.tag) out.push("Etiketi boş bir klan var — etiket zorunlu.");
      if (tags[c.tag]) out.push("Aynı etiket iki kez kullanılmış: <b>" + esc(c.tag) + "</b>");
      tags[c.tag] = 1;
    });
    var ids = {};
    M.videos.forEach(function (v) {
      if (ids[v.id]) out.push("Aynı video id'si iki kez: <b>" + esc(v.id) + "</b>");
      ids[v.id] = 1;
      if (!v.url) out.push("<b>" + esc(v.title || v.id) + "</b> videosunun linki yok.");
    });
    var names = {};
    M.players.forEach(function (p) {
      var k = norm(p.name);
      if (names[k]) out.push("Aynı isimde iki oyuncu: <b>" + esc(p.name) + "</b>");
      names[k] = p.name;
      (p.aliases || []).forEach(function (a) {
        var ak = norm(a);
        if (names[ak] && names[ak] !== p.name) {
          out.push("<b>" + esc(a) + "</b> hem <b>" + esc(names[ak]) + "</b> hem <b>" +
            esc(p.name) + "</b> için kullanılmış — diğer adlar benzersiz olmalı.");
        }
        names[ak] = p.name;
      });
      if (p.clan && !clanByTag(p.clan)) {
        out.push("<b>" + esc(p.name) + "</b> oyuncusu <b>" + esc(p.clan) +
          "</b> klanına bağlı ama böyle bir klan yok — haritada “Bağımsız” görünür.");
      }
      p.videos.forEach(function (vid) {
        if (!videoById(vid)) out.push("<b>" + esc(p.name) + "</b> oyuncusunda olmayan video id'si: <b>" + esc(vid) + "</b>");
      });
    });
    return out;
  }
  function warnings() {
    var out = [];
    var noVideo = M.players.filter(function (p) { return !p.videos.length; });
    if (noVideo.length) {
      out.push(noVideo.length + " oyuncunun hiç videosu yok, haritada görünmezler: " +
        noVideo.slice(0, 8).map(function (p) { return esc(p.name); }).join(", ") +
        (noVideo.length > 8 ? " …" : ""));
    }
    var empty = M.videos.filter(function (v) { return !squadOf(v.id).length; });
    if (empty.length) out.push(empty.length + " videonun kadrosu boş.");
    return out;
  }

  function q(s) { return JSON.stringify(String(s == null ? "" : s)); }

  function toSource() {
    var L = [];
    L.push("/* =========================================================================");
    L.push("   AGHUSTOS'UN YOUTUBE ATLAS'I  —  VERİ DOSYASI");
    L.push("   -------------------------------------------------------------------------");
    L.push("   Bu dosya editor.html üzerinden üretildi. Elle de düzenleyebilirsin ama");
    L.push("   düzenleyiciyi kullanmak daha güvenli: klan etiketlerini ve video");
    L.push("   id'lerini kendisi tutarlı tutuyor.");
    L.push("");
    L.push("   Baloncuk boyutu ve merkeze yakınlık, oyuncunun videos listesinin");
    L.push("   uzunluğundan otomatik hesaplanır — elle sayı girilmez.");
    L.push("   ========================================================================= */");
    L.push("");
    L.push("window.ATLAS_DATA = {");
    L.push("");
    L.push("  /* ---------------- MERKEZ (sen) ---------------- */");
    L.push("  center: {");
    L.push("    name: " + q(M.center.name) + ",");
    L.push("    subtitle: " + q(M.center.subtitle) + ",");
    L.push("    color: " + q(M.center.color) + ",");
    L.push("    channel: " + q(M.center.channel));
    L.push("  },");
    L.push("");
    L.push("  /* ---------------- KLANLAR ---------------- */");
    L.push("  clans: [");
    L.push(M.clans.map(function (c) {
      return "    { tag: " + q(c.tag) + ", name: " + q(c.name) + ", color: " + q(c.color) + " }";
    }).join(",\n"));
    L.push("  ],");
    L.push("");
    L.push("  /* ---------------- VIDEOLAR ---------------- */");
    L.push("  videos: [");
    L.push(M.videos.map(function (v) {
      return "    { id: " + q(v.id) + ", title: " + q(v.title) + ", url: " + q(v.url) +
        ", date: " + q(v.date) + ", game: " + q(v.game) + " }";
    }).join(",\n"));
    L.push("  ],");
    L.push("");
    L.push("  /* ---------------- OYUNCULAR ---------------- */");
    L.push("  players: [");
    L.push(M.players.map(function (p) {
      var s = "    { name: " + q(p.name) + ", clan: " + q(p.clan) +
        ", videos: [" + p.videos.map(q).join(", ") + "]";
      if ((p.aliases || []).length) s += ", aliases: [" + p.aliases.map(q).join(", ") + "]";
      if (p.link) s += ", link: " + q(p.link);
      if (p.note) s += ", note: " + q(p.note);
      return s + " }";
    }).join(",\n"));
    L.push("  ]");
    L.push("};");
    L.push("");
    return L.join("\n");
  }

  function renderExport() {
    var bad = issues(), warn = warnings();
    var h = "";
    if (bad.length) {
      h += "<div class='note bad'><b>" + bad.length + " sorun var</b> — bunlar haritayı bozar:<ul>" +
        bad.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul></div>";
    } else {
      h += "<div class='note ok'><b>Her şey yolunda.</b> Dosyayı indirip push edebilirsin.</div>";
    }
    if (warn.length) {
      h += "<div class='note info'><b>Not</b><ul>" +
        warn.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul></div>";
    }
    $("x-issues").innerHTML = h;
    $("x-preview").textContent = toSource();
    $("b-issues").textContent = bad.length;
    document.querySelector("[data-tab='export']").classList.toggle("warn", bad.length > 0);
  }

  function download() {
    var blob = new Blob([toSource()], { type: "application/javascript;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "atlas-data.js";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    toast("İndirildi — data/atlas-data.js üzerine yaz, sonra push et", "good");
  }
  $("btn-download").onclick = function () { showTab("export"); download(); };
  $("x-download").onclick = download;
  $("x-copy").onclick = function () {
    var txt = toSource();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt)
        .then(function () { toast("Panoya kopyalandı", "good"); })
        .catch(function () { toast("Kopyalanamadı, metni elle seç", "bad"); });
    } else { toast("Tarayıcı kopyalamayı desteklemiyor", "bad"); }
  };

  // ---------------------------------------------------------------- import
  $("btn-import").onclick = function () { $("filepick").click(); };
  $("filepick").addEventListener("change", function () {
    var f = this.files && this.files[0];
    if (!f) return;
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var sandbox = {};
        new Function("window", String(fr.result))(sandbox);
        if (!sandbox.ATLAS_DATA) throw new Error("ATLAS_DATA yok");
        M = normalize(sandbox.ATLAS_DATA);
        persist(); selVideo = null; renderAll();
        toast("Dosya yüklendi", "good");
      } catch (e) {
        toast("Dosya okunamadı: " + e.message, "bad");
      }
    };
    fr.readAsText(f, "utf-8");
    this.value = "";
  });

  // ------------------------------------------------------------------ render
  function renderCounts() {
    $("b-videos").textContent = M.videos.length;
    $("b-players").textContent = M.players.length;
    $("b-clans").textContent = M.clans.length;
    var active = M.players.filter(function (p) { return p.videos.length; }).length;
    var total = M.players.reduce(function (a, p) { return a + p.videos.length; }, 0);
    $("sv-counts").innerHTML = "<b>" + active + "</b> oyuncu · <b>" + M.videos.length +
      "</b> video · <b>" + total + "</b> katılım";
  }
  function renderAll() {
    renderCounts();
    renderRoster();
    renderVideos();
    renderPlayerForm();
    renderPlayers();
    renderClans();
    renderSettings();
    renderExport();
  }

  // -------------------------------------------------------------------- init
  var draft = null;
  try { draft = JSON.parse(localStorage.getItem(LS) || "null"); } catch (e) { draft = null; }
  M = normalize(draft || window.ATLAS_DATA);
  if (M.videos.length) selVideo = M.videos[0].id;
  $("c-color").value = PALETTE[M.clans.length % PALETTE.length];
  renderAll();
  mark(!!draft);
  if (draft) toast("Kaydedilmiş taslağın yüklendi");
})();
