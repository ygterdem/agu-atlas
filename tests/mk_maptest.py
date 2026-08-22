# -*- coding: utf-8 -*-
import io, os, json
ROOT = r"C:\Users\Cenk_\Desktop\AI Projects\agu-atlas"
s = io.open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()

data = {
    "center": {"name": "Aghustos", "subtitle": "t", "color": "#ffd166", "channel": ""},
    "clans": [
        {"tag": "IMBZ", "name": "IMBZ", "color": "#ff5c8a"},
        {"tag": "K2", "name": "K2", "color": "#5cc8ff"},
        {"tag": "TPS", "name": "The Perfect Squad", "color": "#8bd450"},
    ],
    "videos": [
        {"id": "v1", "title": "Eski video 1", "url": "#", "date": "2022-03-01", "game": "WT"},
        {"id": "v2", "title": "Eski video 2", "url": "#", "date": "2023-05-01", "game": "WT"},
        {"id": "v3", "title": "Yeni video 1", "url": "#", "date": "2024-07-01", "game": "WT"},
        {"id": "v4", "title": "Yeni video 2", "url": "#", "date": "2025-09-01", "game": "WT"},
        {"id": "v5", "title": "Baska", "url": "#", "date": "2025-10-01", "game": "WT"},
    ],
    "players": [
        {"name": "GEZGIN", "clan": "K2", "videos": ["v1", "v2", "v3", "v4"],
         "clanAt": {"v1": "IMBZ", "v2": "IMBZ"}},
        {"name": "SABIT", "clan": "TPS", "videos": ["v3", "v4"]},
        {"name": "TEKLI", "clan": "", "videos": ["v5"]},
    ],
}

inj = (u'<script>window.ATLAS_DATA=' + json.dumps(data, ensure_ascii=False) +
       u';</script>\n<script src="assets/atlas.js"></script>')
s = s.replace(u'<script src="data/atlas-data.js"></script>\n<script src="assets/atlas.js"></script>',
              u'<script src="data/atlas-data.js"></script>\n' + inj, 1)

TEST = u'''<script>
setTimeout(function(){
 var log=[]; function t(n,c){log.push((c?"PASS":"FAIL")+" "+n);}
 function nodeFor(name){return [].slice.call(document.querySelectorAll("g.node")).filter(function(n){
   var x=n.querySelector("text"); return x && x.textContent===name;})[0];}
 try{
  var g=nodeFor("GEZGIN");
  t("gezgin baloncugu var", !!g);

  // rengi SU ANKI klanindan (K2 = #5cc8ff)
  var fill=g.querySelector("circle.bub").getAttribute("fill");
  t("baloncuk su anki klan rengiyle", fill.toLowerCase()==="#5cc8ff");

  // panel
  g.dispatchEvent(new MouseEvent("click",{bubbles:true}));
  var body=document.getElementById("panel-body");
  var txt=body.textContent;
  t("klan gecmisi basligi var", txt.indexOf("Klan ge\\u00e7mi\\u015fi")>=0);
  t("eski klan gecmiste", txt.indexOf("IMBZ")>=0);
  t("su anki klan gecmiste", txt.indexOf("K2")>=0);
  t("eski donem 2 video", txt.indexOf("2 video")>=0);
  t("yil araligi gosteriliyor", /2022.{0,3}2023/.test(txt));
  t("video satirinda o donemki klan", body.innerHTML.indexOf("Eski video 1")>=0 && txt.indexOf("IMBZ")>=0);

  // klani hic degismeyende gecmis bolumu olmasin
  var sab=nodeFor("SABIT");
  sab.dispatchEvent(new MouseEvent("click",{bubbles:true}));
  t("tek klanlida gecmis bolumu yok",
    document.getElementById("panel-body").textContent.indexOf("Klan ge\\u00e7mi\\u015fi")<0);

  // eski klan adiyla arama
  var s=document.getElementById("search");
  s.value="IMBZ"; s.dispatchEvent(new Event("input",{bubbles:true}));
  t("eski klanla arama gezgini buluyor", !g.classList.contains("faded"));
  t("eski klanla arama digerini eliyor", sab.classList.contains("faded"));
  s.value=""; s.dispatchEvent(new Event("input",{bubbles:true}));

  // klan listesinde su anki klanlara gore sayilir
  var legend=document.getElementById("legend-list").textContent;
  t("legend K2 iceriyor", legend.indexOf("K2")>=0);
 }catch(e){log.push("FAIL exception: "+e.message);}
 document.title="TESTS "+log.join(" | ");
},2600);
</script>
</body>'''
s = s.replace(u"</body>", TEST, 1)
io.open(os.path.join(ROOT, "_maptest.html"), "w", encoding="utf-8", newline="\n").write(s)
print("ok")
