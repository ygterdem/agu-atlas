# -*- coding: utf-8 -*-
import io, os
ROOT = r"C:\Users\Cenk_\Desktop\AI Projects\agu-atlas"
s = io.open(os.path.join(ROOT, "editor.html"), encoding="utf-8").read()

TEST = u'''<script>
(function(){
 window.confirm=function(){return true;};
 var log=[]; function t(n,c){log.push((c?"PASS":"FAIL")+" "+n);}
 function D(){var sb={};new Function("window",document.getElementById("x-preview").textContent)(sb);return sb.ATLAS_DATA;}
 setTimeout(function(){
  try{
   // klan duzenleme moduna gec
   var btn=document.getElementById("r-clanedit");
   t("klan duzenleme dugmesi var", !!btn);
   btn.click();
   var sels=[].slice.call(document.querySelectorAll("#r-squad [data-clanat]"));
   t("kadro satirlarinda klan secici var", sels.length>0);
   var who=sels[0].getAttribute("data-clanat");

   // varsayilan: "su anki klani" secili (override yok)
   t("varsayilan devralma", sels[0].value==="-1");

   // bir klan sec (ilk gercek klan = index 0)
   var opt=[].slice.call(sels[0].options).filter(function(o){return +o.value>=0;})[0];
   t("secilebilir klan var", !!opt);
   sels[0].value=opt.value; sels[0].dispatchEvent(new Event("change",{bubbles:true}));

   document.querySelector("[data-tab='export']").click();
   var d=D();
   var p=d.players.filter(function(x){return x.name===who;})[0];
   t("clanAt ciktiya yazildi", !!p && !!p.clanAt && Object.keys(p.clanAt).length===1);
   var vid=Object.keys(p.clanAt)[0];
   t("clanAt gecerli bir klan tagi", d.clans.some(function(c){return c.tag===p.clanAt[vid];}));
   t("clanAt oyuncunun videolarindan biri", p.videos.indexOf(vid)>=0);

   // Bagimsiz sec
   document.querySelector("[data-tab='roster']").click();
   var s2=document.querySelector("#r-squad [data-clanat='"+who.replace(/'/g,"")+"']") ||
          [].slice.call(document.querySelectorAll("#r-squad [data-clanat]"))[0];
   s2.value="-2"; s2.dispatchEvent(new Event("change",{bubbles:true}));
   document.querySelector("[data-tab='export']").click();
   var p2=D().players.filter(function(x){return x.name===who;})[0];
   t("Bagimsiz da kaydediliyor", p2.clanAt && p2.clanAt[vid]==="");

   // devralmaya geri don -> clanAt temizlenir
   document.querySelector("[data-tab='roster']").click();
   var s3=[].slice.call(document.querySelectorAll("#r-squad [data-clanat]"))[0];
   s3.value="-1"; s3.dispatchEvent(new Event("change",{bubbles:true}));
   document.querySelector("[data-tab='export']").click();
   var p3=D().players.filter(function(x){return x.name===who;})[0];
   t("devralmaya donunce clanAt silindi", !p3.clanAt || !(vid in p3.clanAt));

   // tekrar bir klan ata, sonra klan etiketini degistir -> clanAt tasinsin
   document.querySelector("[data-tab='roster']").click();
   var s4=[].slice.call(document.querySelectorAll("#r-squad [data-clanat]"))[0];
   var o4=[].slice.call(s4.options).filter(function(o){return +o.value>=0;})[0];
   s4.value=o4.value; s4.dispatchEvent(new Event("change",{bubbles:true}));
   document.querySelector("[data-tab='export']").click();
   var oldTag=D().players.filter(function(x){return x.name===who;})[0].clanAt[vid];

   document.querySelector("[data-tab='clans']").click();
   var row=[].slice.call(document.querySelectorAll("#c-table tbody tr")).filter(function(r){
     return r.querySelector("[data-f='tag']").value===oldTag;})[0];
   row.querySelector("[data-f='tag']").value="TASINDI";
   row.querySelector("[data-f='tag']").dispatchEvent(new Event("change",{bubbles:true}));
   document.querySelector("[data-tab='export']").click();
   var d5=D();
   var p5=d5.players.filter(function(x){return x.name===who;})[0];
   t("etiket degisince clanAt de tasindi", p5.clanAt[vid]==="TASINDI");
   t("kontrol temiz", document.querySelectorAll("#x-issues .note.bad").length===0);

   // video silinince clanAt temizlenir
   document.querySelector("[data-tab='videos']").click();
   var del=document.querySelector("#v-table tr[data-id='"+vid+"'] [data-del]");
   if(del){
     del.click();
     document.querySelector("[data-tab='export']").click();
     var p6=D().players.filter(function(x){return x.name===who;})[0];
     t("video silinince clanAt temizlendi", !p6 || !p6.clanAt || !(vid in p6.clanAt));
   } else { t("video satiri bulundu", false); }
  }catch(e){log.push("FAIL exception: "+e.message);}
  document.title="TESTS "+log.join(" | ");
 },1300);
})();
</script>
</body>'''

s = s.replace(u"</body>", TEST, 1)
io.open(os.path.join(ROOT, "_clantest.html"), "w", encoding="utf-8", newline="\n").write(s)
print("ok")
