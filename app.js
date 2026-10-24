/* Matika — local-first offline-capable study app. No trackers, no accounts, no backend. */
'use strict';
const $=sel=>document.querySelector(sel);
const STORAGE_KEY='matika-progress-v2';
const SETTINGS_KEY='matika-settings-v2';
const ALL_TYPES=['definice','vety','tvrzeni','dukazy','priklady'];
const TYPE_NAMES={definice:'Definice',vety:'Věty',tvrzeni:'Tvrzení',dukazy:'Důkazy',priklady:'Příklady'};
const icons={home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',cards:'<rect x="5" y="4" width="15" height="17" rx="2"/><path d="M2 7V5a2 2 0 0 1 2-2h12M9 10h7M9 14h7"/>',quiz:'<path d="M9 12 11 14 15 10"/><rect x="3" y="3" width="18" height="18" rx="3"/>',stats:'<path d="M4 20V10M10 20V4M16 20v-8M22 20V7"/>',sliders:'<path d="M4 7h16M4 17h16M9 4v6M16 14v6"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',check:'<path d="m5 12 4 4 10-10"/>',close:'<path d="M18 6 6 18M6 6l12 12"/>'};
function ico(k,size=20){return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[k]||icons.arrow}</svg>`}
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const nfmt=n=>Number(n).toLocaleString('cs-CZ');
const safePDF=(c)=>{const source=DATA.sources.find(s=>s.id===c.subject);return `./${encodeURIComponent(source.pdf)}#page=${Number(c.page)}`};
const prefersReduced=()=>window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clone=v=>JSON.parse(JSON.stringify(v));
function getStored(key,fallback){try{return JSON.parse(localStorage.getItem(key))||clone(fallback)}catch(_){return clone(fallback)}}
let DATA={cards:[],quizzes:[],sources:[]};
let progress=getStored(STORAGE_KEY,{cards:{},quizzes:{},history:{},totalAnswers:0});
let settings=getStored(SETTINGS_KEY,{subject:'an',chapters:{an:[],la:[]},types:[...ALL_TYPES],status:'all',quizSize:15});
let view='home',overlay=null,zoomSrc=null,session=null,mcqAnswer=null,studyRevealed=false,toastTimer=null;
let draft=null;
function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(progress))}catch(_){toast('Úložiště je plné. Exportuj si pokrok.')}}
function persistSettings(){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings))}catch(_){}}
function remember(card, value, isQuiz=false){
 const collection=isQuiz?progress.quizzes:progress.cards;
 const prev=collection[card]||{attempts:0,correct:0};
 const knew=value==='know';
 collection[card]={status:value,attempts:prev.attempts+1,correct:prev.correct+(knew?1:0),last:new Date().toISOString()};
 const day=new Date().toISOString().slice(0,10);
 if(!progress.history)progress.history={};
 progress.history[day]=(progress.history[day]||0)+1;
 progress.totalAnswers=(progress.totalAnswers||0)+1;
 persist();
}
function statusFor(id,quiz=false){return (quiz?progress.quizzes:progress.cards)?.[id]?.status||'new'}
function chaptersFor(sub){return DATA.sources.find(s=>s.id===sub)?.chapters||[]}
function allowed(c,isQuiz=false,opts=settings){
 if(opts.subject!=='both'&&opts.subject!==c.subject)return false;
 if(!opts.types.includes(c.type))return false;
 const chapters=opts.chapters[c.subject]||[];
 if(chapters.length&&!chapters.includes(c.chapter))return false;
 const st=statusFor(c.id,isQuiz);
 return opts.status==='all'||(opts.status==='new'?st==='new':opts.status==='know'?st==='know':st==='repeat');
}
function filtered(kind){return DATA[kind].filter(c=>allowed(c,kind==='quizzes'))}
function shuffle(input){const arr=[...input];for(let i=arr.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}return arr}
function toast(s){document.querySelector('.toast')?.remove();const node=document.createElement('div');node.className='toast';node.textContent=s;document.body.appendChild(node);clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.remove(),2600)}
function titleForSub(sub){return sub==='an'?'Analýza':sub==='la'?'LA1':'Oba předměty'}
function subChoices(){return `<div class="subject-tabs" role="group" aria-label="Výběr předmětu">${[['an','Analýza'],['la','LA1'],['both','Mix obou']].map(([id,label])=>`<button class="tab ${settings.subject===id?'active':''}" data-action="subject" data-id="${id}" aria-pressed="${settings.subject===id}">${label}</button>`).join('')}</div>`}
function topbar(){return `<header class="topbar"><a href="#home" class="brand" data-action="navigate" data-id="home"><span class="brand-mark">m</span><span>matika<span style="color:#a4acaa">.</span></span></a><button class="subtle-action" data-action="settings">Záloha ↗</button></header>`}
function navigation(){return `<nav class="bottom-nav" aria-label="Hlavní navigace">${[['home','Domů','home'],['study','Kartičky','cards'],['quiz','Kvíz','quiz'],['stats','Pokrok','stats']].map(([id,label,ic])=>`<button data-action="navigate" data-id="${id}" class="nav-item ${view===id?'active':''}" aria-current="${view===id?'page':'false'}"><span class="nav-dot">${ico(ic)}</span>${label}</button>`).join('')}</nav>`}
function home(){
 const known=DATA.cards.filter(c=>statusFor(c.id)==='know').length;
 const total=DATA.cards.length;
 const pct=total?Math.round(known/total*100):0;
 const subj=(id)=>DATA.cards.filter(c=>c.subject===id).length;
 return `<div class="hero"><div class="eyebrow">TVŮJ MALÝ STUDIJNÍ PROSTOR</div><h1>Matika, trochu<br><i>po svém.</i></h1><p>Dva předměty. Jedna klidnější cesta skrz skripta.</p></div>
 <div class="sectiontitle"><h2>Co se dnes naučíme?</h2><span class="small-muted">Vyber předmět</span></div>
 <div class="subject-grid">
 <button class="subject-tile analysis" data-action="choose-study" data-id="an"><span class="tile-arrow">↗</span><span class="tile-symbol">∫</span><span class="tile-bottom"><strong>Matematická<br>analýza</strong><span>${DATA.sources.find(s=>s.id==='an').chapters.length} kapitol · ${nfmt(subj('an'))} kartiček</span></span></button>
 <button class="subject-tile algebra" data-action="choose-study" data-id="la"><span class="tile-arrow">↗</span><span class="tile-symbol">⊕</span><span class="tile-bottom"><strong>Lineární<br>algebra 1</strong><span>${DATA.sources.find(s=>s.id==='la').chapters.length} kapitol · ${nfmt(subj('la'))} kartiček</span></span></button></div>
 <div class="welcome-card"><div class="welcome-icon">✦</div><div style="flex:1"><strong>Po malých krocích</strong><p>Nejdřív si projdi kartičky. Až budeš chtít, vyzkoušej se z nich v kvízu.</p></div></div>
 <div class="sectiontitle" style="margin-top:27px"><h2>Tvůj přehled</h2><button class="mini-action" data-action="navigate" data-id="stats">Detail →</button></div>
 <div class="panel"><div class="row"><span class="progress-num">${pct}<span style="font-size:24px"> %</span></span><span class="small-muted">${nfmt(known)} / ${nfmt(total)} umím</span></div><div class="bar" style="margin:14px 0"><span style="width:${pct}%"></span></div><span class="small-muted">Pokrok se ukládá na tomto zařízení.</span></div>
 <p class="source-intro">Obsah vychází pouze ze dvou přiložených skript. U každé položky najdeš původní stránku; v případě nejasného matematického zápisu má přednost PDF.</p>`;
}
function filterSummary(){const ch=settings.subject==='both'?([...settings.chapters.an,...settings.chapters.la].length? 'Vybrané kapitoly':'Všechny kapitoly'):(settings.chapters[settings.subject].length?`${settings.chapters[settings.subject].length} vybr. kapitol`:'Všechny kapitoly');const t=settings.types.length===5?'Všechny typy':`${settings.types.length} typů`;return `${ch} · ${t}`}
function preSessionPage(kind){const isQuiz=kind==='quiz', eligible=filtered(isQuiz?'quizzes':'cards');
 return `<div class="page-header"><div class="eyebrow">${isQuiz?'OTESTUJ, CO VÍŠ':'UČ SE VLASTNÍM TEMPEM'}</div><h1>${isQuiz?'Malý test.':'Kartičky.'}</h1><p>${isQuiz?'Doplň formulaci, vyřeš příklad nebo si zkus důkaz. Pak se ohodnoť.':'Nejdřív odpověz v hlavě. Pak otoč kartu a označ, co už umíš.'}</p></div>
 ${subChoices()}
 <div class="sectiontitle"><h2>Co si projít?</h2><span class="small-muted">${nfmt(eligible.length)} ${isQuiz?'otázek':'kartiček'}</span></div>
 <button class="filter-trigger" data-action="filters"><span>Výběr kapitol a filtrů<br><span class="small-muted">${filterSummary()}</span></span><span>${ico('sliders',20)}</span></button>
 <div class="sectiontitle"><h2>Typ látky</h2></div><div class="chiprow">${ALL_TYPES.map(t=>`<button class="chip ${settings.types.includes(t)?'selected':''}" data-action="toggle-type" data-id="${t}" aria-pressed="${settings.types.includes(t)}">${TYPE_NAMES[t]}</button>`).join('')}</div>
 <div class="sectiontitle" style="margin-top:26px"><h2>Podle toho, co umíš</h2></div><div class="chiprow">${[['all','Všechno'],['new','Nové'],['repeat','K opakování'],['know','Umím']].map(([id,label])=>`<button class="chip ${settings.status===id?'soft-selected':''}" data-action="status-filter" data-id="${id}" aria-pressed="${settings.status===id}">${label}</button>`).join('')}</div>
 ${isQuiz?`<div class="sectiontitle" style="margin-top:24px"><h2>Otázek v jedné sérii</h2></div><div class="chiprow">${[10,15,30,0].map(n=>`<button class="chip ${Number(settings.quizSize??15)===n?'selected':''}" data-action="quiz-size" data-id="${n}">${n||'Všechny'}</button>`).join('')}</div>`:''}
 <div style="margin:33px 0 5px"><button class="primary-btn" data-action="begin" data-id="${kind}" ${eligible.length?'':'disabled'}>${isQuiz?'Spustit kvíz':'Jdu na kartičky'} ${ico('arrow',17)}</button></div>
 <p class="hint">Náhodné pořadí, bez opakování v jedné sérii. ${isQuiz?'Výběrové možnosti jsou úryvky ze skript. Důkazy a příklady si zkusíš i sama.':'Odpovědi si hodnotíš sama podle originálu.'}</p>`;
}
function sourceLink(c){return `<span class="source-link">Zdroj · strana ${Number(c.page)}</span>`}
function cardAnswer(c){const img=c.image?`<img class="source-img" data-action="zoom" src="./${escapeHTML(c.image)}" alt="Přesný výřez ze skript, strana ${c.page}" loading="lazy"/>`:'';
 const text=`<div class="answer-body ${c.subject==='an'?'source-text':''}">${escapeHTML(c.answer)}</div>`;
 return `${c.subject==='an'&&img?`<div class="small-muted" style="margin-top:15px">Přesné znění ve skriptech</div>${img}<details><summary class="mini-action">Strojový přepis (může zkreslit vzorce)</summary>${text}</details>`:text}${sourceLink(c)}`;
}
function studyPage(){if(!session||session.kind!=='study')return preSessionPage('study');
 const id=session.ids[session.index],c=DATA.cards.find(c=>c.id===id);
 if(!c)return completion('study');
 const st=statusFor(c.id), pct=Math.round((session.index+1)/session.ids.length*100);
 return `<div class="page-header"><div class="eyebrow">${titleForSub(c.subject)} · ${c.chapter}. kapitola</div><h1 style="font-size:29px;margin-bottom:6px">${escapeHTML(c.chapterTitle)}</h1></div>
 <div class="count-line"><span>${session.index+1} z ${session.ids.length}</span><span>${studyRevealed?'Odpověď':'Otázka'}</span></div><div class="bar"><span style="width:${pct}%"></span></div>
 <div class="card-stage"><div class="flashcard ${studyRevealed?'revealed':''}" tabindex="0" role="button" data-action="flip" aria-label="${studyRevealed?'Kartička s odpovědí':'Otočit kartičku'}">
 <div class="card-kicker"><span>${escapeHTML(c.label)}</span><span style="font-size:17px;color:#b1bcaf">✳</span></div>
 ${studyRevealed?`<div style="width:100%">${cardAnswer(c)}</div>`:`<h2 class="card-title">${escapeHTML(c.question)}</h2>`}
 <div class="card-bottom"><span>${studyRevealed?'Označ si, jak to šlo':'Klepni a otoč'}</span><span>${st==='know'?'✓ Umím':st==='repeat'?'↻ Opakovat':'○ Nová'}</span></div></div></div>
 ${studyRevealed?`<div class="status-buttons"><button class="no" data-action="grade-study" data-id="repeat">↻ Ještě neumím</button><button class="yes" data-action="grade-study" data-id="know">✓ Umím</button></div>`:`<button class="primary-btn" data-action="flip">Ukázat odpověď</button>`}
 <div class="stack-ctrl"><button data-action="prev" ${session.index<=0?'disabled':''}>← Zpět</button><button data-action="quit">Ukončit sérii</button><button data-action="next">Přeskočit →</button></div>`;
}
function quizPage(){if(!session||session.kind!=='quiz')return preSessionPage('quiz');
 const id=session.ids[session.index],q=DATA.quizzes.find(q=>q.id===id);
 if(!q)return completion('quiz');
 const c=DATA.cards.find(c=>c.id===q.card);const pct=Math.round((session.index+1)/session.ids.length*100);
 if(q.format==='recall'){
  return `<div class="page-header"><div class="eyebrow">KVÍZ · ${titleForSub(q.subject)}</div><h1 style="font-size:30px">Zkus to sama.</h1></div>
  <div class="count-line"><span>Otázka ${session.index+1} / ${session.ids.length}</span><span>${escapeHTML(TYPE_NAMES[q.type])}</span></div><div class="bar"><span style="width:${pct}%"></span></div>
  <div class="quiz-q"><div class="eyebrow">${escapeHTML(q.chapterTitle)}</div><h2>${escapeHTML(q.question)}</h2><span class="small-muted">Nejdřív si odpověz. Klidně na papír.</span></div>
  ${studyRevealed?`<div class="panel">${cardAnswer(c)}</div><div class="status-buttons"><button class="no" data-action="grade-recall" data-id="repeat">↻ Procvičit</button><button class="yes" data-action="grade-recall" data-id="know">✓ Umím</button></div>`:`<button class="primary-btn" data-action="reveal-recall">Ukázat řešení ${ico('arrow',17)}</button>`}
  <div class="stack-ctrl"><button data-action="next">Přeskočit →</button><button data-action="quit">Ukončit sérii</button></div>`;
 }
 const status=mcqAnswer;
 return `<div class="page-header"><div class="eyebrow">KVÍZ · ${titleForSub(q.subject)}</div><h1 style="font-size:30px">Jeden po druhém.</h1></div>
 <div class="count-line"><span>Otázka ${session.index+1} / ${session.ids.length}</span><span>${escapeHTML(TYPE_NAMES[q.type])}</span></div><div class="bar"><span style="width:${pct}%"></span></div>
 <div class="quiz-q"><div class="eyebrow">${escapeHTML(q.chapterTitle)}</div><h2>${escapeHTML(q.question)}</h2><div class="small-muted">Vyber jednu možnost</div></div>
 <div class="options">${q.options.map((o,j)=>`<button class="option ${status?(o.id===q.correct?'correct':status===o.id?'wrong':''):''}" data-action="answer-quiz" data-id="${escapeHTML(o.id)}" ${status?'disabled':''} aria-label="Možnost ${j+1}"><span class="opt-letter">${'ABCD'[j]}</span><span class="opt-text">${escapeHTML(o.text)}</span></button>`).join('')}</div>
 ${status?`<div class="result-note"><strong>${status===q.correct?'Správně!':'Tentokrát ne.'}</strong><p>${escapeHTML(c.answer)}</p>${c.image?`<img class="source-img" data-action="zoom" src="./${escapeHTML(c.image)}" alt="Originální stránka skript" loading="lazy"/>`:''}${sourceLink(c)}</div><div class="status-buttons"><button class="no" data-action="grade-quiz" data-id="repeat">↻ Procvičit</button><button class="yes" data-action="grade-quiz" data-id="know">✓ Umím</button></div><button class="primary-btn" data-action="next">Další otázka ${ico('arrow',17)}</button>`:''}
 <div class="stack-ctrl"><button data-action="next">Přeskočit →</button><button data-action="quit">Ukončit sérii</button></div>`;
}
function completion(kind){const isQuiz=kind==='quiz';let answered=0,correct=0;for(const id of session?.ids||[]){const p=(isQuiz?progress.quizzes:progress.cards)[id];if(p){answered++;if(p.status==='know')correct++}}
 return `<div class="end"><div class="end-symbol">✳</div><div class="eyebrow">HOTOVO</div><h2>Pro dnešek dobrá práce.</h2><p>Prošla jsi celou vybranou sadu, bez opakování položek.</p><div class="stat-grid"><div class="stat-box"><strong>${session.ids.length}</strong><span>${isQuiz?'otázek':'kartiček'} v sérii</span></div><div class="stat-box"><strong>${correct}</strong><span>označeno „umím“</span></div></div><button class="primary-btn" data-action="restart">Nová série ${ico('arrow',18)}</button><div style="height:10px"></div><button class="secondary-btn" style="width:100%" data-action="quit">Zpět k výběru</button></div>`;
}
function stats(){const known=DATA.cards.filter(c=>statusFor(c.id)==='know').length,repeat=DATA.cards.filter(c=>statusFor(c.id)==='repeat').length;
 const answered=DATA.cards.filter(c=>statusFor(c.id)!=='new').length;return `<div class="page-header"><div class="eyebrow">TVŮJ TEMPO</div><h1>Pokrok.</h1><p>Nejde o známky. Jen přehled, co už máš v hlavě.</p></div>
 <div class="stat-grid"><div class="stat-box"><strong>${nfmt(known)}</strong><span>Kartiček umím</span></div><div class="stat-box"><strong>${nfmt(repeat)}</strong><span>Chci opakovat</span></div><div class="stat-box"><strong>${nfmt(answered)}</strong><span>Kartiček prohlédnuto</span></div><div class="stat-box"><strong>${nfmt(progress.totalAnswers||0)}</strong><span>Celkem hodnocení</span></div></div>
 ${DATA.sources.map(source=>{
 const local=DATA.cards.filter(c=>c.subject===source.id),lk=local.filter(c=>statusFor(c.id)==='know').length,p=Math.round(lk/local.length*100);
 return `<div class="sectiontitle" style="margin-top:25px"><h2>${source.name}</h2><span class="small-muted">${p} %</span></div><div class="bar"><span style="width:${p}%"></span></div><div class="panel">${source.chapters.map(ch=>{
 const cs=local.filter(c=>c.chapter===ch.id),done=cs.filter(c=>statusFor(c.id)==='know').length;
 return `<div class="chapter-row"><span class="chapter-number">${ch.id}</span><span class="chapter-copy"><strong>${escapeHTML(ch.name)}</strong><span>${done} / ${cs.length} umím</span></span><div class="bar"><span style="width:${cs.length?Math.round(done/cs.length*100):0}%"></span></div></div>`;
 }).join('')}</div>`;
 }).join('')}
 <button class="secondary-btn" style="width:100%" data-action="settings">Exportovat / importovat pokrok</button><p class="footnote">Data jsou uložená v úložišti této aplikace na daném zařízení. Nemusí se přenést do jiného telefonu ani mezi Safari a samostatně přidanou aplikací.</p>`;
}
function filterSheet(){if(!draft)draft=clone(settings);const subjects=draft.subject==='both'?DATA.sources:DATA.sources.filter(s=>s.id===draft.subject);
 return `<div class="modal-backdrop" data-action="close-backdrop"><div class="sheet" role="dialog" aria-modal="true" aria-label="Výběr filtrů"><div class="row"><h2 class="sheet-title">Tvůj výběr</h2><button class="round-close" data-action="close-modal" aria-label="Zavřít">×</button></div>
 ${subjects.map(s=>`<div class="sheet-section"><div class="row"><strong>${s.name}</strong><button class="mini-action" data-action="all-chapters" data-id="${s.id}">${(draft.chapters[s.id]||[]).length?'Vybrat všechny':'Všechny vybrány'}</button></div><div class="chiprow">${s.chapters.map(ch=>`<button class="chip ${(draft.chapters[s.id]||[]).includes(ch.id)?'selected':''}" data-action="chapter" data-id="${s.id}:${ch.id}">${ch.id}. ${escapeHTML(ch.name)}</button>`).join('')}</div></div>`).join('')}
 <div class="sheet-section"><div class="row"><strong>Typ karet</strong><button class="mini-action" data-action="all-types">Všechny</button></div><div class="chiprow">${ALL_TYPES.map(t=>`<button class="chip ${draft.types.includes(t)?'selected':''}" data-action="draft-type" data-id="${t}">${TYPE_NAMES[t]}</button>`).join('')}</div></div>
 <div class="sheet-section"><strong>Co chceš opakovat?</strong><div class="chiprow" style="margin-top:10px">${[['all','Všechno'],['new','Nové'],['repeat','K opakování'],['know','Umím']].map(([id,label])=>`<button class="chip ${draft.status===id?'soft-selected':''}" data-action="draft-status" data-id="${id}">${label}</button>`).join('')}</div></div>
 <div class="sheet-footer"><button class="primary-btn" data-action="apply-filters">Použít filtry ${ico('arrow',16)}</button></div></div></div>`;
}
function settingsSheet(){return `<div class="modal-backdrop" data-action="close-backdrop"><div class="sheet" role="dialog" aria-modal="true" aria-label="Záloha pokroku"><div class="row"><h2 class="sheet-title">Tvoje data</h2><button class="round-close" data-action="close-modal" aria-label="Zavřít">×</button></div>
 <p class="small-muted" style="line-height:1.6">Pokrok se ukládá pouze v tomto prohlížeči nebo v aplikaci přidané na plochu. Pro přenos do jiného zařízení vyexportuj zálohu.</p>
 <div class="setting-list" style="margin-top:24px"><button class="secondary-btn" data-action="export">↓ Exportovat JSON</button><button class="secondary-btn" data-action="import">↑ Importovat JSON</button></div>
 <input type="file" id="backup-file" accept="application/json,.json" style="display:none" aria-label="Soubor se zálohou"/>
 <hr class="separator"/><div class="row"><span class="small-muted">Smazání pokroku na tomto zařízení</span><button class="mini-action" data-action="reset" style="color:#a46a64">Vymazat</button></div>
 <hr class="separator"/><p class="footnote">Neobsahuje žádné účty ani reklamní sledování. Zdrojové PDF jsou přiložené; při nejasnosti automatického přepisu rozhoduje originální stránka.</p></div></div>`}
