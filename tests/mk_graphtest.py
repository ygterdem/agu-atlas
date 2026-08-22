# -*- coding: utf-8 -*-
import io, os, json
ROOT = r"C:\Users\Cenk_\Desktop\AI Projects\agu-atlas"
s = io.open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()

vids = []
for i in range(1, 13):
    vids.append({"id": "v%d" % i, "title": "V%d" % i, "url": "#",
                 "date": "2025-%02d-01" % i, "game": "WT"})
for i in range(1, 6):
    vids.append({"id": "eski%d" % i, "title": "Eski %d" % i, "url": "#",
                 "date": "2022-%02d-01" % i, "game": "WT"})

players = []
# TAKIM A: 6 kisi, 4 videoda hep birlikte (klansiz)
for k in range(6):
    players.append({"name": "A_%d" % k, "clan": "", "videos": ["v1", "v2", "v3", "v4"]})
# TAKIM B: 6 kisi, 4 baska videoda hep birlikte
for k in range(6):
    players.append({"name": "B_%d" % k, "clan": "", "videos": ["v5", "v6", "v7", "v8"]})
# gercek klan
for k in range(4):
    players.append({"name": "K_%d" % k, "clan": "KL", "videos": ["v9", "v10"]})
# cok videosu olan ama eski
players.append({"name": "buyukEski", "clan": "",
                "videos": ["eski1", "eski2", "eski3", "eski4", "eski5"]})
# tek videosu olan ama yeni
players.append({"name": "kucukYeni", "clan": "", "videos": ["v12"]})

data = {"center": {"name": "Aghustos", "subtitle": "t", "color": "#ffd166", "channel": ""},
        "clans": [{"tag": "KL", "name": "Klan"}],
        "videos": vids, "players": players}

inj = (u'<script>window.ATLAS_DATA=' + json.dumps(data, ensure_ascii=False) +
       u';</script>\n<script src="assets/atlas.js"></script>')
s = s.replace(u'<script src="data/atlas-data.js"></script>\n<script src="assets/atlas.js"></script>',
              u'<script src="data/atlas-data.js"></script>\n' + inj, 1)

