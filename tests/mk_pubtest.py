# -*- coding: utf-8 -*-
import io, os, json, random
random.seed(5)
ROOT = r"C:\Users\Cenk_\Desktop\AI Projects\agu-atlas"
s = io.open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()

clans = [("C%d" % i, "Klan %d" % i) for i in range(1, 7)]
vids = [{"id": "v%d" % i, "title": "V%d" % i, "url": "#",
         "date": "202%d-%02d-01" % (i % 5, (i % 12) + 1), "game": "WT"} for i in range(1, 21)]
players = []
for tag, nm in clans:
    for k in range(5):
        c = random.randint(1, 5)
        players.append({"name": "%s_%d" % (tag, k), "clan": tag,
                        "videos": random.sample([v["id"] for v in vids], c)})
for i in range(60):
    c = random.randint(1, 3)
    players.append({"name": "pub_%02d" % i, "clan": "",
                    "videos": random.sample([v["id"] for v in vids], c)})

data = {"center": {"name": "Aghustos", "subtitle": "t", "color": "#ffd166", "channel": ""},
        "clans": [{"tag": t, "name": n} for t, n in clans],
        "videos": vids, "players": players}

inj = (u'<script>window.ATLAS_DATA=' + json.dumps(data, ensure_ascii=False) +
       u';</script>\n<script src="assets/atlas.js"></script>')
s = s.replace(u'<script src="data/atlas-data.js"></script>\n<script src="assets/atlas.js"></script>',
              u'<script src="data/atlas-data.js"></script>\n' + inj, 1)

TEST = u'''<script>
setTimeout(function(){
 var log=[]; function t(n,c){log.push((c?"PASS":"FAIL")+" "+n);}
 try{
  var D=window.ATLAS_DATA;
  var clanOf={}; D.players.forEach(function(p){clanOf[p.name]=p.clan||"PUBLIC";});
  var arr=[];
  document.querySelectorAll("g.node:not(.center)").forEach(function(n){
    var m=n.getAttribute("transform").match(/translate\\(([^,)]+),([^,)]+)\\)/);
    var x=+m[1],y=+m[2];
    var nm=n.querySelector("text").textContent;
    arr.push({name:nm, clan:clanOf[nm], a:Math.atan2(y,x)});
  });
  t("tum oyuncular yerlesti", arr.length===D.players.length);
  arr.sort(function(p,q){return p.a-q.a;});

  // NOT: eski yaricap/dilim geometrisi testleri kaldirildi; yerlesim artik
  // kuvvet tabanli bir graf. Kumelenme _graphtest icinde olculuyor.

  // 4) isimlendirme
  var legend=document.getElementById("legend-list").textContent;
  t("legend'de Public yaziyor", legend.indexOf("Public")>=0);
  t("legend'de Bagimsiz kalmadi", legend.indexOf("Ba\\u011f\\u0131ms\\u0131z")<0);
  var stats=document.getElementById("stats").textContent;
  t("alt bar klan sayisi public'i saymiyor", /(^|\\D)6\\s*klan/.test(stats));
  t("alt barda public sayaci var", stats.indexOf("public")>=0);

  // 5) public secilince digerleri vurgulanmasin
  var pubNode=[].slice.call(document.querySelectorAll("g.node:not(.center)")).filter(function(n){
    return n.querySelector("text").textContent.indexOf("pub_")===0;})[0];
  pubNode.dispatchEvent(new MouseEvent("click",{bubbles:true}));
  var otherPubs=[].slice.call(document.querySelectorAll("g.node:not(.center)")).filter(function(n){
    var t2=n.querySelector("text").textContent;
    return t2.indexOf("pub_")===0 && n!==pubNode;});
  // Tiklayinca artik SADECE birlikte oynadiklari parlar; oynamadiklari soner.
  var faded=otherPubs.filter(function(n){return n.classList.contains("faded");}).length;
  t("public secilince oynamadiklari soluk ("+faded+"/"+otherPubs.length+")", faded>0);
  t("hepsi birden parlamiyor", faded < otherPubs.length || otherPubs.length===0);
  var body=document.getElementById("panel-body").textContent;
  t("public panelinde 'Ayni klandan' yok", body.indexOf("Ayn\\u0131 klandan")<0);
 }catch(e){log.push("FAIL exception: "+e.message);}
 document.title="TESTS "+log.join(" | ");
},2800);
</script>
</body>'''
s = s.replace(u"</body>", TEST, 1)
io.open(os.path.join(ROOT, "_pubtest.html"), "w", encoding="utf-8", newline="\n").write(s)
print("ok")
