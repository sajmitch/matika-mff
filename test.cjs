process.chdir(__dirname);
const fs=require('fs'),assert=require('node:assert/strict'),katex=require('./katex.js');
const C=require('./core.js');
const data=JSON.parse(fs.readFileSync('./content.json','utf8'));
const chapters=new Map(data.chapters.map(x=>[x.id,x])),ids=new Set(),questions=new Map();let formulas=0;const errors=[];
for(const [kind,items] of [['card',data.cards],['quiz',data.quizzes]])for(const x of items){
 try{
 assert(!ids.has(x.id),`duplicate ID ${x.id}`);ids.add(x.id);
 assert(chapters.has(x.chapter),`unknown chapter ${x.id}`);assert.equal(chapters.get(x.chapter).subject,x.subject);
 assert(['definition','theorem','proof','method','example'].includes(x.type),`bad type ${x.id}`);
 assert(x.question?.trim(),`missing question ${x.id}`);
 assert(x.source&&Number.isInteger(x.source.page)&&x.source.page>0&&x.source.page<=(x.subject==='la'?251:87),`bad source page ${x.id}`);
 assert(!/\b(věta|větu|tvrzení|definice|definici)\s+\d+\.\d+/i.test(x.question),`number prompt ${x.id}`);
 const norm=C.normalize(x.question).replace(/\s+/g,' ').trim();if(questions.has(norm))throw Error(`duplicate question ${x.id} / ${questions.get(norm)}`);questions.set(norm,x.id);
 if(kind==='quiz'){assert(x.options.length>=3);assert.equal(new Set(x.options.map(s=>C.normalize(s))).size,x.options.length,`duplicate options ${x.id}`);assert(Number.isInteger(x.correct)&&x.correct>=0&&x.correct<x.options.length);assert(x.explanation?.trim());}else assert(x.answer?.trim());
 for(const text of [x.question,x.answer,x.explanation,...(x.options||[])].filter(Boolean)){
  assert(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text),`control character ${x.id}`);
  const matches=[...text.matchAll(/\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$/g)];
  const residue=text.replace(/\$\$[\s\S]*?\$\$|\$[^$\n]+\$/g,'');assert(!residue.includes('$'),`unmatched $ ${x.id}`);
  for(const m of matches){katex.renderToString(m[1]??m[2],{throwOnError:true,strict:'error'});formulas++;}
 }
 }catch(e){errors.push(`${x.id}: ${e.message}`);}
}
assert.equal(data.chapters.filter(c=>c.subject==='la').length,7);assert.equal(data.chapters.filter(c=>c.subject==='ma').length,6);
const sample=[{id:'a',subject:'la',chapter:'la-1',type:'definition',question:'Inverzní matice'},{id:'b',subject:'la',chapter:'la-2',type:'proof',question:'Důkaz'},{id:'c',subject:'ma',chapter:'ma-1',type:'definition',question:'Matice'}];
const f={subject:'la',chapters:['la-1','la-2'],types:['definition','proof'],statuses:['new','known','learning'],query:''};
assert.deepEqual(C.filter(sample,f,{a:{status:'known'}}).map(x=>x.id),['a','b']);
assert.deepEqual(C.filter(sample,{...f,statuses:['new']},{a:{status:'known'}}).map(x=>x.id),['b']);
assert.deepEqual(C.filter(sample,{...f,query:'inverzni'}).map(x=>x.id),['a']);
for(const k of ['chapters','types','statuses'])assert.equal(C.filter(sample,{...f,[k]:[]}).length,0);
assert.deepEqual(C.counts(sample,{a:{status:'known'},b:{status:'learning'}}),{new:1,known:1,learning:1});
const shuffled=C.shuffle(sample,()=>.4);assert.equal(new Set(shuffled.map(x=>x.id)).size,3);assert.deepEqual(sample.map(x=>x.id),['a','b','c']);
assert.deepEqual(C.validateImport({app:'matika-mff',version:2,progress:{a:{status:'known',updated:1},bogus:{status:'known',updated:2}}},['a']),{a:{status:'known',updated:1,seen:1}});
assert.throws(()=>C.validateImport({app:'matika-mff',version:2,progress:{a:{status:'bad',updated:1}}},['a']));
assert.throws(()=>C.validateImport({app:'other'},['a']));
const allAssets=['index.html','style.css','math.css','katex.js','core.js','app.js','content.json','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','apple-touch-icon.png','skripta_la1.pdf','MA1.pdf'];for(const file of allAssets)assert(fs.existsSync('./'+file));
assert(!/url\(fonts\//.test(fs.readFileSync('./math.css','utf8')),'external font reference');
console.log(JSON.stringify({cards:data.cards.length,quizzes:data.quizzes.length,chapters:data.chapters.length,formulas,errors,pureRules:'passed',assets:'passed'},null,2));if(errors.length)process.exitCode=1;
