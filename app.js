import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc, doc, increment } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "./firebase-config.js";

const BRANDS=[["Apple","#4b5563"],["Samsung","#1d4ed8"],["Xiaomi","#ea580c"],["Huawei","#dc2626"],["Oppo","#16a34a"]];
const CATS=["الشاشة","البطارية","فلات التوصيل","مكبر الصوت","قطع أخرى"];
const LOW=2, AUTOLOCK=5*60*1000;

const S={brand:null,cat:null,items:[],q:"",adding:false,busy:false,msg:"",ok:false,dlg:false,pending:null,iReady:false,sReady:false,pinHash:null,unlocked:false,settings:false};
const A=document.getElementById("app");
let lockTimer;

const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const total=(b,c)=>S.items.filter(i=>i.brand===b&&(c==null||i.cat===c)).reduce((n,i)=>n+(+i.qty||0),0);

/* ---------- رمز القفل (يُحفظ مشفّراً في السحابة فيتزامن بين الأجهزة) ---------- */
const sref=doc(db,"settings","app");
const sha=async p=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode("parts:"+p)))].map(b=>b.toString(16).padStart(2,"0")).join("");
function need(fn){ if(!S.sReady) return; if(!S.pinHash||S.unlocked) fn(); else {S.pending=fn;S.dlg=true;S.msg="";render();} }
function touch(){ clearTimeout(lockTimer); if(S.unlocked) lockTimer=setTimeout(()=>{S.unlocked=false;render()},AUTOLOCK); }
async function submitPin(){
  if(await sha(document.getElementById("pin").value)===S.pinHash){S.unlocked=true;S.dlg=false;touch();const f=S.pending;S.pending=null;if(f)f();}
  else{S.msg="الرمز غير صحيح";render();}
}
async function savePin(remove){
  const v=id=>document.getElementById(id)?.value||""; S.ok=false;
  if(S.pinHash&&await sha(v("cur"))!==S.pinHash){S.msg="الرمز الحالي غير صحيح";return render();}
  if(!remove){
    if(!/^\d{4,8}$/.test(v("new"))){S.msg="الرمز من 4 إلى 8 أرقام";return render();}
    if(v("new")!==v("conf")){S.msg="الرمزان غير متطابقين";return render();}
  }
  try{ await setDoc(sref,{pinHash:remove?null:await sha(v("new"))}); S.unlocked=!remove; S.ok=true; S.msg=remove?"تم إلغاء الرمز":"تم حفظ الرمز"; touch(); }
  catch(e){S.msg="تعذّر الحفظ";}
  render();
}

/* ---------- العمليات ---------- */
const ref=id=>doc(db,"items",id);
const change=(id,d)=>need(()=>updateDoc(ref(id),{qty:increment(d)}).catch(()=>{}));
const remove=id=>need(()=>{ if(confirm("حذف هذه القطعة؟")) deleteDoc(ref(id)).catch(()=>{}); });

function shrink(file){return new Promise((ok,no)=>{
  const r=new FileReader(); r.onerror=no;
  r.onload=()=>{const im=new Image(); im.onerror=no; im.onload=()=>{
    const k=Math.min(1,600/Math.max(im.width,im.height)),c=document.createElement("canvas");
    c.width=Math.round(im.width*k); c.height=Math.round(im.height*k);
    c.getContext("2d").drawImage(im,0,0,c.width,c.height); ok(c.toDataURL("image/jpeg",.7));
  }; im.src=r.result}; r.readAsDataURL(file);
});}

async function save(){
  const name=document.getElementById("n").value.trim(),qty=+document.getElementById("c").value||0,f=document.getElementById("p").files[0];
  if(!name){S.msg="اكتب اسم القطعة";return render();}
  S.busy=true;S.msg="";render();
  try{
    const img=f?await shrink(f):null;
    await addDoc(collection(db,"items"),{brand:S.brand,cat:CATS[S.cat],name,qty,img});
    S.adding=false;
  }catch(e){S.msg="تعذّر الحفظ، حاول مرة أخرى";}
  S.busy=false;render();
}

/* ---------- الواجهة ---------- */
function home(){return '<p class="mu" style="margin-bottom:12px">اختر الماركة</p><div class="grid">'+BRANDS.map((b,i)=>
  `<button class="tile" data-a="brand" data-i="${i}"><span class="dot" style="background:${b[1]}">${b[0][0]}</span><b>${b[0]}</b><small>${total(b[0])} قطعة</small></button>`).join("")+'</div>';}
function brandView(){return '<div class="grid">'+CATS.map((c,i)=>
  `<button class="tile" data-a="cat" data-i="${i}"><b>${c}</b><small>${total(S.brand,c)} قطعة</small></button>`).join("")+'</div>';}
