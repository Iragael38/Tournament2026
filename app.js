// Tournoi de badminton à la mêlée — toute la logique de l'appli.
//
// Organisation :
//  1. Données : un seul objet S (joueurs, matchs, réglages), enregistré dans le navigateur (localStorage).
//  2. Calculs : stats(), queue(), ranking() recalculent tout à partir des matchs ; rien d'autre n'est stocké.
//  3. Tirage : pick() choisit les 4 joueurs du prochain match et forme les deux paires.
//  4. Affichage : render() redessine l'onglet courant à partir de S (vCourts, vPlayers, vRank, vMatches, vSettings).
//  5. Actions : un seul écouteur de clics lit l'attribut data-act du bouton, modifie S puis appelle commit().
{
const KEY='badmelee-v1';
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fresh=()=>({name:'Tournoi de décembre',courts:6,target:21,auto:true,players:[],matches:[],seq:1});
const load=()=>{try{const t=localStorage.getItem(KEY);return t?JSON.parse(t):null}catch(e){return null}};
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
let S=load()||fresh(), tab='courts', editing=null;
const P=id=>S.players.find(p=>p.id===id);
const nm=id=>esc(P(id)?.name||'?');
const live=()=>S.matches.filter(m=>m.st==='live');
const busySet=()=>{const s=new Set();live().forEach(m=>[...m.a,...m.b].forEach(i=>s.add(i)));return s};

function stats(){
  const st={};
  S.players.forEach(p=>st[p.id]={j:0,v:0,pf:0,pa:0,last:p.t||0,part:{},opp:{}});
  const add=(x,y,k)=>{if(st[x])st[x][k][y]=(st[x][k][y]||0)+1};
  S.matches.forEach(m=>{
    [[m.a,m.b],[m.b,m.a]].forEach(([t,o])=>{add(t[0],t[1],'part');t.forEach(x=>o.forEach(y=>add(x,y,'opp')))});
    if(m.st!=='done')return;
    [[m.a,m.sa,m.sb],[m.b,m.sb,m.sa]].forEach(([t,f,a])=>t.forEach(i=>{const s=st[i];if(!s)return;s.j++;s.pf+=f;s.pa+=a;if(f>a)s.v++;s.last=Math.max(s.last,m.end||0)}));
  });
  return st;
}
// Ordre d'attente : moins de matchs joués d'abord, puis celui qui attend depuis le plus longtemps
function queue(st){
  const busy=busySet();
  return S.players.filter(p=>p.on&&!busy.has(p.id)).sort((x,y)=>(st[x.id].j-st[y.id].j)||(st[x.id].last-st[y.id].last)||(x.id-y.id));
}
const SPLITS=[[[0,1],[2,3]],[[0,2],[1,3]],[[0,3],[1,2]]];
function pick(){
  const st=stats(),q=queue(st);
  if(q.length<4)return null;
  const pool=q.slice(0,Math.min(8,q.length)),n=pool.length,minJ=st[pool[0].id].j;
  const lv=p=>p.lv||2;
  let best=null,bc=Infinity;
  for(let a=0;a<n;a++)for(let b=a+1;b<n;b++)for(let c=b+1;c<n;c++)for(let d=c+1;d<n;d++){
    const g=[pool[a],pool[b],pool[c],pool[d]];
    let base=(a+b+c+d-6)*3+g.reduce((s,p)=>s+(st[p.id].j-minJ)*15,0);
    for(const [x,y] of SPLITS){
      const A=[g[x[0]],g[x[1]]],B=[g[y[0]],g[y[1]]];
      let cost=base+Math.random()*0.5;
      cost+=(st[A[0].id].part[A[1].id]||0)*12+(st[B[0].id].part[B[1].id]||0)*12;
      A.forEach(p=>B.forEach(o=>cost+=(st[p.id].opp[o.id]||0)*3));
      cost+=Math.abs(lv(A[0])+lv(A[1])-lv(B[0])-lv(B[1]))*4;
      if(cost<bc){bc=cost;best={a:A.map(p=>p.id),b:B.map(p=>p.id)}}
    }
  }
  return best;
}
function freeCourts(){const used=new Set(live().map(m=>m.c));const f=[];for(let c=1;c<=S.courts;c++)if(!used.has(c))f.push(c);return f}
function launch(c){const r=pick();if(!r)return false;S.matches.push({id:S.seq++,c,a:r.a,b:r.b,st:'live',start:Date.now()});return true}
function fill(){let n=0;for(const c of freeCourts()){if(launch(c))n++;else break}return n}
function commit(){save();render()}

const fmt=ms=>{const s=Math.max(0,Math.floor(ms/1000));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
const team=(ids,st)=>ids.map(i=>nm(i)).join('<br>');

function grid(st){
  const lm=live(),q=queue(st),max=Math.max(S.courts,...lm.map(m=>m.c),0);
  let h='';
  for(let c=1;c<=max;c++){
    const m=lm.find(x=>x.c===c);
    if(!m){h+=`<div class="court free"><b class="cond" style="font-size:22px">Terrain ${c}</b><span>Libre</span>${c<=S.courts?`<button class="pri" data-act="launch" data-c="${c}" ${q.length<4?'disabled':''}>Lancer un match</button>`:''}</div>`;continue}
    h+=`<div class="court" id="court-${c}"><div class="ch"><b>Terrain ${c}</b><span class="el" data-start="${m.start}">${fmt(Date.now()-m.start)}</span></div>
      <div class="half"><div class="names">${team(m.a)}</div><input class="sc" id="sa-${m.id}" inputmode="numeric" pattern="[0-9]*" aria-label="Score équipe 1"></div>
      <div class="net"></div>
      <div class="half"><div class="names">${team(m.b)}</div><input class="sc" id="sb-${m.id}" inputmode="numeric" pattern="[0-9]*" aria-label="Score équipe 2"></div>
      <div class="cf"><button class="pri" data-act="ok" data-id="${m.id}">Valider le score</button><button class="ghost" data-act="cancel" data-id="${m.id}">Annuler</button></div>
      <p class="msg" id="msg-${m.id}"></p></div>`;
  }
  return `<div class="courts">${h}</div>`;
}
function vCourts(st){
  const q=queue(st);
  const bar=`<div class="bar"><label class="sw"><input type="checkbox" id="auto" ${S.auto?'checked':''}> Lancer les matchs automatiquement</label><span class="sp"></span>
    <button data-act="fill" ${q.length<4||!freeCourts().length?'disabled':''}>Remplir les terrains libres</button><button data-act="tv">Mode écran</button><button data-act="qr">QR code</button></div>`;
  if(!S.players.length)return `<div class="empty"><h2>Aucun joueur pour l'instant</h2><p class="mut">Ajoutez les inscrits dans l'onglet Joueurs, ou testez avec des joueurs fictifs.</p><button class="pri" data-act="demo">Charger 36 joueurs fictifs</button></div>`;
  const qh=q.length?q.map((p,i)=>`<span class="chip${i<4?' next':''}">${esc(p.name)}<i>${st[p.id].j}</i></span>`).join(''):'<span class="mut">Personne en attente.</span>';
  return bar+grid(st)+`<section class="queue"><h2>En attente (${q.length})</h2><p class="mut" style="margin-top:-6px">Dans l'ordre de passage ; le chiffre indique le nombre de matchs joués. Les 4 premiers sont encadrés.</p><div class="chips">${qh}</div></section>`;
}
function ranking(st){
  return S.players.map(p=>({p,s:st[p.id]})).sort((x,y)=>{
    const a=x.s,b=y.s;if(!a.j!==!b.j)return a.j?-1:1;
    return (b.v/(b.j||1)-a.v/(a.j||1))||((b.pf-b.pa)/(b.j||1)-(a.pf-a.pa)/(a.j||1))||(b.v-a.v)||x.p.name.localeCompare(y.p.name);
  });
}
function vRank(st,limit){
  const r=ranking(st).slice(0,limit||999);
  if(!r.length)return '<p class="mut">Pas encore de joueurs.</p>';
  return `<div class="scroll"><table><thead><tr><th>#</th><th>Joueur</th><th>J</th><th>V</th><th>% V</th><th>Diff.</th><th>Moy.</th></tr></thead><tbody>${r.map(({p,s},i)=>{const d=s.pf-s.pa;return `<tr class="${i<3&&s.j?'top':''}"><td class="rk">${s.j?i+1:'–'}</td><td>${esc(p.name)}${p.on?'':' <span class="mut">(parti)</span>'}</td><td>${s.j}</td><td>${s.v}</td><td>${s.j?Math.round(100*s.v/s.j)+'%':'–'}</td><td>${d>0?'+':''}${d}</td><td>${s.j?(d/s.j>0?'+':'')+(d/s.j).toFixed(1):'–'}</td></tr>`}).join('')}</tbody></table></div>
  <p class="mut" style="font-size:14px">Classement au pourcentage de victoires (juste même si tout le monde n'a pas joué autant), puis à la différence de points moyenne par match.</p>`;
}
function vPlayers(st){
  const busy=busySet(),on=S.players.filter(p=>p.on).length;
  const rows=S.players.map(p=>`<div class="prow${p.on?'':' off'}"><div class="n">${esc(p.name)}<small>${st[p.id].j} match${st[p.id].j>1?'s':''}${busy.has(p.id)?' · sur le terrain':''}</small></div>
    <select data-act="lv" data-id="${p.id}" aria-label="Niveau de ${esc(p.name)}">${['Niveau ?','1 · débutant','2 · moyen','3 · confirmé'].map((t,i)=>`<option value="${i}" ${(p.lv||0)===i?'selected':''}>${t}</option>`).join('')}</select>
    <button data-act="tog" data-id="${p.id}">${p.on?'Présent':'Absent'}</button>
    ${st[p.id].j||busy.has(p.id)?'':`<button class="ghost warn" data-act="del" data-id="${p.id}" aria-label="Supprimer">✕</button>`}</div>`).join('');
  return `<div class="grid2"><div class="card"><h2>Ajouter des joueurs</h2><p class="mut" style="margin-top:-6px">Un nom par ligne. On peut en ajouter en cours de tournoi pour les retardataires.</p><textarea id="newp" placeholder="Camille&#10;Léo&#10;Sarah"></textarea><div class="bar" style="margin:10px 0 0"><button class="pri" data-act="add">Ajouter</button>${S.players.length?'':'<button data-act="demo">36 joueurs fictifs</button>'}</div></div>
    <div><h2>${S.players.length} joueurs · ${on} présents</h2><p class="mut" style="margin-top:-6px">« Absent » retire un joueur des prochains tirages sans effacer ses résultats (blessure, départ). Le niveau est facultatif : s'il est renseigné, les paires sont équilibrées.</p><div class="plist">${rows||'<p class="mut">Aucun joueur.</p>'}</div></div></div>`;
}
function vMatches(){
  const ms=[...S.matches].reverse();
  if(!ms.length)return '<p class="mut">Aucun match pour l\'instant.</p>';
  return `<p class="mut">Touchez « Modifier » pour corriger un score saisi par erreur.</p>`+ms.map(m=>{
    if(m.st==='live')return `<div class="mrow"><span class="t">T${m.c}</span><span class="tm">${m.a.map(nm).join(' & ')} <span class="mut">contre</span> ${m.b.map(nm).join(' & ')}</span><span class="mut">en cours</span></div>`;
    if(editing===m.id)return `<div class="mrow"><span class="t">T${m.c}</span><span class="tm">${m.a.map(nm).join(' & ')} / ${m.b.map(nm).join(' & ')}</span><input id="ea" inputmode="numeric" value="${m.sa}" aria-label="Score équipe 1"><input id="eb" inputmode="numeric" value="${m.sb}" aria-label="Score équipe 2"><button class="pri" data-act="esave" data-id="${m.id}">Enregistrer</button><button class="ghost warn" data-act="edel" data-id="${m.id}">Supprimer</button><button class="ghost" data-act="ecancel">Fermer</button></div>`;
    const wa=m.sa>m.sb;
    return `<div class="mrow"><span class="t">T${m.c}</span><span class="tm"><span class="${wa?'w':''}">${m.a.map(nm).join(' & ')}</span> <span class="mut">contre</span> <span class="${wa?'':'w'}">${m.b.map(nm).join(' & ')}</span></span><span class="s">${m.sa}–${m.sb}</span><button class="ghost" data-act="edit" data-id="${m.id}">Modifier</button></div>`;
  }).join('');
}
function vSettings(){
  let dump='';try{dump=JSON.stringify(S)}catch(e){}
  return `<div class="grid2"><div class="card"><h2>Tournoi</h2>
    <label class="field"><span>Nom</span><input id="tname" value="${esc(S.name)}"></label>
    <label class="field"><span>Nombre de terrains</span><input id="tcourts" type="number" min="1" max="20" value="${S.courts}"></label>
    <label class="field"><span>Points pour gagner un match</span><select id="ttarget">${[11,15,21].map(v=>`<option ${S.target===v?'selected':''}>${v}</option>`).join('')}</select></label>
    <p class="mut" style="font-size:14px">Le mode « au temps » viendra en version 2.</p></div>
    <div class="card"><h2>Sauvegarde</h2><p class="mut" style="margin-top:-6px">Tout est enregistré automatiquement dans ce navigateur. Par sécurité, copiez la sauvegarde de temps en temps (dans une note ou un message), ou pour reprendre le tournoi sur un autre appareil.</p>
    <textarea id="dump" readonly>${esc(dump)}</textarea><div class="bar" style="margin-top:10px"><button data-act="copy">Copier la sauvegarde</button><span id="copied" class="mut"></span></div>
    <label class="field"><span>Restaurer une sauvegarde</span><textarea id="imp" placeholder="Collez ici une sauvegarde"></textarea></label><button data-act="import">Restaurer</button> <span id="impmsg" class="mut"></span></div>
    <div class="card"><h2>Installer et partager</h2><p class="mut" style="margin-top:-6px">Dans Chrome sur Android : menu ⋮ puis « Ajouter à l'écran d'accueil ». L'appli marche ensuite sans réseau.</p><button data-act="qr">Afficher le QR code de l'appli</button></div>
    <div class="card"><h2>Test et remise à zéro</h2><p class="mut" style="margin-top:-6px">Pour faire un tournoi blanc : remplit des scores au hasard sur tous les matchs en cours.</p>
    <div class="bar"><button data-act="sim">Simuler les scores en cours</button><button class="warn" data-act="reset">Tout effacer</button></div></div></div>`;
}
function render(){
  const keep={};document.querySelectorAll('input.sc').forEach(i=>{if(i.value)keep[i.id]=i.value});
  const st=stats(),done=S.matches.filter(m=>m.st==='done').length,lm=live().length,q=queue(st).length;
  $('#title').textContent=S.name;
  $('#kpi').innerHTML=`<b>${done}</b> joués · <b>${lm}</b> en cours · <b>${q}</b> en attente`;
  document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));
  const M=$('#main');
  if(document.body.classList.contains('tv'))M.innerHTML=`${grid(st)}<div><h2>Classement</h2>${vRank(st,15)}</div>`;
  else M.innerHTML=tab==='courts'?vCourts(st):tab==='players'?vPlayers(st):tab==='rank'?`<h2>Classement individuel</h2>${vRank(st)}`:tab==='matches'?vMatches():vSettings();
  for(const id in keep){const i=document.getElementById(id);if(i)i.value=keep[id]}
}
const armed=new Map();
function twoStep(btn,label,fn){
  const k=btn.dataset.act+(btn.dataset.id||'');
  if(armed.get(k)){armed.delete(k);fn();return}
  const old=btn.textContent;btn.textContent=label;armed.set(k,1);
  setTimeout(()=>{if(armed.get(k)){armed.delete(k);btn.textContent=old}},3500);
}
const DEMO='Camille Léo Sarah Hugo Inès Lucas Manon Nathan Chloé Théo Léa Louis Emma Jules Lina Adam Jade Tom Zoé Noah Alice Paul Clara Arthur Eva Maël Julie Victor Anna Sacha Lou Gabriel Rose Ethan Margaux Raphaël'.split(' ');
function addNames(list){
  const have=new Set(S.players.map(p=>p.name.toLowerCase()));let n=0;
  list.map(s=>s.trim()).filter(Boolean).forEach(name=>{if(have.has(name.toLowerCase()))return;have.add(name.toLowerCase());S.players.push({id:S.seq++,name,lv:0,on:true,t:Date.now()});n++});
  return n;
}
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-tab]');if(t){tab=t.dataset.tab;editing=null;render();return}
  const b=e.target.closest('button[data-act]');if(!b)return;
  const id=+b.dataset.id,m=S.matches.find(x=>x.id===id);
  switch(b.dataset.act){
    case 'launch':launch(+b.dataset.c);commit();break;
    case 'fill':fill();commit();break;
    case 'ok':{
      const ia=$('#sa-'+id),ib=$('#sb-'+id),msg=$('#msg-'+id);
      const sa=parseInt(ia.value,10),sb=parseInt(ib.value,10);
      if(isNaN(sa)||isNaN(sb)){msg.textContent='Saisissez les deux scores.';return}
      if(sa===sb){msg.textContent='Il faut un gagnant : les scores sont égaux.';return}
      if(Math.max(sa,sb)<S.target&&!b.dataset.force){msg.textContent=`Aucune équipe n'atteint ${S.target}. Touchez à nouveau « Valider » pour confirmer.`;b.dataset.force=1;return}
      Object.assign(m,{sa,sb,st:'done',end:Date.now()});
      const c=m.c;if(S.auto)launch(c);commit();
      const el=document.getElementById('court-'+c);if(el){el.classList.add('flash')}
      break;}
    case 'cancel':twoStep(b,'Confirmer ?',()=>{S.matches=S.matches.filter(x=>x.id!==id);commit()});break;
    case 'tv':document.body.classList.add('tv');try{document.documentElement.requestFullscreen?.().catch(()=>{})}catch(err){}render();break;
    case 'demo':addNames(DEMO);tab='courts';if(S.auto)fill();commit();break;
    case 'add':{const n=addNames($('#newp').value.split('\n'));commit();if(!n)$('#newp').placeholder='Aucun nouveau nom (déjà présents ?)';if(S.auto&&n){fill();commit()}break;}
    case 'tog':{const p=P(id);p.on=!p.on;if(p.on&&S.auto)fill();commit();break;}
    case 'del':S.players=S.players.filter(p=>p.id!==id);commit();break;
    case 'edit':editing=id;render();break;
    case 'ecancel':editing=null;render();break;
    case 'esave':{const sa=parseInt($('#ea').value,10),sb=parseInt($('#eb').value,10);if(isNaN(sa)||isNaN(sb)||sa===sb)return;Object.assign(m,{sa,sb});editing=null;commit();break;}
    case 'edel':twoStep(b,'Confirmer ?',()=>{S.matches=S.matches.filter(x=>x.id!==id);editing=null;commit()});break;
    case 'copy':{const v=$('#dump').value;navigator.clipboard?.writeText(v).then(()=>$('#copied').textContent='Copiée.',()=>{$('#dump').select();$('#copied').textContent='Sélectionnée : copiez-la à la main.'});break;}
    case 'import':{try{const o=JSON.parse($('#imp').value);if(!Array.isArray(o.players)||!Array.isArray(o.matches))throw 0;S=Object.assign(fresh(),o);commit();$('#impmsg').textContent='Sauvegarde restaurée.'}catch(err){$('#impmsg').textContent='Sauvegarde illisible.'}break;}
    case 'sim':live().forEach(x=>{const w=S.target,l=Math.floor(Math.random()*(w-3));if(Math.random()<.5)Object.assign(x,{sa:w,sb:l});else Object.assign(x,{sa:l,sb:w});Object.assign(x,{st:'done',end:Date.now()})});if(S.auto)fill();commit();break;
    case 'qr':{
      const url=location.href.split('#')[0],box=$('#qrbox');
      try{const q=qrcode(0,'M');q.addData(url);q.make();$('#qr').innerHTML=q.createSvgTag({cellSize:6,margin:2,scalable:true})}catch(err){$('#qr').textContent='QR code indisponible.'}
      $('#qrurl').textContent=url;box.hidden=false;break;}
    case 'qrclose':$('#qrbox').hidden=true;break;
    case 'reset':twoStep(b,'Vraiment tout effacer ?',()=>{S=fresh();tab='courts';commit()});break;
  }
});
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.id==='auto'){S.auto=t.checked;if(S.auto)fill();commit()}
  else if(t.dataset.act==='lv'){P(+t.dataset.id).lv=+t.value;save()}
  else if(t.id==='tname'){S.name=t.value.trim()||'Tournoi';commit()}
  else if(t.id==='tcourts'){S.courts=Math.max(1,Math.min(20,+t.value||6));if(S.auto)fill();commit()}
  else if(t.id==='ttarget'){S.target=+t.value;commit()}
});
$('#tvx').addEventListener('click',()=>{document.body.classList.remove('tv');try{document.fullscreenElement&&document.exitFullscreen().catch(()=>{})}catch(err){}render()});
const tick=setInterval(()=>document.querySelectorAll('.el[data-start]').forEach(el=>el.textContent=fmt(Date.now()-+el.dataset.start)),1000);
// Accès pour les tests automatiques
window.__T={get S(){return S},set S(v){S=v},pick,fill,stats,queue,launch};
render();
// Hors ligne : enregistre le service worker (seulement en https, par exemple sur GitHub Pages).
if('serviceWorker' in navigator&&location.protocol==='https:'){navigator.serviceWorker.register('sw.js').catch(()=>{})}
}