function empty(){return `<div class="no-data"><h3>Pro tenhle výběr nic není.</h3><p>Uprav kapitoly nebo typy karet.</p><button class="secondary-btn" data-action="filters">Změnit filtry</button></div>`}
function render(){const root=$('#app');if(!root)return;let content='';if(view==='home')content=home();else if(view==='study')content=session?.kind==='study'?studyPage():preSessionPage('study');else if(view==='quiz')content=session?.kind==='quiz'?quizPage():preSessionPage('quiz');else content=stats();root.innerHTML=`<main class="app">${topbar()}${content}${navigation()}</main>${overlay==='filters'?filterSheet():overlay==='settings'?settingsSheet():''}${zoomSrc?`<div class="zoom"><button data-action="unzoom">Zavřít ✕</button><img alt="Přiblížené znění skript" src="${escapeHTML(zoomSrc)}"/></div>`:''}`;}
function resetSession(){session=null;mcqAnswer=null;studyRevealed=false}
function go(to){view=to;resetSession();overlay=null;render();window.scrollTo(0,0)}
function begin(kind){const pool=filtered(kind==='quiz'?'quizzes':'cards');if(!pool.length){toast('Pro tento výběr nic není.');return}session={kind,ids:shuffle(pool.map(c=>c.id)).slice(0,kind==='quiz'&&Number(settings.quizSize??15)>0?Number(settings.quizSize??15):undefined),index:0};mcqAnswer=null;studyRevealed=false;view=kind;render();window.scrollTo(0,0)}
function next(){if(!session)return;session.index++;studyRevealed=false;mcqAnswer=null;render();window.scrollTo(0,0)}
function prev(){if(!session)return;session.index=Math.max(0,session.index-1);studyRevealed=false;mcqAnswer=null;render()}
function handleAction(action,id,el){
 switch(action){
 case 'navigate':go(id);return;
 case 'choose-study':settings.subject=id;settings.chapters[id]=[];persistSettings();go('study');return;
 case 'subject':settings.subject=id;persistSettings();render();return;
 case 'toggle-type':settings.types=settings.types.includes(id)?settings.types.filter(x=>x!==id):[...settings.types,id];persistSettings();render();return;
 case 'status-filter':settings.status=id;persistSettings();render();return;
 case 'quiz-size':settings.quizSize=Number(id);persistSettings();render();return;
 case 'filters':draft=clone(settings);overlay='filters';render();return;
 case 'settings':overlay='settings';render();return;
 case 'close-modal':overlay=null;render();return;
 case 'close-backdrop':if(el.classList.contains('modal-backdrop')){overlay=null;render()}return;
 case 'chapter':{const [sub,num]=id.split(':'),ch=Number(num),all=chaptersFor(sub).map(x=>x.id);let selected=[...draft.chapters[sub]];selected=selected.includes(ch)?selected.filter(x=>x!==ch):[...selected,ch];draft.chapters[sub]=(!selected.length||selected.length===all.length)?[]:selected;render();return}
 case 'all-chapters':draft.chapters[id]=[];render();return;
 case 'all-types':draft.types=[...ALL_TYPES];render();return;
 case 'draft-type':draft.types=draft.types.includes(id)?draft.types.filter(x=>x!==id):[...draft.types,id];render();return;
 case 'draft-status':draft.status=id;render();return;
 case 'apply-filters':settings=clone(draft);overlay=null;persistSettings();render();return;
 case 'begin':begin(id);return;
 case 'flip':studyRevealed=!studyRevealed;render();return;
 case 'grade-study':if(session&&session.kind==='study'){remember(session.ids[session.index],id);next()}return;
 case 'reveal-recall':studyRevealed=true;render();return;
 case 'grade-recall':if(session&&session.kind==='quiz'){const q=DATA.quizzes.find(q=>q.id===session.ids[session.index]);remember(q.id,id,true);remember(q.card,id,false);next()}return;
 case 'answer-quiz':if(session&&!mcqAnswer){mcqAnswer=id;const q=DATA.quizzes.find(q=>q.id===session.ids[session.index]);remember(q.id,id===q.correct?'know':'repeat',true);render()}return;
 case 'grade-quiz':if(session&&session.kind==='quiz'){const q=DATA.quizzes.find(q=>q.id===session.ids[session.index]);remember(q.card,id,false);if(progress.quizzes[q.id]){progress.quizzes[q.id].status=id;persist()}next()}return;
 case 'next':next();return;
 case 'prev':prev();return;
 case 'quit':resetSession();render();window.scrollTo(0,0);return;
 case 'restart':begin(view);return;
 case 'zoom':zoomSrc=el.getAttribute('src');render();return;
 case 'unzoom':zoomSrc=null;render();return;
 case 'export':exportData();return;
 case 'import':$('#backup-file')?.click();return;
 case 'reset':if(confirm('Opravdu vymazat veškerý pokrok z tohoto zařízení?')){progress={cards:{},quizzes:{},history:{},totalAnswers:0};persist();resetSession();overlay=null;render();toast('Pokrok vymazán.')}return;
 }
}
function exportData(){const dump=JSON.stringify({app:'matika',formatVersion:2,exportedAt:new Date().toISOString(),progress},null,2);const blob=new Blob([dump],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`matika-zaloha-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);toast('Záloha připravena ke stažení.');}
async function importData(file){if(!file)return;try{const raw=await file.text();if(raw.length>15e6)throw Error('Soubor je příliš velký');const d=JSON.parse(raw);if(d.app!=='matika'||!d.progress||typeof d.progress.cards!=='object'||typeof d.progress.quizzes!=='object')throw Error('Tohle není platná záloha Matiky.');if(!confirm('Nahradit současný pokrok obsahem zálohy?'))return;
 progress={cards:d.progress.cards,quizzes:d.progress.quizzes,history:d.progress.history||{},totalAnswers:Number(d.progress.totalAnswers)||0};persist();overlay=null;resetSession();render();toast('Záloha byla obnovena.');}catch(e){alert('Import se nezdařil: '+e.message)}}
function eventBindings(){document.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(!el)return;if(el.closest('a[href]'))return;const action=el.dataset.action;if(action==='flip'&&e.target.closest('a,button,details,img'))return;handleAction(action,el.dataset.id,el)});document.addEventListener('change',e=>{if(e.target.id==='backup-file')importData(e.target.files?.[0])});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(overlay||zoomSrc)){zoomSrc=null;overlay=null;render()}else if((e.key==='Enter'||e.key===' ')&&e.target.classList?.contains('flashcard')){e.preventDefault();studyRevealed=!studyRevealed;render()}});}
async function boot(){eventBindings();try{const r=await fetch('./content.json',{cache:'no-cache'});if(!r.ok)throw Error('Data se nepodařilo načíst.');DATA=await r.json();if(!DATA.cards?.length||!DATA.sources?.length)throw Error('Chybí učební materiály.');for(const source of DATA.sources){const valid=new Set(source.chapters.map(ch=>ch.id));settings.chapters[source.id]=(settings.chapters[source.id]||[]).filter(id=>valid.has(id));}persistSettings();render();if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./service-worker.js',{scope:'./'}).catch(()=>{});}catch(e){$('#app').innerHTML=`<div class="app"><div class="page-header"><h1>Ach, něco se nenačetlo.</h1><p>${escapeHTML(e.message)}</p><p>Otevři aplikaci přes GitHub Pages nebo místní HTTP server, ne přímo jako soubor.</p></div></div>`}}
boot();
