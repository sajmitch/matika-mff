/* Pure data rules, shared by the app and tests. */
(function(root){
'use strict';
const STATUS=['new','known','learning'];
function normalize(text){return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function status(progress,id){return progress[id]?.status||'new';}
function filter(items,{subject,chapters=[],types=[],statuses=[],query=''},progress={}){
 const q=normalize(query.trim());
 return items.filter(x=>x.subject===subject&&chapters.includes(x.chapter)&&types.includes(x.type)&&statuses.includes(status(progress,x.id))&&(!q||normalize([x.title,x.question,x.answer,x.explanation].filter(Boolean).join(' ')).includes(q)));
}
function shuffle(items,rng=Math.random){const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
function counts(items,progress){return items.reduce((s,x)=>(s[status(progress,x.id)]++,s),{new:0,known:0,learning:0});}
function validateImport(raw,ids){
 if(!raw||raw.app!=='matika-mff'||raw.version!==2||!raw.progress||Array.isArray(raw.progress)||typeof raw.progress!=='object')throw Error('Tento soubor není záloha této verze Matiky.');
 const allowed=new Set(ids),out={};
 for(const [id,value] of Object.entries(raw.progress)){
  if(!allowed.has(id))continue;
  if(!value||!['known','learning'].includes(value.status)||!Number.isFinite(value.updated)||value.updated<0)throw Error('Záloha obsahuje neplatný záznam.');
  out[id]={status:value.status,updated:value.updated,seen:Math.max(1,Math.min(1000000,Math.floor(Number(value.seen)||1)))};
 }
 if(!Object.keys(out).length&&Object.keys(raw.progress).length)throw Error('Záloha neobsahuje položky této verze.');
 return out;
}
function validateHistory(raw,ids){
 if(!Array.isArray(raw))return [];
 const allowed=new Set(ids),out=[];
 for(const value of raw){
  if(!value||!allowed.has(value.id)||typeof value.day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value.day))continue;
  const date=new Date(`${value.day}T00:00:00.000Z`);
  if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value.day)continue;
  out.push({id:value.id,day:value.day});
 }
 return out.slice(-10000);
}
function mergeHistory(existing,incoming){
 const merged=new Map();
 for(const records of [existing,incoming]){
  const counts=new Map();
  for(const value of records){const key=`${value.day}:${value.id}`;const entry=counts.get(key);if(entry)entry.count++;else counts.set(key,{id:value.id,day:value.day,count:1});}
  for(const [key,value] of counts){if(!merged.has(key)||merged.get(key).count<value.count)merged.set(key,value);}
 }
 const out=[];
 for(const value of [...merged.values()].sort((a,b)=>a.day.localeCompare(b.day)))for(let i=0;i<value.count;i++)out.push({id:value.id,day:value.day});
 return out.slice(-10000);
}
const api={STATUS,normalize,status,filter,shuffle,counts,validateImport,validateHistory,mergeHistory};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MatikaCore=api;
})(typeof window==='undefined'?globalThis:window);
