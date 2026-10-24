const CACHE='matika-dfcb5af142';
const CORE=["./", "./index.html", "./style.css", "./app.js", "./content.json", "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
const OPTIONAL=["./MA1.pdf", "./skripta_la1.pdf", "./assets/an-definice-13-35012.webp", "./assets/an-definice-13-39839.webp", "./assets/an-definice-15-39770.webp", "./assets/an-definice-15-40063.webp", "./assets/an-definice-15-45282.webp", "./assets/an-definice-15-45575.webp", "./assets/an-definice-19-53471.webp", "./assets/an-definice-19-61573.webp", "./assets/an-definice-20-54459.webp", "./assets/an-definice-20-54910.webp", "./assets/an-definice-20-62787.webp", "./assets/an-definice-20-63237.webp", "./assets/an-definice-21-58924.webp", "./assets/an-definice-21-67739.webp", "./assets/an-definice-27-72859.webp", "./assets/an-definice-27-84616.webp", "./assets/an-definice-28-75026.webp", "./assets/an-definice-28-87238.webp", "./assets/an-definice-32-101684.webp", "./assets/an-definice-32-88165.webp", "./assets/an-definice-35-113042.webp", "./assets/an-definice-35-113569.webp", "./assets/an-definice-35-98176.webp", "./assets/an-definice-35-98725.webp", "./assets/an-definice-38-106639.webp", "./assets/an-definice-38-122770.webp", "./assets/an-definice-39-108123.webp", "./assets/an-definice-39-108562.webp", "./assets/an-definice-39-109109.webp", "./assets/an-definice-39-124345.webp", "./assets/an-definice-39-124991.webp", "./assets/an-definice-39-125568.webp", "./assets/an-definice-4-2.webp", "./assets/an-definice-46-129667.webp", "./assets/an-definice-46-148891.webp", "./assets/an-definice-50-140245.webp", "./assets/an-definice-50-160988.webp", "./assets/an-definice-52-148081.webp", "./assets/an-definice-52-169145.webp", "./assets/an-definice-60-171622.webp", "./assets/an-definice-60-198900.webp", "./assets/an-definice-64-182590.webp", "./assets/an-definice-64-212177.webp", "./assets/an-definice-65-184277.webp", "./assets/an-definice-65-184721.webp", "./assets/an-definice-65-185959.webp", "./assets/an-definice-65-214312.webp", "./assets/an-definice-65-214794.webp", "./assets/an-definice-65-216140.webp", "./assets/an-definice-67-189096.webp", "./assets/an-definice-67-220315.webp", "./assets/an-definice-77-215090.webp", "./assets/an-definice-77-254459.webp", "./assets/an-definice-79-221017.webp", "./assets/an-definice-79-262835.webp", "./assets/an-lemma-2-11.webp", "./assets/an-lemma-3-7.webp", "./assets/an-lemma-4-11.webp", "./assets/an-tvrzení-2-1.webp", "./assets/an-věta-2-10star.webp", "./assets/an-věta-2-13.webp", "./assets/an-věta-2-14.webp", "./assets/an-věta-2-15.webp", "./assets/an-věta-2-18.webp", "./assets/an-věta-2-19.webp", "./assets/an-věta-2-3.webp", "./assets/an-věta-2-3star.webp", "./assets/an-věta-2-4.webp", "./assets/an-věta-3-1.webp", "./assets/an-věta-3-15.webp", "./assets/an-věta-3-16.webp", "./assets/an-věta-3-17.webp", "./assets/an-věta-4-14.webp", "./assets/an-věta-4-16.webp", "./assets/an-věta-4-17.webp", "./assets/an-věta-4-19.webp", "./assets/an-věta-4-20.webp", "./assets/an-věta-4-4.webp", "./assets/an-věta-4-5.webp", "./assets/an-věta-5-10.webp", "./assets/an-věta-5-12.webp", "./assets/an-věta-6-3.webp", "./assets/an-věta-6-4.webp", "./assets/an-věta-6-5.webp"];
self.addEventListener('install',event=>{event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await cache.addAll(CORE);
 await Promise.allSettled(OPTIONAL.map(url=>cache.add(url)));
 await self.skipWaiting();
})())});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
 for(const name of await caches.keys())if(name.startsWith('matika-')&&name!==CACHE)await caches.delete(name);
 await self.clients.claim();
})())});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const hit=await cache.match(event.request,{ignoreSearch:true});
  if(hit)return hit;
  const response=await fetch(event.request);
  if(response.ok && response.status===200)cache.put(event.request,response.clone());
  return response;
 })());
});