TEST = u'''<script>
setTimeout(function(){
 var log=[]; function t(n,c){log.push((c?"PASS":"FAIL")+" "+n);}
 try{
  var P={}, SZ={};
  document.querySelectorAll("g.node:not(.center)").forEach(function(n){
    var m=n.getAttribute("transform").match(/translate\\(([^,)]+),([^,)]+)\\)/);
    var nm=n.querySelector("text").textContent;
    P[nm]={x:+m[1], y:+m[2], r:Math.sqrt(m[1]*m[1]+m[2]*m[2])};
    SZ[nm]=+n.querySelector("circle.bub").getAttribute("r");
  });
  t("tum oyuncular yerlesti", Object.keys(P).length===18);

  function d2(a,b){ var dx=P[a].x-P[b].x, dy=P[a].y-P[b].y; return Math.sqrt(dx*dx+dy*dy); }
  function names(pre){ return Object.keys(P).filter(function(n){return n.indexOf(pre)===0;}); }
  function meanPair(list){
    var s=0,c=0;
    for(var i=0;i<list.length;i++) for(var j=i+1;j<list.length;j++){ s+=d2(list[i],list[j]); c++; }
    return s/c;
  }
  function meanCross(l1,l2){
    var s=0,c=0;
    l1.forEach(function(a){ l2.forEach(function(b){ s+=d2(a,b); c++; }); });
    return s/c;
  }

  // 1) birlikte oynayanlar kumelenmis mi?
  var A=names("A_"), B=names("B_"), K=names("K_");
  var inA=meanPair(A), inB=meanPair(B), AB=meanCross(A,B);
  t("takim A kendi icinde yakin ("+Math.round(inA)+" < "+Math.round(AB)+")", inA < AB);
  t("takim B kendi icinde yakin ("+Math.round(inB)+" < "+Math.round(AB)+")", inB < AB);
  t("klan uyeleri de kumelenmis", meanPair(K) < meanCross(K,A));

  // 2) oyuncular arasi baglar normalde CIZILMEZ, tiklayinca cikar
  function hiCount(){
    var e=document.querySelector(".hilinks path");
    return e ? ((e.getAttribute("d")||"").split("M").length-1) : -1;
  }
  t("acilista oyuncu bagi cizilmemis", hiCount()===0);
  var a0=[].slice.call(document.querySelectorAll("g.node:not(.center)")).filter(function(n){
    return n.querySelector("text").textContent==="A_0";})[0];
  a0.dispatchEvent(new MouseEvent("click",{bubbles:true}));
  var shown=hiCount();
  t("tiklayinca baglari cikti ("+shown+")", shown>0);
  // A_0: 5 takim arkadasi + bana giden 1 bag
  t("sadece kendi baglari ("+shown+")", shown===6);
  var lit=[].slice.call(document.querySelectorAll("g.node:not(.center)")).filter(function(n){
    return !n.classList.contains("faded");}).map(function(n){return n.querySelector("text").textContent;});
  // kendisi + 5 takim arkadasi parlar, digerleri soner
  t("sadece birlikte oynadiklari parliyor ("+lit.length+")", lit.length===6 &&
    lit.every(function(n){return n.indexOf("A_")===0;}));
  document.getElementById("atlas").dispatchEvent(new MouseEvent("click",{bubbles:true}));
  t("bosluga tiklayinca baglar kayboldu", hiCount()===0);
  // herkes bana da bagli olmali (kopuk ada kalmasin)
  var hub=document.querySelector(".hublinks path");
  t("bana giden bag katmani var", !!hub);
  var hubN=(hub.getAttribute("d")||"").split("M").length-1;
  t("her oyuncu bana bagli ("+hubN+"/18)", hubN===18);
  t("bana giden baglar soluk cizilmis",
    parseFloat(hub.getAttribute("stroke-opacity")) < 0.2);

  // 3) boyut hala video sayisindan
  t("5 videolu, 1 videolodan buyuk", SZ["buyukEski"] > SZ["kucukYeni"]);
  t("ayni videolu ayni boyutta", SZ["A_0"]===SZ["A_1"]);

  // 4) tarih hala merkeze uzakligi etkiliyor (kesin siralama degil, egilim)
  var eskiOrt=P["buyukEski"].r, yeniOrt=P["kucukYeni"].r;
  t("2022'de kalan ("+Math.round(eskiOrt)+"), 2025'te oynayandan ("+Math.round(yeniOrt)+") uzakta",
    eskiOrt > yeniOrt);
  t("cok videolu ama eski, hala BUYUK", SZ["buyukEski"] > SZ["kucukYeni"]);

  // 5) takimlar renklendirilmis mi?
  var cols={};
  document.querySelectorAll("g.node:not(.center)").forEach(function(n){
    cols[n.querySelector("text").textContent]=n.querySelector("circle.bub").getAttribute("fill");
  });
  t("takim A tek renk", cols["A_0"]===cols["A_1"] && cols["A_0"]===cols["A_5"]);
  t("takim B farkli renkte", cols["B_0"]!==cols["A_0"]);
  t("takim rengi gri degil", cols["A_0"].toLowerCase()!=="#7d87ad");

  // 6) baloncuklar sabit mi?
  var before={};
  document.querySelectorAll("g.node").forEach(function(n,i){ before[i]=n.getAttribute("transform"); });
  var s2=document.getElementById("search");
  s2.value="A_"; s2.dispatchEvent(new Event("input",{bubbles:true}));
  s2.value=""; s2.dispatchEvent(new Event("input",{bubbles:true}));
  document.getElementById("btn-reset").click();
  setTimeout(function(){
    var moved=0;
    document.querySelectorAll("g.node").forEach(function(n,i){ if(before[i]!==n.getAttribute("transform")) moved++; });
    t("baloncuklar kimildamadi", moved===0);
    document.title="TESTS "+log.join(" | ");
  },900);
 }catch(e){log.push("FAIL exception: "+e.message); document.title="TESTS "+log.join(" | ");}
},3500);
</script>
</body>'''
s = s.replace(u"</body>", TEST, 1)
io.open(os.path.join(ROOT, "_graphtest.html"), "w", encoding="utf-8", newline="\n").write(s)
print("ok")