function catView(){
  const L=S.items.filter(i=>i.brand===S.brand&&i.cat===CATS[S.cat]&&(!S.q||String(i.name).toLowerCase().includes(S.q.toLowerCase())));
  const rows=L.length?L.map(i=>{const q=+i.qty||0;
    return `<div class="row">${i.img?`<img class="th" src="${i.img}" alt="">`:'<span class="th">📦</span>'}
    <div class="nm"><b>${esc(i.name)}</b><small class="${q<=LOW?"low":"ok"}">${q<=0?"نفدت الكمية":q<=LOW?"كمية قليلة":"متوفر"}</small></div>
    <div class="q"><button data-a="dec" data-id="${i.id}">−</button><span>${q}</span><button data-a="inc" data-id="${i.id}">+</button></div>
    <button class="ib" data-a="del" data-id="${i.id}" aria-label="حذف">🗑</button></div>`}).join("")
    :'<p class="mu" style="padding:14px 0;text-align:center">لا توجد قطع بعد</p>';
  const form=S.adding?`<div class="card f"><input id="n" type="text" placeholder="اسم القطعة أو الموديل"><input id="c" type="number" min="0" value="1" inputmode="numeric"><input id="p" type="file" accept="image/*"><div class="err">${esc(S.msg)}</div><button class="btn" data-a="save" ${S.busy?"disabled":""}>${S.busy?"جارٍ الحفظ…":"حفظ"}</button><button class="btn g" data-a="cancel">إلغاء</button></div>`
    :'<button class="btn" data-a="add">+ إضافة قطعة</button>';
  return `<div class="bar"><input id="q" type="text" placeholder="بحث" value="${esc(S.q)}"></div><div class="card">${rows}</div><div style="margin-top:12px">${form}</div>`;
}
function settingsView(){
  const has=!!S.pinHash;
  return `<div class="card f"><b>${has?"رمز القفل مُفعّل":"رمز القفل غير مفعّل"}</b>
  <p class="mu">${has?"يُطلب الرمز عند إضافة قطعة أو حذفها أو تعديل الكمية.":"فعّل رمزاً لحماية الإضافة والحذف وتعديل الكمية."}</p>
  ${has?'<input id="cur" type="password" inputmode="numeric" placeholder="الرمز الحالي">':''}
  <input id="new" type="password" inputmode="numeric" maxlength="8" placeholder="${has?"الرمز الجديد":"رمز جديد (4 إلى 8 أرقام)"}">
  <input id="conf" type="password" inputmode="numeric" maxlength="8" placeholder="تأكيد الرمز">
  <div class="${S.ok?"ok":"err"}">${esc(S.msg)}</div>
  <button class="btn" data-a="savepin">${has?"تغيير الرمز":"تفعيل الرمز"}</button>
  ${has?'<button class="btn g" data-a="rmpin">إلغاء الرمز</button>':''}</div>`;
}
function render(){
  const ready=S.iReady&&S.sReady;
  const title=S.settings?"الإعدادات":!S.brand?"المستودع":S.cat!=null?`${S.brand} · ${CATS[S.cat]}`:S.brand;
  const body=!ready?'<p class="mu" style="text-align:center;margin-top:40px">جارٍ التحميل…</p>':S.settings?settingsView():!S.brand?home():S.cat==null?brandView():catView();
  A.innerHTML=`<div class="top">${S.settings||S.brand?'<button class="ib" data-a="back" aria-label="رجوع">→</button>':''}<h1>${esc(title)}</h1><span class="sp"></span>${S.pinHash&&S.unlocked?'<button class="ib" data-a="lock" aria-label="قفل">🔓</button>':''}<button class="ib" data-a="settings" aria-label="الإعدادات">⚙️</button></div>${body}`+
    (S.dlg?`<div class="dlg"><div class="card f"><div style="font-size:36px">🔒</div><b>أدخل رمز التعديل</b><input id="pin" type="password" inputmode="numeric" autocomplete="off"><div class="err">${esc(S.msg)}</div><button class="btn" data-a="pin">تأكيد</button><button class="btn g" data-a="close">إلغاء</button></div></div>`:"");
  if(S.dlg) document.getElementById("pin").focus();
}

A.addEventListener("click",e=>{
  touch(); const t=e.target.closest("[data-a]"); if(!t) return;
  const {a,i,id}=t.dataset;
  if(a==="pin") return submitPin();
  if(a==="save") return save();
  if(a==="savepin") return savePin(false);
  if(a==="rmpin") return savePin(true);
  if(a==="brand"){S.brand=BRANDS[i][0];S.cat=null}
  else if(a==="cat"){S.cat=+i;S.q="";S.adding=false}
  else if(a==="back"){ if(S.settings){S.settings=false;S.msg=""} else if(S.cat!=null){S.cat=null;S.adding=false} else S.brand=null }
  else if(a==="settings"){S.settings=true;S.msg="";S.ok=false}
  else if(a==="add") return need(()=>{S.adding=true;S.msg="";render();});
  else if(a==="cancel"){S.adding=false;S.msg=""}
  else if(a==="close"){S.dlg=false;S.pending=null}
  else if(a==="lock"){S.unlocked=false}
  else if(a==="inc") return change(id,1);
  else if(a==="dec"){ const it=S.items.find(x=>x.id===id); if(it&&(+it.qty||0)>0) change(id,-1); return; }
  else if(a==="del") return remove(id);
  render();
});
A.addEventListener("input",e=>{
  if(e.target.id!=="q") return; S.q=e.target.value; const p=e.target.selectionStart; render();
  const el=document.getElementById("q"); el.focus(); el.setSelectionRange(p,p);
});
A.addEventListener("keydown",e=>{ if(e.key==="Enter"&&e.target.id==="pin") submitPin(); });

/* لا حساب ولا إيميل: القراءة والمزامنة عبر Firestore المجاني */
const soft=()=>{ if(!/^(n|c|p|q|pin|cur|new|conf)$/.test(document.activeElement?.id||"")) render(); };
onSnapshot(collection(db,"items"),snap=>{S.items=snap.docs.map(d=>({id:d.id,...d.data()}));S.iReady=true;soft();},()=>{S.iReady=true;render();});
onSnapshot(sref,s=>{S.pinHash=s.data()?.pinHash||null;if(!S.pinHash)S.unlocked=false;S.sReady=true;soft();},()=>{S.sReady=true;render();});

render();
if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});