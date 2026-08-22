# -*- coding: utf-8 -*-
import io, os
ROOT = r"C:\Users\Cenk_\Desktop\AI Projects\agu-atlas"
s = io.open(os.path.join(ROOT, "editor.html"), encoding="utf-8").read()

TEST = u'''<script>
(function(){
 window.confirm=function(){return true;};
 var log=[]; function t(n,c){log.push((c?"PASS":"FAIL")+" "+n);}
 function D(){var sb={};new Function("window",document.getElementById("x-preview").textContent)(sb);return sb.ATLAS_DATA;}
 function inp(){return document.getElementById("r-input");}
 function type(v){var i=inp(); i.value=v; i.dispatchEvent(new Event("input",{bubbles:true})); return i;}
 function acRows(){return [].slice.call(document.querySelectorAll("#r-ac div"));}
 function md(el){el.dispatchEvent(new MouseEvent("mousedown",{bubbles:true,cancelable:true}));}
 function txt(){return acRows().map(function(d){return d.textContent;}).join(" || ");}
 setTimeout(function(){
  try{
   // hazirlik: kadroda olan ve olmayan birer oyuncu
   var chip=document.querySelector("#r-squad .pchip");
   var inSquad=chip?chip.textContent.replace(/[^\\S ]/g,"").replace("\\u00d7","").trim():null;
   var qa=document.querySelector("#r-quick [data-add]");
   var notIn=qa?qa.getAttribute("data-add"):null;
   t("kadroda olan oyuncu bulundu", !!inSquad);
   t("kadroda olmayan oyuncu bulundu", !!notIn);

   // 1) zaten eklenmis birini yazinca listede kalsin ve isaretlensin
   type(inSquad.slice(0,Math.max(3,inSquad.length-1)));
   var rowsTxt=txt();
   t("zaten ekli oyuncu listede gorunuyor", rowsTxt.indexOf(inSquad)>=0);
   t("'zaten eklendi' etiketi var", rowsTxt.indexOf("zaten eklendi")>=0);

   // tiklayinca kadro degismesin
   var before=document.querySelectorAll("#r-squad .pchip").length;
   var already=acRows().filter(function(d){return d.textContent.indexOf("zaten eklendi")>=0;})[0];
   md(already);
   t("zaten ekliye tiklamak kadroyu degistirmiyor",
     document.querySelectorAll("#r-squad .pchip").length===before);

   // 2) bilinmeyen ad -> iki secenek
   type("BILINMEYEN_AD_XYZ");
   var r2=txt();
   t("yeni oyuncu secenegi var", r2.indexOf("yeni oyuncu")>=0);
   t("eski ad secenegi var", r2.indexOf("eski ad")>=0);

   // 3) eski ad moduna gec
   var asAlias=acRows().filter(function(d){return d.textContent.indexOf("eski ad")>=0;})[0];
   md(asAlias);
   t("eski ad moduna gecildi", !document.getElementById("r-hint").hidden);
   t("ipucu yazilan adi gosteriyor",
     document.getElementById("r-hint").textContent.indexOf("BILINMEYEN_AD_XYZ")>=0);
   t("input bosaldi", inp().value==="");
   t("mod gorsel olarak isaretli", inp().classList.contains("alias-mode"));

   // hedef oyuncuyu sec
   type(notIn);
   var target=acRows().filter(function(d){return d.textContent.indexOf(notIn)>=0;})[0];
   t("mod icinde oyuncu aranabiliyor", !!target);
   md(target);
   t("moddan cikildi", document.getElementById("r-hint").hidden);

   document.querySelector("[data-tab='export']").click();
   var d=D();
   var tp=d.players.filter(function(p){return p.name===notIn;})[0];
   t("eski ad oyuncuya baglandi", !!tp && (tp.aliases||[]).indexOf("BILINMEYEN_AD_XYZ")>=0);
   t("BILINMEYEN_AD_XYZ diye oyuncu acilmadi", !d.players.some(function(p){return p.name==="BILINMEYEN_AD_XYZ";}));

   // 4) eski adla arayinca asil oyuncu bulunsun
   document.querySelector("[data-tab='roster']").click();
   type("BILINMEYEN_AD");
   var r4=txt();
   t("eski adla arama asil oyuncuyu buluyor", r4.indexOf(notIn)>=0);
   t("hangi eski adla eslestigi gosteriliyor", r4.indexOf("BILINMEYEN_AD_XYZ")>=0);
   t("zaten eklendi olarak isaretli", r4.indexOf("zaten eklendi")>=0);

   // 5) kontrol temiz
   document.querySelector("[data-tab='export']").click();
   t("kontrol temiz", document.querySelectorAll("#x-issues .note.bad").length===0);
  }catch(e){log.push("FAIL exception: "+e.message);}
  document.title="TESTS "+log.join(" | ");
 },1300);
})();
</script>
</body>'''

s = s.replace(u"</body>", TEST, 1)
io.open(os.path.join(ROOT, "_actest.html"), "w", encoding="utf-8", newline="\n").write(s)
print("test sayfasi yazildi")
