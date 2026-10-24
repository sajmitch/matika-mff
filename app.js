/* Matika. Static, offline-capable, with all progress kept on this device. */
'use strict';
(async function(){
const C=window.MatikaCore,$=s=>document.querySelector(s);
const STORE='matika-mff:v2',SESSION='matika-mff:session:v2',PREFS='matika-mff:filters:v2';
const names={la:'Lineární algebra',ma:'Matematická analýza'},short={la:'LA1',ma:'MA I'};
const types={definition:'Definice',theorem:'Tvrzení',proof:'Důkazy',method:'Postupy',example:'Příklady'};
const states={new:'Nové',learning:'Ještě ne',known:'Umím'};
function noun(n,one,few,many){return n===1?one:n>=2&&n<=4?few:many;}
function itemNoun(n,acc=false){return mode==='cards'?noun(n,acc?'kartu':'karta','karty','karet'):noun(n,acc?'otázku':'otázka','otázky','otázek');}
const paths={arrow:'M4 12h16m-6-6 6 6-6 6',back:'M20 12H4m6-6-6 6 6 6',close:'m6 6 12 12M18 6 6 18',flip:'M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5m-4 8a8 8 0 0 0 14 3l3-3m0 5v-5h-5',check:'m5 12 4 4L19 6',filter:'M4 7h16M7 12h10M10 17h4',shuffle:'m4 5 16 14m-4 0h4v-4M4 19 20 5m-4 0h4v4',book:'M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1m0-15c3-2 6-2 9-1v15c-3-1-6-1-9 1V5',download:'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',upload:'M12 16V3m-5 5 5-5 5 5M4 17v4h16v-4',undo:'M4 10h9a6 6 0 0 1 0 12M4 10l5-5m-5 5 5 5',external:'M14 3h7v7m0-7L10 14M10 3H3v18h18v-7',pause:'M8 5v14M16 5v14',chart:'M4 20V10m8 10V4m8 16v-7'};
function icon(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.arrow}"/></svg>`;}
function escape(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function math(s){return String(s??'').split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g).map((part,i)=>{
 if(part.startsWith('$')){const block=part.startsWith('$$'),tex=part.slice(block?2:1,block?-2:-1);try{return katex.renderToString(tex,{displayMode:block,throwOnError:true,strict:'ignore',trust:false,output:'htmlAndMathml'});}catch(e){console.error('Math:',tex,e.message);return escape(part);}}
 return escape(part).replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>');
}).join('');}
function rich(s){return `<div class="math"><p>${math(s)}</p></div>`;}
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
let storageWarned=false;
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{if(!storageWarned){storageWarned=true;toast('Pokrok nejde uložit. Exportuj si zálohu v Pokroku.');}return false;}}
function toast(text){const el=$('#toast');el.textContent=text;el.classList.add('toast');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('toast'),3600);}
let data;
try{const response=await fetch('content.json');if(!response.ok)throw Error('HTTP '+response.status);data=await response.json();if(!data.cards?.length||!data.quizzes?.length)throw Error('Chybí obsah');}
catch(error){$('#main').innerHTML=`<div class="empty"><h1>Ještě chvilku.</h1><p>Obsah se nepodařilo načíst. Připoj se a zkus to znovu.</p><button class="primary" id="retry">Zkusit znovu</button></div>`;$('#retry').onclick=()=>location.reload();return;}
const all=[...data.cards,...data.quizzes],byId=new Map(all.map(x=>[x.id,x])),chapById=new Map(data.chapters.map(x=>[x.id,x]));
let stored=read(STORE,{}),progress={};
try{progress=C.validateImport({app:'matika-mff',version:2,progress:stored.progress||{}},all.map(x=>x.id));}catch{toast('Uložený pokrok se nepodařilo načíst.');}
let history=C.validateHistory(stored.history,all.map(x=>x.id));
let preferences=read(PREFS,{});if(!preferences||typeof preferences!=='object'||Array.isArray(preferences))preferences={};let subject='la',mode='cards',view='home',session=null,revealed=false,selected=null,draft=null;
const defaultFilter=sub=>({subject:sub,chapters:data.chapters.filter(c=>c.subject===sub).map(c=>c.id),types:Object.keys(types),statuses:Object.keys(states),query:''});
function getFilter(sub=subject){const d=defaultFilter(sub),p=preferences[sub];if(!p||!Array.isArray(p.chapters)||!Array.isArray(p.types)||!Array.isArray(p.statuses))return d;return{subject:sub,chapters:p.chapters.filter(id=>d.chapters.includes(id)),types:p.types.filter(t=>types[t]),statuses:p.statuses.filter(s=>states[s]),query:typeof p.query==='string'?p.query:''};}
function setFilter(f){preferences[subject]=f;save(PREFS,preferences);}
function filtered(){return C.filter(mode==='cards'?data.cards:data.quizzes,getFilter(),progress);}
function persist(){save(STORE,{progress,history});}
function localDay(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function mark(id,status){const previous=progress[id]?{...progress[id]}:null;progress[id]={status,updated:Date.now(),seen:(progress[id]?.seen||0)+1};history.push({id,day:localDay()});history=history.slice(-10000);persist();return previous;}
function theme(){document.documentElement.style.setProperty('--accent',subject==='ma'?'#805f4c':'#315b4e');document.documentElement.style.setProperty('--tint',subject==='ma'?'#f0e8e2':'#e7eee6');}
function pct(items){return items.length?Math.round(C.counts(items,progress).known/items.length*100):0;}
function chapterName(id){return chapById.get(id)?.title||'';}
function source(item){const file=item.subject==='la'?'skripta_la1.pdf':'MA1.pdf';const printed=item.subject==='ma'?item.source.page-4:item.source.page;return `<a class="source-link" title="${escape(item.source.label)}" href="${file}#page=${item.source.page}" target="_blank" rel="noopener">${icon('book')} Skripta · s. ${printed}${icon('external')}</a>`;}
function shell(){
 $('#header').innerHTML=`<button class="brand" data-action="home" aria-label="Matika, úvod"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="1" y="1" width="30" height="30" rx="10" stroke="#315b4e"/><path d="m8 22 4-12 4 8 4-8 4 12" stroke="#315b4e" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>matika</button><nav aria-label="Hlavní navigace"><button data-action="home" class="${view==='home'||view==='subject'?'active':''}" ${view==='home'?'aria-current="page"':''}>Předměty</button><button data-action="progress" class="${view==='progress'?'active':''}" ${view==='progress'?'aria-current="page"':''}>Pokrok</button></nav>`;
 $('#footer').innerHTML=`<span>${navigator.onLine?'Matika':'<span class="offline">Offline</span>'}</span><button data-action="about">O aplikaci & zdroje</button>`;
}
function art(sub){if(sub==='la')return `<svg class="art" viewBox="0 0 200 180" fill="none" aria-hidden="true"><path d="m70 15 94 42v87l-94 20-50-63z" stroke="#648064" stroke-width="1"/><path d="m70 15 21 91 73 38M20 101l71 5-21 58m21-58 73-49M70 15 20 101" stroke="#648064" stroke-width="1"/><path d="m70 15 21 91-71-5z" fill="#a9bba0" fill-opacity=".35"/><circle cx="91" cy="106" r="4" fill="#315b4e"/><circle cx="164" cy="57" r="3" fill="#315b4e"/><path d="M10 159h175M34 170V6" stroke="#648064" stroke-opacity=".3" stroke-dasharray="3 5"/></svg>`;
 return `<svg class="art" viewBox="0 0 200 180" fill="none" aria-hidden="true"><path d="M18 145h165M37 165V18" stroke="#a6876b" stroke-opacity=".6"/><path d="M37 145C60 145 65 45 103 45S135 135 176 17" stroke="#896347" stroke-width="2"/><path d="M37 145C60 145 65 45 103 45S135 135 176 17V145Z" fill="#ccb59b" fill-opacity=".35"/><path d="M37 45h67v100M138 145V92" stroke="#a6876b" stroke-dasharray="3 5"/><circle cx="103" cy="45" r="4" fill="#896347"/><path d="m77 20 53 49" stroke="#896347" stroke-opacity=".7"/></svg>`;}
function home(){
 const today=new Set(history.filter(x=>x.day===localDay()).map(x=>x.id)).size;const known=C.counts(all,progress).known;const saved=read(SESSION,null);const canResume=saved&&Array.isArray(saved.ids)&&saved.ids.length&&saved.index<saved.ids.length&&saved.ids.every(id=>byId.has(id));
 $('#main').innerHTML=`<section class="animate-in"><div class="home-heading"><div><p class="eyebrow">LA1 / MA I</p><h1>Čemu se dnes<br>věnovat?</h1></div></div><div class="subjects">${['la','ma'].map((s,i)=>{const cards=data.cards.filter(c=>c.subject===s);return `<button class="subject-card ${s}" data-action="subject" data-subject="${s}"><div class="label-line"><span>0${i+1} / ${short[s]}</span><span>${pct(cards)} %</span></div><h2>${s==='la'?'Lineární<br>algebra':'Matematická<br>analýza'}</h2>${art(s)}<div class="subject-bottom"><span>${data.chapters.filter(c=>c.subject===s).length} kapitol · ${cards.length} karet</span><span class="arrow-circle">${icon('arrow')}</span></div></button>`;}).join('')}</div><div class="home-lower"><div class="home-stat"><span class="number">${today}</span><span><strong>Dnes projito</strong>${known} položek už umíš</span></div>${canResume?`<button class="resume-card" data-action="resume">${icon('book')}<span>Pokračovat<small>${short[saved.subject]} · ${saved.mode==='cards'?'kartičky':'kvíz'} · ${saved.index+1}/${saved.ids.length}</small></span>${icon('arrow')}</button>`:`<button class="resume-card" data-action="progress">${icon('chart')}<span>Tvůj pokrok<small>Statistiky a záloha</small></span>${icon('arrow')}</button>`}</div></section>`;
}
function summaries(f){const out=[];const chapters=data.chapters.filter(c=>c.subject===subject);if(f.chapters.length!==chapters.length)out.push(f.chapters.length===1?chapterName(f.chapters[0]):`${f.chapters.length} ${noun(f.chapters.length,'kapitola','kapitoly','kapitol')}`);if(f.types.length!==Object.keys(types).length)out.push(...f.types.map(t=>types[t]));if(f.statuses.length!==3)out.push(...f.statuses.map(s=>states[s]));if(f.query)out.push(`„${f.query}“`);return out;}
function subjectPage(){
 const f=getFilter(),items=filtered(),sum=summaries(f),chapters=data.chapters.filter(c=>c.subject===subject);
 $('#main').innerHTML=`<section class="animate-in"><button class="back" data-action="home">${icon('back')} Předměty</button><div class="page-heading"><div><p class="eyebrow">${short[subject]}</p><h1>${names[subject]}</h1></div><span class="subject-tag">${subject==='la'?'A':'ƒ'}</span></div><div class="toolbar"><div class="segmented" role="group" aria-label="Způsob učení"><button data-action="mode" data-mode="cards" aria-pressed="${mode==='cards'}" class="${mode==='cards'?'selected':''}">Kartičky</button><button data-action="mode" data-mode="quiz" aria-pressed="${mode==='quiz'}" class="${mode==='quiz'?'selected':''}">Kvíz</button></div><button class="outline-button" data-action="filters">${icon('filter')} Filtry ${sum.length?`<span class="filter-count">${sum.length}</span>`:''}</button></div>${sum.length?`<div class="filter-summary">${sum.map(x=>`<span class="chip">${escape(x)}</span>`).join('')}</div>`:''}<div class="study-launch"><div><div class="serif">${items.length} ${itemNoun(items.length)}</div><p>${f.chapters.length===chapters.length?'Všechny kapitoly':f.chapters.length===1?escape(chapterName(f.chapters[0])):'Vlastní výběr'}</p></div><div class="launch-actions">${mode==='quiz'?`<select class="round-size" id="round-size" aria-label="Délka kvízu"><option value="10">10 otázek</option><option value="20">20 otázek</option><option value="0">Všechny</option></select>`:''}<button class="primary" data-action="start" ${!items.length?'disabled':''}>${mode==='cards'?'Otevřít karty':'Spustit kvíz'} ${icon('arrow')}</button></div></div>${!items.length?'<div class="empty"><p>Tomuto výběru nic neodpovídá.</p><button class="secondary" data-action="reset-filters">Zrušit filtry</button></div>':''}<div class="section-label"><span>Kapitoly</span><button data-action="all-chapters">Všechny kapitoly</button></div><div class="chapter-list">${chapters.map(c=>{const list=(mode==='cards'?data.cards:data.quizzes).filter(x=>x.chapter===c.id);const count=C.counts(list,progress);return `<button class="chapter" data-action="chapter" data-chapter="${c.id}"><span class="chapter-num">${String(c.number).padStart(2,'0')}</span><span class="chapter-title">${escape(c.title)}<small>${list.length} ${itemNoun(list.length)} · ${count.known} umím</small></span><span class="chapter-ring" style="--progress:${pct(list)}%" aria-hidden="true"></span>${icon('arrow')}</button>`;}).join('')}</div></section>`;
}
function saveSession(){if(session)save(SESSION,session);}
function start(items=filtered(),resume=false,limitOverride=null){
 if(!items.length)return;
 if(!resume){const size=limitOverride!==null?limitOverride:mode==='quiz'?Number($('#round-size')?.value??10):0;let ordered=C.shuffle(items);if(size>0)ordered=ordered.slice(0,size);session={subject,mode,ids:ordered.map(x=>x.id),index:0,results:[],optionOrders:{}};saveSession();}
 revealed=false;selected=null;go('study');
}
let flashcardObserver=null;
function flashcard(item,chapter){
 return `<div class="flashcard ${revealed?'is-flipped':''}" data-action="flip-card" tabindex="0" role="group" aria-roledescription="otočná kartička" aria-label="${revealed?'Odpověď':'Otázka'}; kliknutím otočíš" aria-describedby="flip-instructions"><div class="flip-inner"><section class="study-card card-face card-front" aria-hidden="${revealed}" ${revealed?'inert':''}><div class="card-meta"><span class="kind">${types[item.type]}</span><span>${escape(chapter)}</span></div><h2 class="card-question" id="question">${rich(item.question)}</h2><div class="flip-prompt"><span>${icon('flip')}</span><span>Klepnutím otočit</span></div></section><section class="study-card card-face card-back" aria-hidden="${!revealed}" ${!revealed?'inert':''}><div class="card-meta"><span class="kind">Odpověď</span><span>${escape(chapter)}</span></div><div class="flip-answer">${rich(item.answer)}</div><div class="flip-prompt"><span>${icon('flip')}</span><span>Zpět na otázku</span></div></section></div><span class="sr-only" id="flip-instructions">Kartičku otočíš kliknutím, Enterem nebo mezerníkem.</span></div>`;
}
function fitFlashcard(){
 const card=$('.flashcard');if(!card)return;
 const active=card.querySelector(revealed?'.card-back':'.card-front');
 card.querySelector('.flip-inner').style.height=`${Math.ceil(active.offsetHeight)}px`;
}
function flipCard(){
 if(mode!=='cards'||view!=='study')return;
 const card=$('.flashcard');if(!card)return;
 revealed=!revealed;
 card.classList.toggle('is-flipped',revealed);
 card.setAttribute('aria-label',`${revealed?'Odpověď':'Otázka'}; kliknutím otočíš`);
 for(const face of card.querySelectorAll('.card-face')){
  const hidden=face.classList.contains('card-front')?revealed:!revealed;
  face.setAttribute('aria-hidden',String(hidden));face.inert=hidden;
 }
 $('#card-assessment').hidden=!revealed;
 $('#card-source').hidden=!revealed;
 fitFlashcard();
}
function studyPage(){
 if(!session||session.index>=session.ids.length){resultPage();return;}
 const item=byId.get(session.ids[session.index]);const chapter=chapterName(item.chapter);
 if(!item){go('subject');return;}
 const body=mode==='cards'?flashcard(item,chapter):`<article class="study-card quiz-card"><div class="card-meta"><span class="kind">${types[item.type]}</span><span>${escape(chapter)}</span></div><h2 class="card-question" id="question">${rich(item.question)}</h2><div class="options" role="group" aria-label="Možnosti odpovědi">${getOptions(item).map((idx,pos)=>`<button class="option ${selected!==null?(idx===item.correct?'correct':idx===selected?'wrong':''):''}" data-action="answer" data-choice="${idx}" ${selected!==null?'disabled':''}><span class="option-letter">${selected!==null&&idx===item.correct?'✓':selected===idx?'×':String.fromCharCode(65+pos)}</span>${rich(item.options[idx])}${selected!==null&&idx===item.correct?'<span class="sr-only">Správná odpověď</span>':''}</button>`).join('')}</div></article>`;
 $('#main').innerHTML=`<section class="session-wrap animate-in"><div class="session-top"><button class="back" data-action="exit-session">${icon('back')} ${short[subject]}</button><span class="counter">${session.index+1} <span aria-label="z">/</span> ${session.ids.length}</span><button class="icon-button" data-action="shuffle-session" aria-label="Zamíchat zbývající">${icon('shuffle')}</button></div><div class="progress-track" role="progressbar" aria-label="Průchod sadou" aria-valuenow="${session.index}" aria-valuemin="0" aria-valuemax="${session.ids.length}"><span style="width:${session.index/session.ids.length*100}%"></span></div>${body}${mode==='cards'?`<div class="assessment" id="card-assessment" ${!revealed?'hidden':''}><button class="secondary" data-action="rate" data-status="learning">Ještě ne</button><button class="primary" data-action="rate" data-status="known">${icon('check')} Umím</button></div><div class="card-source" id="card-source" ${!revealed?'hidden':''}>${source(item)}</div>`:''}${mode==='quiz'&&selected!==null?`<div class="quiz-explanation" role="status"><h3>${selected===item.correct?'Správně.':'Správná odpověď je označená.'}</h3>${rich(item.explanation)}${source(item)}</div><div class="quiz-bottom"><div class="confidence" aria-label="Vlastní hodnocení"><button data-action="confidence" data-status="learning" class="${C.status(progress,item.id)==='learning'?'active':''}" aria-pressed="${C.status(progress,item.id)==='learning'}">Ještě ne</button><button data-action="confidence" data-status="known" class="${C.status(progress,item.id)==='known'?'active':''}" aria-pressed="${C.status(progress,item.id)==='known'}">Umím</button></div><button class="primary" data-action="next">${session.index===session.ids.length-1?'Dokončit':'Další otázka'} ${icon('arrow')}</button></div>`:''}<div class="session-foot"><button class="text-button" data-action="undo" ${!session.results.length?'disabled':''}>${icon('undo')} Zpět</button><span class="key-hint">${mode==='cards'?'Mezerník · otočit &nbsp; 1 · ještě ne &nbsp; 2 · umím':'1–4 · odpověď &nbsp; Enter · další'}</span><button class="text-button" data-action="skip" ${selected!==null?'disabled':''}>Přeskočit ${icon('arrow')}</button></div></section>`;
 flashcardObserver?.disconnect();
 if(mode==='cards'){
  fitFlashcard();document.fonts.ready.then(fitFlashcard);
  flashcardObserver=new ResizeObserver(fitFlashcard);
  document.querySelectorAll('.card-face').forEach(face=>flashcardObserver.observe(face));
 }
}
function getOptions(item){if(!session.optionOrders[item.id]){session.optionOrders[item.id]=C.shuffle(item.options.map((_,i)=>i));saveSession();}return session.optionOrders[item.id];}
function rate(status){if(!revealed)return;const id=session.ids[session.index],previous=mark(id,status);session.results.push({id,previous,status,skipped:false});advance();}
function answer(idx){if(selected!==null)return;const item=byId.get(session.ids[session.index]);if(!Number.isInteger(idx)||idx<0||idx>=item.options.length)return;selected=idx;const correct=idx===item.correct,previous=mark(item.id,correct?'known':'learning');session.results.push({id:item.id,previous,status:correct?'known':'learning',correct,choice:idx,skipped:false});session.pending=idx;saveSession();render(false);}
function advance(){session.index++;delete session.pending;revealed=false;selected=null;saveSession();if(session.index>=session.ids.length){view='result';shell();resultPage();window.scrollTo({top:0});}else render();}
function undo(){
 const result=session.results.pop();if(!result)return;
 if(result.previous)progress[result.id]=result.previous;else delete progress[result.id];
 if(!result.skipped){const i=history.findLastIndex(x=>x.id===result.id);if(i!==-1)history.splice(i,1);}
 if(selected===null)session.index=Math.max(0,session.index-1);
 delete session.pending;revealed=mode==='cards';selected=null;persist();saveSession();render();
}
function resultPage(){view='result';const graded=session.results.filter(r=>!r.skipped);const known=graded.filter(r=>mode==='quiz'?r.correct:r.status==='known').length;const skipped=session.results.filter(r=>r.skipped).length;const weak=session.results.filter(r=>!r.skipped&&(mode==='quiz'?(!r.correct||r.status!=='known'):r.status!=='known')).map(r=>byId.get(r.id));$('#main').innerHTML=`<section class="round-result animate-in"><div class="result-art">${icon('check')}</div><p class="eyebrow" style="margin-bottom:15px">${short[subject]} · ${mode==='cards'?'kartičky':'kvíz'}</p><h1>Sada dokončena.</h1><div class="result-stats"><div><strong>${known}<span class="sr-only"> z ${graded.length}</span></strong><span>${mode==='quiz'?'správně':'umím'}</span></div><div><strong>${graded.length-known}</strong><span>${mode==='quiz'?'nesprávně':'ještě ne'}</span></div>${skipped?`<div><strong>${skipped}</strong><span>přeskočeno</span></div>`:''}</div><div class="result-actions">${weak.length?`<button class="primary" data-action="retry-weak">Znovu obtížné (${weak.length}) ${icon('arrow')}</button>`:''}<button class="${weak.length?'outline-button':'primary'}" data-action="exit-session">Zpět na kapitoly</button></div></section>`;}
function progressPage(){
 const total=C.counts(all,progress),today=new Set(history.filter(x=>x.day===localDay()).map(x=>x.id)).size;
 $('#main').innerHTML=`<section class="animate-in"><div class="page-heading"><div><p class="eyebrow">Kartičky & kvízy</p><h1>Tvůj pokrok.</h1></div></div><div class="stats-grid"><div class="stat-box"><strong>${total.known}</strong><span>Umím</span></div><div class="stat-box"><strong>${total.learning}</strong><span>Ještě ne</span></div><div class="stat-box"><strong>${today}</strong><span>Dnes projito</span></div></div><div class="progress-subjects">${['la','ma'].map(s=>`<div class="progress-panel" style="--accent:${s==='la'?'#315b4e':'#805f4c'}"><p class="eyebrow" style="margin-bottom:11px">${short[s]}</p><h2>${names[s]}</h2>${['cards','quizzes'].map(key=>{const items=data[key].filter(x=>x.subject===s),ct=C.counts(items,progress);return `<div class="metric"><div><span>${key==='cards'?'Kartičky':'Kvízy'}</span><small>${ct.known} / ${items.length} umím</small></div><div class="progress-track"><span style="width:${pct(items)}%"></span></div></div>`;}).join('')}</div>`).join('')}</div><div class="backup"><p>Pokrok zůstává v tomto zařízení. Pro přenos nebo bezpečnou zálohu ho ulož do souboru.</p><div class="backup-actions"><button class="outline-button" data-action="export">${icon('download')} Uložit zálohu</button><button class="outline-button" data-action="import">${icon('upload')} Obnovit</button><input class="file-input" id="backup-file" type="file" accept="application/json,.json"></div></div></section>`;
 $('#backup-file').onchange=importFile;
}
function go(target){view=target;const hash=target==='home'?'#':target==='progress'?'#pokrok':`#${subject}`;if(location.hash!==hash)window.history.pushState(null,'',hash);render();}
function render(scroll=true){flashcardObserver?.disconnect();theme();shell();if(view==='home')home();else if(view==='subject')subjectPage();else if(view==='progress')progressPage();else if(view==='study')studyPage();else resultPage();if(scroll)window.scrollTo({top:0});}
let dialogReturn=null;
function showDialog(html){const d=$('#dialog'),wasOpen=d.open,focused=document.activeElement?.dataset?.action;if(!wasOpen)dialogReturn=document.activeElement;d.innerHTML=html;if(!wasOpen)d.showModal();else if(focused)d.querySelector(`[data-action="${focused}"]`)?.focus();}
function closeDialog(){const d=$('#dialog');d.close();dialogReturn?.focus?.();}
function filters(){draft=structuredClone(getFilter());showFilterDialog();}
function showFilterDialog(){const chapters=data.chapters.filter(c=>c.subject===subject);showDialog(`<div class="dialog-head"><h2>Tvůj výběr</h2><button class="icon-button" data-action="close-dialog" aria-label="Zavřít">${icon('close')}</button></div><div class="dialog-body"><input class="search" id="filter-query" type="search" placeholder="Najít pojem…" aria-label="Najít pojem" value="${escape(draft.query)}"><fieldset><legend>Kapitoly <button data-action="toggle-chapters">${draft.chapters.length===chapters.length?'Zrušit výběr':'Vybrat vše'}</button></legend><div class="chapter-options">${chapters.map(c=>`<label class="filter-option"><input type="checkbox" data-filter="chapters" value="${c.id}" ${draft.chapters.includes(c.id)?'checked':''}>${c.number}. ${escape(c.title)}</label>`).join('')}</div></fieldset><fieldset><legend>Typ</legend><div class="filter-options">${Object.entries(types).map(([key,label])=>`<label class="filter-option"><input type="checkbox" data-filter="types" value="${key}" ${draft.types.includes(key)?'checked':''}>${label}</label>`).join('')}</div></fieldset><fieldset><legend>Jak to jde</legend><div class="filter-options">${Object.entries(states).map(([key,label])=>`<label class="filter-option"><input type="checkbox" data-filter="statuses" value="${key}" ${draft.statuses.includes(key)?'checked':''}>${label}</label>`).join('')}</div></fieldset></div><div class="dialog-foot"><button class="text-button" data-action="clear-draft">Obnovit</button><button class="primary" data-action="apply-filters" id="filter-apply"></button></div>`);updateFilterCount();$('#filter-query').oninput=e=>{draft.query=e.target.value;updateFilterCount();};$('#dialog').onchange=e=>{const key=e.target.dataset.filter;if(!key)return;draft[key]=[...$('#dialog').querySelectorAll(`[data-filter="${key}"]:checked`)].map(el=>el.value);updateFilterCount();};}
function updateFilterCount(){const n=C.filter(mode==='cards'?data.cards:data.quizzes,draft,progress).length;$('#filter-apply').textContent=`Zobrazit ${n} ${itemNoun(n,true)}`;}
function about(){showDialog(`<div class="dialog-head"><h2>O Matice</h2><button class="icon-button" data-action="close-dialog" aria-label="Zavřít">${icon('close')}</button></div><div class="dialog-body info"><p>Kartičky a kvízy z tvých dvou skript. U každé odpovědi najdeš odkaz na originál. Důkazy jsou zapsané po hlavních krocích.</p><h3>Lineární algebra 1</h3><p>Libor Barto, Jiří Tůma · verze 30. 9. 2025.<br>Kapitoly 1–7, strany 5–251.<br><a href="skripta_la1.pdf" target="_blank" rel="noopener">Otevřít skripta LA1 ↗</a></p><h3>Matematická analýza I</h3><p>Martin Rmoutil · 3. 10. 2023.<br>Všech 6 kapitol dodaného PDF pro NMTM101.<br><a href="MA1.pdf" target="_blank" rel="noopener">Otevřít skripta MA I ↗</a></p><h3>Na plochu iPhonu</h3><p>V Safari otevři Sdílet → Přidat na plochu. Po prvním načtení lze používat i offline.</p><h3>Pokrok</h3><p>Ukládá se jen v tomto prohlížeči. Mezi zařízeními ho přeneseš přes zálohu v Pokroku. Kartičky a kvízy mají samostatné hodnocení. Filtr „Umím“ vychází z posledního hodnocení.</p><p class="tiny muted">${data.cards.length} karet · ${data.quizzes.length} kvízových otázek · verze 2</p></div>`);}
function exportProgress(){const blob=new Blob([JSON.stringify({app:'matika-mff',version:2,exportedAt:new Date().toISOString(),progress,history},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`matika-pokrok-${localDay()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
async function importFile(e){const file=e.target.files[0];if(!file)return;try{if(file.size>5e6)throw Error('Záloha je příliš velká.');const raw=JSON.parse(await file.text()),incoming=C.validateImport(raw,all.map(x=>x.id));let count=0;for(const [id,v] of Object.entries(incoming)){if(!progress[id]||v.updated>progress[id].updated){progress[id]=v;count++;}}history=C.mergeHistory(history,C.validateHistory(raw.history,all.map(x=>x.id)));persist();render(false);toast(`Záloha načtena. Obnoveno ${count} položek.`);}catch(error){toast(error instanceof SyntaxError?'Soubor není platná JSON záloha.':error.message);}finally{e.target.value='';}}
async function action(e){const el=e.target.closest('[data-action]');if(!el||el.disabled)return;const a=el.dataset.action;
 if(a==='home'){go('home');return;}if(a==='progress'){go('progress');return;}if(a==='about'){about();return;}if(a==='close-dialog'){closeDialog();return;}
 if(a==='subject'){subject=el.dataset.subject;mode='cards';go('subject');return;}
 if(a==='mode'){mode=el.dataset.mode;render(false);return;}
 if(a==='filters'){filters();return;}if(a==='clear-draft'){draft=defaultFilter(subject);showFilterDialog();return;}
 if(a==='toggle-chapters'){const ids=defaultFilter(subject).chapters;draft.chapters=draft.chapters.length===ids.length?[]:ids;showFilterDialog();return;}
 if(a==='apply-filters'){setFilter(draft);closeDialog();render(false);$('[data-action="filters"]')?.focus();return;}
 if(a==='reset-filters'){setFilter(defaultFilter(subject));render(false);return;}
 if(a==='all-chapters'){const f=getFilter();f.chapters=defaultFilter(subject).chapters;setFilter(f);render(false);return;}
 if(a==='chapter'){const f=getFilter();f.chapters=[el.dataset.chapter];setFilter(f);render();return;}
 if(a==='start'){start();return;}
 if(a==='resume'){const s=read(SESSION,null);if(s&&s.ids.every(id=>byId.has(id))){session=s;subject=s.subject;mode=s.mode;selected=s.pending??null;revealed=false;go('study');}return;}
 if(a==='exit-session'){saveSession();go('subject');return;}
 if(a==='flip-card'){if(!e.target.closest('a')&&!window.getSelection()?.toString())flipCard();return;}
 if(a==='rate'){rate(el.dataset.status);return;}
 if(a==='answer'){answer(Number(el.dataset.choice));return;}
 if(a==='next'){if(selected!==null)advance();return;}
 if(a==='confidence'){const id=session.ids[session.index];progress[id].status=el.dataset.status;progress[id].updated=Date.now();session.results[session.results.length-1].status=el.dataset.status;persist();saveSession();render(false);return;}
 if(a==='undo'){undo();return;}
 if(a==='skip'){if(selected!==null)return;session.results.push({id:session.ids[session.index],previous:progress[session.ids[session.index]]?{...progress[session.ids[session.index]]}:null,skipped:true});advance();return;}
 if(a==='shuffle-session'){if(selected!==null){toast('Nejdřív přejdi na další otázku.');return;}session.ids=[...session.ids.slice(0,session.index),...C.shuffle(session.ids.slice(session.index))];revealed=false;saveSession();render();toast('Zbývající položky promíchané.');return;}
 if(a==='retry-weak'){const items=session.results.filter(r=>!r.skipped&&(mode==='quiz'?(!r.correct||r.status!=='known'):r.status!=='known')).map(r=>byId.get(r.id));start(items,false,0);return;}
 if(a==='export'){exportProgress();return;}if(a==='import'){$('#backup-file').click();return;}
}
document.addEventListener('click',action);
$('#dialog').addEventListener('click',e=>{if(e.target===$('#dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog();}});
document.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey||$('#dialog').open||['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(e.target.tagName)||view!=='study')return;
 if(mode==='cards'){if(e.code==='Space'||(e.key==='Enter'&&e.target.closest('.flashcard'))){e.preventDefault();flipCard();}else if(revealed&&['1','2'].includes(e.key)){e.preventDefault();rate(e.key==='2'?'known':'learning');}}
 else if(selected===null&&/^[1-4]$/.test(e.key)){e.preventDefault();const item=byId.get(session.ids[session.index]);answer(getOptions(item)[Number(e.key)-1]);}else if(selected!==null&&e.key==='Enter'){e.preventDefault();advance();}
});
function route(){const hash=location.hash.slice(1);if(hash==='pokrok')view='progress';else if(['la','ma'].includes(hash)){subject=hash;view='subject';}else view='home';render();}
window.addEventListener('popstate',route);window.addEventListener('online',shell);window.addEventListener('offline',shell);route();
if('serviceWorker'in navigator&&location.protocol!=='file:'){navigator.serviceWorker.register('service-worker.js').then(reg=>reg.update()).catch(error=>console.warn('Offline cache:',error.message));}
})();
