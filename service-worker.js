const CACHE='matika-v2-20261024-flip-questions';
const ASSETS=['./','./index.html','./style.css','./math.css','./katex.js','./core.js','./app.js','./content.json','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./skripta_la1.pdf','./MA1.pdf'];
self.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(ASSETS.map(url=>new Request(url,{cache:'reload'})));await self.skipWaiting();})());});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('matika-')&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();})());});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{
   const response=await fetch(request);
   if(response.ok&&response.status===200&&!request.headers.has('range')){
    // A full cache must not discard a successful network response.
    try{await cache.put(request,response.clone());}catch{}
   }
   return response;
  }catch{
   const hit=await cache.match(request,{ignoreSearch:true});
   if(hit){
    const range=request.headers.get('range');
    const match=range&&url.pathname.endsWith('.pdf')?/^bytes=(\d*)-(\d*)$/.exec(range):null;
    // Unknown or multipart ranges can use the intact full response.
    if(match&&(match[1]||match[2])){
     const buffer=await hit.arrayBuffer(),length=buffer.byteLength;
     const first=match[1]?Number(match[1]):null,last=match[2]?Number(match[2]):null;
     const start=first===null?Math.max(0,length-last):first;
     const end=first===null||last===null?length-1:Math.min(last,length-1);
     if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>end||start>=length){
      return new Response(null,{status:416,headers:{'Content-Range':`bytes */${length}`,'Accept-Ranges':'bytes'}});
     }
     return new Response(buffer.slice(start,end+1),{status:206,headers:{'Content-Type':'application/pdf','Content-Range':`bytes ${start}-${end}/${length}`,'Content-Length':String(end-start+1),'Accept-Ranges':'bytes'}});
    }
    return hit;
   }
   if(request.mode==='navigate')return await cache.match('./index.html')||Response.error();
   return Response.error();
  }
 })());
});
