(function(){
"use strict";
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ================= ROUTER ================= */
const PAGES = ["home","table","media","signup"];
const SUBS = {about:"table", mysterybox:"table", zine:"table", faq:"table", press:"media", social:"media", poster:"media"};
const ALIAS = {table:"about", box:"mysterybox", media:"press", aboutus:"home", share:"zine"};
const SCROLLTO = {aboutus:"story", share:"recipeForm"};
function goTop(){
  const k = (location.hash||"").slice(1), el = SCROLLTO[k] && document.getElementById(SCROLLTO[k]);
  if(el){
    if(k === "share"){ el.hidden = false; const ro = document.getElementById("recipeOpen"); if(ro) ro.setAttribute("aria-expanded","true"); }
    window.scrollTo({top:Math.max(0, el.getBoundingClientRect().top + scrollY - 96), left:0, behavior:"instant"});
  } else window.scrollTo({top:0, left:0, behavior:"instant"});
}
const SUBHEAD = {
  about:{title:"The <em>Christmas Table</em>", sub:"A free multicultural cooking workshop for students who can't get home this Christmas"},
  mysterybox:{title:"Mystery <em>Box</em>", sub:"Cooking by your own way"},
  zine:{title:"Recipe <em>Zine</em>", sub:"Where you find every story behind the dish in a small book"},
  faq:{title:"<em>FAQ</em>", sub:"Our guide to the gathering for you"},
  press:{title:"Media <em>Release</em>", sub:"Our media presence for the distinguished media partner"},
  social:{title:"Social <em>Media</em>", sub:"Our media presence for the distinguished media partner"},
  poster:{title:"Poster and <em>Brochure</em>", sub:"Our media presence for the distinguished media partner"}
};
let onRoute = [];
function route(){
  let id = (location.hash||"").slice(1);
  if(ALIAS[id]) id = ALIAS[id];
  let sub = null;
  if(SUBS[id]){ sub = id; id = SUBS[id]; }
  if(!PAGES.includes(id)) id = "home";
  if(sub){
    const pg = document.getElementById("page-" + id);
    pg.querySelectorAll("[data-sec]").forEach(sec=>sec.hidden = sec.dataset.sec !== sub);
    const h = SUBHEAD[sub];
        pg.querySelector('[data-ph="title"]').innerHTML = h.title;
    pg.querySelector('[data-ph="sub"]').textContent = h.sub;
  }
  document.querySelectorAll(".drop a").forEach(a=>{ if(a.dataset.sub===sub) a.setAttribute("aria-current","true"); else a.removeAttribute("aria-current"); });
  document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active", p.dataset.page===id));
  const hk = (location.hash||"").slice(1);
  const navKey = hk === "aboutus" ? "aboutus" : sub === "faq" ? "faq" : id;
  document.querySelectorAll("video").forEach(v=>{ try{ v.pause(); }catch(e){} });
  document.querySelectorAll("[data-nav]").forEach(a=>{ if(a.dataset.nav===navKey) a.setAttribute("aria-current","page"); else a.removeAttribute("aria-current"); });
  goTop();
  document.querySelectorAll(".has-drop").forEach(d=>{ d.removeAttribute("data-open"); d.querySelector(".drop-t").setAttribute("aria-expanded","false"); if(document.activeElement && d.contains(document.activeElement)) document.activeElement.blur(); });
  onRoute.forEach(fn=>fn(id));
  try{ applyWm(); }catch(e){}
}
const canVT = typeof document.startViewTransition === "function" && !reduce;
if(canVT) document.documentElement.classList.add("vt");
function closeDrops(){ document.querySelectorAll(".has-drop").forEach(d=>{ d.removeAttribute("data-open"); const t = d.querySelector(".drop-t"); if(t) t.setAttribute("aria-expanded","false"); if(document.activeElement && d.contains(document.activeElement)) document.activeElement.blur(); }); }
addEventListener("hashchange", ()=>{
  closeDrops();
  if(canVT){ try{ const t = document.startViewTransition(route); t.finished.then(goTop).catch(()=>{}); return; }catch(e){} }
  route();
});
document.querySelectorAll(".has-drop").forEach(d=>{
  const t = d.querySelector(".drop-t");
  const dropEl = d.querySelector(".drop"), link = d.querySelector(":scope > a");
  function placeDrop(){
    if(innerWidth <= 760){
      const nr = d.closest(".nav").getBoundingClientRect(), lr = link.getBoundingClientRect();
      dropEl.style.left = (lr.left - nr.left) + "px";
      dropEl.style.minWidth = lr.width + "px";
    } else { dropEl.style.left = ""; dropEl.style.minWidth = ""; }
  }
  t.addEventListener("click", ()=>{ const o = !d.hasAttribute("data-open"); placeDrop(); d.toggleAttribute("data-open", o); t.setAttribute("aria-expanded", String(o)); });
  addEventListener("resize", placeDrop);
  d.addEventListener("keydown", e=>{ if(e.key==="Escape"){ d.removeAttribute("data-open"); t.setAttribute("aria-expanded","false"); t.focus(); } });
});
document.addEventListener("click", e=>{ document.querySelectorAll(".has-drop[data-open]").forEach(d=>{ if(!d.contains(e.target)){ d.removeAttribute("data-open"); d.querySelector(".drop-t").setAttribute("aria-expanded","false"); } }); });

/* ================= SEAT DATA (shared) ================= */
const TABLES = ["A","B","C","D","E"], PER = 8;
let takenSeats = new Map(); // seatId -> uid
let myUid = null, mySeat = null;
const seatListeners = [];
function seatsChanged(){ seatListeners.forEach(f=>f()); }

function renderHeroCount(){
  if(!document.getElementById("heroTaken")) return;
  let n = 0; takenSeats.forEach(()=>n++);
  const total = TABLES.length*PER;
  document.getElementById("heroTaken").textContent = Math.min(n,total);
  const dots = document.getElementById("heroDots");
  if(dots.childElementCount !== total){ dots.innerHTML = ""; for(let i=0;i<total;i++) dots.appendChild(document.createElement("i")); }
  [...dots.children].forEach((d,i)=>d.classList.toggle("on", i < n));
}
seatListeners.push(renderHeroCount);
renderHeroCount();

/* ================= 3D TABLE ================= */
function buildScene(){
  const stage = document.getElementById("stage");
  const fb = document.getElementById("stageFallback");
  if(!window.THREE){ fb.hidden = false; fb.textContent = "The 3D table couldn't load here. You can still reserve your seat below."; return; }
  let renderer;
  try { renderer = new THREE.WebGLRenderer({antialias:true, alpha:true}); }
  catch(e){ fb.hidden = false; fb.textContent = "Your browser can't show the 3D table, but there's still a seat for you."; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio||1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 6.6, 13.6);
  camera.lookAt(0, 3.35, 0);

  scene.add(new THREE.HemisphereLight(0xfff4e2, 0x8a6a4a, 0.95));
  const sun = new THREE.DirectionalLight(0xffe2bd, 0.9);
  sun.position.set(4, 9, 6); sun.castShadow = true;
  sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera, {left:-6,right:6,top:6,bottom:-6,near:1,far:25});
  sun.shadow.bias = -0.0008;
  scene.add(sun);
  const glow = {intensity:0};
  const rim = new THREE.SpotLight(0xffb070, 0.9, 16, .55, .6, 1.5);
  rim.position.set(-4, 7, -5); rim.target.position.set(0, 1, 0); scene.add(rim, rim.target);

  const M = (c, o={}) => new THREE.MeshStandardMaterial(Object.assign({color:c, roughness:.7, metalness:0}, o));
  const mat = {
    wood:M(0x4a2014,{roughness:.32, metalness:.05}), woodDark:M(0x2a110a,{roughness:.4}), rug:M(0x173326,{roughness:1}),
    red:M(0xaf2518,{roughness:.4}), gold:M(0xc9973a,{roughness:.22, metalness:.85}),
    white:M(0xf6efe4,{roughness:.18}), leg:M(0x2a110a,{roughness:.35}), pine:M(0x173d2a,{roughness:.8}),
    pine2:M(0x1f4d35,{roughness:.8}), trunk:M(0x3b2416), candle:M(0xf3e7cf,{emissive:0x3a2208, emissiveIntensity:.35}),
    velvet:M(0x3e0a12,{roughness:.95}), linen:M(0xece2d0,{roughness:.85}),
    flame:new THREE.MeshBasicMaterial({color:0xffa31f, toneMapped:false}),
    glass:new THREE.MeshPhysicalMaterial({color:0xffffff, transparent:true, opacity:.35, roughness:.05, metalness:0}),
    orange:M(0xe8772e)
  };

  const root = new THREE.Group(); scene.add(root); root.scale.setScalar(1.34);

  // no floor colour: the table sits straight on the page, only a soft shadow under it
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({opacity:.16}));
  rug.rotation.x = -Math.PI/2; rug.receiveShadow = true; root.add(rug);

  // round table with a red tablecloth
  const TABLE_Y = 1.0;
  const cloth = M(0xa82619,{roughness:.62});
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, .1, 72), cloth);
  top.position.y = TABLE_Y; root.add(top);
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(1.92, 2.02, .62, 72, 1, true), new THREE.MeshStandardMaterial({color:0xa82619, roughness:.62, side:THREE.DoubleSide}));
  skirt.position.y = TABLE_Y-.31; root.add(skirt);
  for(let k=0;k<24;k++){ const a = k/24*Math.PI*2; const fold = new THREE.Mesh(new THREE.CylinderGeometry(.045,.07,.6,8), cloth); fold.position.set(Math.sin(a)*1.99, TABLE_Y-.31, Math.cos(a)*1.99); root.add(fold); }
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(.22, .34, TABLE_Y-.1, 24), mat.wood);
  ped.position.y = (TABLE_Y-.1)/2; root.add(ped);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.75, .85, .08, 32), mat.wood);
  base.position.y = .04; root.add(base);

  // mystery box in the centre
  const box = new THREE.Group(); box.position.y = TABLE_Y+.05; root.add(box);
  const body = new THREE.Mesh(new THREE.BoxGeometry(.62,.46,.62), mat.red); body.position.y = .23; box.add(body);
  const lid = new THREE.Group(); lid.position.y = .46; box.add(lid);
  const lidM = new THREE.Mesh(new THREE.BoxGeometry(.7,.12,.7), mat.red); lidM.position.y = .06; lid.add(lidM);
  [[.12,.48,.635,0],[.635,.48,.12,0]].forEach(([x,y,z])=>{ const s = new THREE.Mesh(new THREE.BoxGeometry(x,y,z), mat.gold); s.position.y=.23; box.add(s); });
  [[.13,.125,.715],[.715,.125,.13]].forEach(([x,y,z])=>{ const s = new THREE.Mesh(new THREE.BoxGeometry(x,y,z), mat.gold); s.position.y=.06; lid.add(s); });
  for(const s of [-1,1]){ const loop = new THREE.Mesh(new THREE.TorusGeometry(.11,.035,10,24), mat.gold); loop.position.set(s*.1,.17,0); loop.rotation.set(0,Math.PI/2,s*.5); lid.add(loop); }
  const peek = [0xe8772e,0x6b8e23,0x7a2e1a,0xf2c14e];
  peek.forEach((c,i)=>{ const p = new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.22,12), M(c)); p.position.set(-.18+i*.12,.5,-.12+((i%2)*.18)); p.rotation.z = (i-1.5)*.25; box.add(p); });

  const flames = [], floaters = [];   // candles switched off

  // chairs around the table + place settings
  const chairs = [], dishList = [], giftList = []; const SEATS = 8, R = 2.5;
  const CHAIR_WOOD = M(0x7a4a3c,{roughness:.55}), CUSHION = 0xe9c9b4;
  const foods = [0x8a4a22,0x6e1f17,0xb5762c,0x4e6b2a,0x5a2e16,0x9c5a24,0x7a2416,0xa8822e];
  for(let i=0;i<SEATS;i++){
    const a = i/SEATS*Math.PI*2 + Math.PI/SEATS;
    const g = new THREE.Group();
    g.position.set(Math.sin(a)*R, 0, Math.cos(a)*R);
    g.lookAt(0,0,0);
    const cushion = M(CUSHION,{roughness:.9});
    const seat = new THREE.Mesh(new THREE.BoxGeometry(.74,.1,.7), CHAIR_WOOD); seat.position.y = .6; g.add(seat);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(.66,.07,.62), cushion); pad.position.y = .68; g.add(pad);
    const back = new THREE.Mesh(new THREE.BoxGeometry(.74,.78,.1), CHAIR_WOOD); back.position.set(0,1.05,-.32); back.rotation.x = -.1; g.add(back);
    const crest = new THREE.Mesh(new THREE.CylinderGeometry(.37,.37,.1,24,1,false,-Math.PI/2,Math.PI), CHAIR_WOOD); crest.rotation.x = Math.PI/2; crest.position.set(0,1.43,-.36); crest.scale.set(1,1,.45); g.add(crest);
    for(const [x,z] of [[-.31,-.28],[.31,-.28],[-.31,.28],[.31,.28]]){
      const l = new THREE.Mesh(new THREE.CylinderGeometry(.045,.035,.6,10), CHAIR_WOOD); l.position.set(x,.3,z); g.add(l);
    }
    g.userData = {index:i, cushion, base:CUSHION};
    root.add(g); chairs.push(g);

    const pr = 1.42;
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(.3,.26,.03,32), mat.white);
    plate.position.set(Math.sin(a)*pr, TABLE_Y+.065, Math.cos(a)*pr); root.add(plate);
    const food = new THREE.Mesh(new THREE.SphereGeometry(.15, 16, 12), M(foods[i],{roughness:.55}));
    food.scale.set(1,.45,1); food.position.set(plate.position.x, TABLE_Y+.11, plate.position.z); root.add(food);
    dishList.push({plate, food});
    const ga = a + .32;
    const glass = new THREE.Group(); glass.position.set(Math.sin(ga)*1.58, TABLE_Y+.05, Math.cos(ga)*1.58); root.add(glass);
    const gf = new THREE.Mesh(new THREE.CylinderGeometry(.06,.07,.015,16), mat.glass); glass.add(gf);
    const gs = new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.16,8), mat.glass); gs.position.y=.085; glass.add(gs);
    const gc = new THREE.Mesh(new THREE.CylinderGeometry(.08,.04,.16,16,1,true), mat.glass); gc.position.y=.24; glass.add(gc);
  }

  // tree + gifts stay put behind the table (only the table turns), so the tree never swings out of frame
  const fixed = new THREE.Group(); scene.add(fixed); fixed.scale.setScalar(1.34);
  const tree = new THREE.Group(); tree.position.set(-1.25, 0, -4.35); fixed.add(tree);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.12,.16,.5,12), mat.trunk); trunk.position.y = .25; tree.add(trunk);
  const tiers = [[1.25,1.5,1.0],[1.0,1.3,1.85],[.7,1.1,2.6],[.42,.8,3.2]];
  tiers.forEach(([r,h,y],i)=>{ const c = new THREE.Mesh(new THREE.ConeGeometry(r,h,20), i%2?mat.pine2:mat.pine); c.position.y = y; tree.add(c); });
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(.2), M(0xc63a2c,{roughness:.35, metalness:.3}));
  star.position.y = 3.75; star.userData.spin = true; tree.add(star);
  let seed = 7; const rnd = ()=> (seed = (seed*9301+49297)%233280)/233280;
  tiers.forEach(([r,h,y])=>{
    for(let k=0;k<7;k++){
      const t = .15 + rnd()*.7; const yy = y - h/2 + t*h; const rr = r*(1-t)+.05; const ang = rnd()*Math.PI*2;
      const o = new THREE.Mesh(new THREE.SphereGeometry(.08,12,10), k%3 ? mat.red : mat.gold);
      o.position.set(Math.sin(ang)*rr, yy, Math.cos(ang)*rr); tree.add(o);
    }
  });
  // gifts under the tree
  [[-.15,-3.95,.42,0xaf2518],[.3,-4.4,.32,0xece2d0],[-2.5,-3.8,.36,0x173d2a]].forEach(([x,z,s,c])=>{
    const gb = new THREE.Mesh(new THREE.BoxGeometry(s,s*.85,s), M(c)); gb.position.set(x, s*.425, z); gb.rotation.y = rnd(); fixed.add(gb);
    const rb = new THREE.Mesh(new THREE.BoxGeometry(s+.01,s*.86,.06), mat.gold); rb.position.copy(gb.position); rb.rotation.y = gb.rotation.y; fixed.add(rb);
    giftList.push({gb, rb});
  });

  fixed.traverse(o=>{ if(o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
  root.traverse(o=>{ if(o.isMesh && o.material !== mat.flame && o !== rug && o.material !== mat.glass){ o.castShadow = true; o.receiveShadow = true; } });
  rug.receiveShadow = true;

  // sizing
  function resize(){
    const w = stage.clientWidth, h = stage.clientHeight;
    if(!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w/h;
    const wide = w/h > 1.25 && w > 860;
    camera.fov = 32;
    root.position.x = 0;
    // fit the whole scene (table, chairs, tree) to whatever shape the stage is
    const tgt = new THREE.Vector3(0, 1.95, -0.8), dir = new THREE.Vector3(0, 4.9, 13.6).normalize();
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov/2)), tanH = tanV*camera.aspect;
    const d = Math.max(3.9/tanH + 2.4, 4.4/tanV + 1.2, 12.5);
    camera.position.copy(tgt).addScaledVector(dir, d);
    camera.lookAt(tgt);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage); resize();

  // interaction
  let rotY = -0.72, targetY = -0.72, tilt = 0, targetTilt = 0;
  let dragging = false, moved = 0, lastX = 0, lastY = 0, idleSince = performance.now();
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  let hovered = null;
  const tip = document.getElementById("tip"), hint = document.getElementById("hint");
  // clickable things in the scene: the gift -> mystery box, the food -> recipe zine, a chair -> sign up
  const targets = [];
  function addTarget(objs, t){ t.objs = objs; targets.push(t); objs.forEach(o=>o.traverse(m=>{ m.userData.tgt = t; })); }
  chairs.forEach(ch=>addTarget([ch], {
    hash:"signup",
    tip:()=> (TABLES.length*PER - takenSeats.size) > 0 ? "Take this seat · sign up" : "Join the waitlist",
    on(){ ch.userData.cushion.color.set(0xaf2518); ch.userData.cushion.emissive.set(0x5a1000); },
    off(){ ch.userData.cushion.color.set(ch.userData.base); ch.userData.cushion.emissive.set(0x000000); }
  }));
  const giftT = {
    hash:"mysterybox", tip:()=> "Open the mystery box",
    on(){ box.scale.setScalar(1.14); giftList.forEach(g=>{ g.gb.material.emissive.set(0x3a1a00); g.gb.position.y += .05; g.rb.position.y += .05; }); },
    off(){ box.scale.setScalar(1); giftList.forEach(g=>{ g.gb.material.emissive.set(0x000000); g.gb.position.y -= .05; g.rb.position.y -= .05; }); }
  };
  addTarget([box, ...giftList.flatMap(g=>[g.gb, g.rb])], giftT);
  const dishT = {
    hash:"zine", tip:()=> "See the recipes in the zine",
    on(){ dishList.forEach(d=>{ d.food.material.emissive.set(0x4a1a00); d.food.position.y += .06; d.plate.position.y += .03; }); },
    off(){ dishList.forEach(d=>{ d.food.material.emissive.set(0x000000); d.food.position.y -= .06; d.plate.position.y -= .03; }); }
  };
  addTarget(dishList.flatMap(d=>[d.plate, d.food]), dishT);
  const pickables = targets.flatMap(t=>t.objs);

  function pick(ev){
    const r = renderer.domElement.getBoundingClientRect();
    ptr.x = ((ev.clientX - r.left)/r.width)*2-1; ptr.y = -((ev.clientY - r.top)/r.height)*2+1;
    ray.setFromCamera(ptr, camera);
    const hits = ray.intersectObjects(pickables, true);
    return hits.length ? hits[0].object.userData.tgt || null : null;
  }
  function setHover(t, ev){
    if(hovered && hovered !== t) hovered.off();
    if(t && hovered !== t) t.on();
    hovered = t;
    if(t){
      const r = stage.getBoundingClientRect();
      tip.style.left = (ev.clientX - r.left)+"px"; tip.style.top = (ev.clientY - r.top)+"px";
      tip.textContent = t.tip();
      tip.classList.add("show"); stage.style.cursor = "pointer";
    } else { tip.classList.remove("show"); stage.style.cursor = ""; }
  }
  const cv = renderer.domElement;
  cv.addEventListener("pointerdown", e=>{ dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY; if(e.pointerType==="mouse") cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", e=>{
    if(dragging){
      const dx = e.clientX-lastX, dy = e.clientY-lastY; moved += Math.abs(dx)+Math.abs(dy);
      targetY += dx*0.009; targetTilt = Math.max(-.12, Math.min(.18, targetTilt + dy*0.002));
      lastX = e.clientX; lastY = e.clientY; idleSince = performance.now();
      if(moved > 6) hint.hidden = true;
    } else if(e.pointerType === "mouse") setHover(pick(e), e);
  });
  cv.addEventListener("pointerup", e=>{
    dragging = false;
    if(moved < 6){ const t = pick(e); if(t){ setHover(t, e); const h = t.hash; setTimeout(()=>{ setHover(null); location.hash = h; }, 260); } }
  });
  cv.addEventListener("pointerleave", ()=>{ if(!dragging) setHover(null); });
  cv.addEventListener("pointercancel", ()=>{ dragging = false; });

  // run only when visible
  let visible = true, onHome = true;
  new IntersectionObserver(es=>{ visible = es[0].isIntersecting; }).observe(stage);
  onRoute.push(id=>{ onHome = id === "home"; if(onHome) resize(); });

  const clock = new THREE.Clock();
  function frame(){
    requestAnimationFrame(frame);
    if(!visible || !onHome) return;
    const t = clock.getElapsedTime();
    if(!reduce && !dragging && performance.now()-idleSince > 2500) targetY += 0.0025;
    rotY += (targetY-rotY)*0.08; tilt += (targetTilt-tilt)*0.08;
    root.rotation.y = rotY; root.rotation.x = tilt; fixed.rotation.x = tilt;
    if(!reduce){
      lid.position.y = .46 + Math.max(0, Math.sin(t*1.6))*.06;
      lid.rotation.z = Math.sin(t*1.6)*.04;
      star.rotation.y = t*.8;
      floaters.forEach(fc=>{ fc.position.y = fc.userData.y + Math.sin(t*.9+fc.userData.ph)*.08; });
      flames.forEach((f,i)=>{ if(f.isLight) f.intensity = .85 + Math.sin(t*11+i)*.08; else f.scale.y = 1 + Math.sin(t*14+i*2)*.12; });
    }
    renderer.render(scene, camera);
  }
  frame();
}


/* hero opener: blurred neon title, then the table comes into focus */
(function(){
  const h = document.getElementById("hero"); if(!h) return;
  const reveal = ()=> h.classList.remove("intro");
  if(reduce){ reveal(); return; }
  setTimeout(reveal, 2300);
  h.addEventListener("pointerdown", reveal, {once:true});
})();

/* media release PDF download (viewer confirms the save) */
(async function(){
  const btn = document.getElementById("relDl"); if(!btn || !window.claude || !claude.use) return;
  const dl = await claude.use("downloads"); if(!dl) return;
  btn.hidden = false;
  btn.addEventListener("click", async ()=>{
    const raw = atob(document.getElementById("relPdf").textContent.trim());
    const bytes = new Uint8Array(raw.length); for(let i=0;i<raw.length;i++) bytes[i] = raw.charCodeAt(i);
    try { await dl.save({filename:"Its-okay-to-miss-home-Media-Release.pdf", data:new Blob([bytes])}); }
    catch(e){ if(e && ["unavailable","not_granted","capability_disabled","capability_removed"].includes(e.code)) btn.hidden = true; }
  });
})();

/* page headings drawn in the Bellaboo lettering (text stays in the page for screen readers) */
/* headings are live Fraunces text now */
function applyWm(){}
/* ================= SIGN-UP FORM ================= */
const form = document.getElementById("form");
const steps = [...form.querySelectorAll("fieldset[data-step]")];
const stepBtns = [...document.querySelectorAll(".steps button")];
const back = document.getElementById("back"), next = document.getElementById("next"), submit = document.getElementById("submit");
const msg = document.getElementById("formMsg");
let step = 0;

function showStep(n){
  step = n;
  steps.forEach((s,i)=>s.hidden = i!==n);
  stepBtns.forEach((b,i)=>{ if(i===n) b.setAttribute("aria-current","step"); else b.removeAttribute("aria-current"); b.classList.toggle("done", i<n); });
  back.hidden = n===0; next.hidden = n===steps.length-1; submit.hidden = n!==steps.length-1;
  const lg = steps[n].querySelector("legend"); if(lg && document.activeElement && form.contains(document.activeElement)) lg.scrollIntoView({block:"nearest"});
}
function validStep(n){
  let ok = true, first = null;
  steps[n].querySelectorAll(".field[data-req]").forEach(f=>{
    const el = f.querySelector("input,select,textarea");
    let good = el.value.trim() !== "";
    if(good && f.hasAttribute("data-email")) good = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim());
    f.classList.toggle("invalid", !good);
    if(!good){ ok = false; first = first || el; }
  });
  if(first) first.focus();
  return ok;
}
next.addEventListener("click", ()=>{ if(validStep(step)) showStep(step+1); });
back.addEventListener("click", ()=>showStep(step-1));
stepBtns.forEach((b,i)=>b.addEventListener("click", ()=>{ if(i<=step){ showStep(i); return; } for(let k=step;k<i;k++){ if(!validStep(k)){ showStep(k); return; } } showStep(i); }));
form.querySelectorAll(".field[data-req] input, .field[data-req] select").forEach(el=>el.addEventListener("input", ()=>el.closest(".field").classList.remove("invalid")));

// conditional fields
form.addEventListener("change", e=>{
  if(e.target.id === "home"){ document.getElementById("homeOtherF").hidden = e.target.value !== "Other"; }
  if(e.target.name === "allergy"){
    const none = form.querySelector('input[name=allergy][value="None"]');
    if(e.target === none && none.checked) form.querySelectorAll('input[name=allergy]').forEach(c=>{ if(c!==none) c.checked=false; });
    else if(e.target !== none && e.target.checked) none.checked = false;
  }
  updateTag();
});
form.addEventListener("input", updateTag);

function val(name){ const el = form.elements[name]; if(!el) return ""; if(el instanceof RadioNodeList){ const c = [...el].find(x=>x.checked); return c ? c.value : ""; } return el.type==="checkbox" ? el.checked : el.value.trim(); }
function vals(name){ return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(c=>c.value); }
function homeVal(){ const h = val("home"); return h === "Other" ? (val("homeOther") || "Somewhere else") : h; }
function seatLabel(s){ return s ? `Table ${s[0]}, seat ${s.slice(1)}` : "We'll find you one"; }
function updateTag(){
  document.getElementById("tagIng").textContent = val("ingredient") || "Your ingredient";
  document.getElementById("tagHome").textContent = homeVal() || "Home";
  const nm = val("pref") || val("first"); document.getElementById("tagName").textContent = nm || "You";
  document.getElementById("tagSeat").textContent = seatLabel(mySeat);
  const av = vals("allergy").filter(a=>a!=="None").concat(vals("diet"));
  const extra = val("allergyOther");
  document.getElementById("tagAvoid").textContent = av.length || extra ? av.concat(extra?[extra]:[]).join(", ") : "Nothing listed";
}

// seat picker
const tablesEl = document.getElementById("tables");
function renderSeats(){
  tablesEl.innerHTML = "";
  TABLES.forEach(T=>{
    const t = document.createElement("div"); t.className = "ttable";
    t.innerHTML = `<div class="top">${T}</div>`;
    for(let i=1;i<=PER;i++){
      const id = T+i, a = (i-1)/PER*Math.PI*2 - Math.PI/2;
      const b = document.createElement("button"); b.type = "button"; b.className = "seat";
      b.style.left = (50 + Math.cos(a)*38)+"%"; b.style.top = (50 + Math.sin(a)*38)+"%";
      const owner = takenSeats.get(id);
      const takenByOther = owner && owner !== myUid;
      if(takenByOther){ b.classList.add("taken"); b.disabled = true; b.setAttribute("aria-label", `Table ${T} seat ${i}, taken`); }
      else { b.setAttribute("aria-label", `Table ${T} seat ${i}`); b.setAttribute("aria-pressed", String(mySeat===id)); b.addEventListener("click", ()=>{ mySeat = mySeat===id ? null : id; renderSeats(); updateTag(); }); }
      t.appendChild(b);
    }
    tablesEl.appendChild(t);
  });
}
seatListeners.push(()=>{ if(mySeat && takenSeats.get(mySeat) && takenSeats.get(mySeat)!==myUid){ mySeat = null; updateTag(); } renderSeats(); });
renderSeats(); updateTag();

/* ================= MYSTERY BOX ================= */
const scene3 = document.getElementById("mboxScene"), mbox = document.getElementById("mbox");
const ctabs = [...document.querySelectorAll(".mcard-t")], panels = [...document.querySelectorAll(".mpanel-card")];
const pClosed = document.getElementById("mpanelClosed"), pNav = document.getElementById("mpanelNav");
let card = 0, boxOpen = false;
function pickCard(i, focus){
  card = (i+4)%4;
  scene3.dataset.card = card;
  if(boxOpen) document.getElementById("mpanel").dataset.card = card;
  ctabs.forEach((t,k)=>{ t.setAttribute("aria-selected", String(k===card)); t.tabIndex = k===card ? 0 : -1; });
  panels.forEach((p,k)=>p.hidden = k!==card);
  if(focus) ctabs[card].focus();
}
function setBox(open){
  boxOpen = open;
  scene3.classList.toggle("open", open);
  mbox.setAttribute("aria-expanded", String(open));
  mbox.setAttribute("aria-label", open ? "Close the mystery box" : "Open the mystery box");
  pClosed.hidden = open; pNav.hidden = !open;
  ctabs.forEach(t=>t.tabIndex = open && t.getAttribute("aria-selected")==="true" ? 0 : -1);
  if(open) pickCard(card); else { panels.forEach(p=>p.hidden = true); delete document.getElementById("mpanel").dataset.card; }
}
mbox.addEventListener("click", ()=>setBox(!boxOpen));
document.getElementById("mboxOpenBtn").addEventListener("click", ()=>setBox(true));
document.getElementById("mboxClose").addEventListener("click", ()=>{ setBox(false); mbox.focus(); });
document.getElementById("cardPrev").addEventListener("click", ()=>pickCard(card-1));
document.getElementById("cardNext").addEventListener("click", ()=>pickCard(card+1));
ctabs.forEach((t,i)=>{
  t.addEventListener("click", ()=>pickCard(i));
  t.addEventListener("keydown", e=>{ if(e.key==="ArrowRight"){ e.preventDefault(); pickCard(card+1,true); } if(e.key==="ArrowLeft"){ e.preventDefault(); pickCard(card-1,true); } });
});
setBox(false);

/* ================= SCHEDULE BOXES ================= */
const aboxes=[...document.querySelectorAll(".abox")], aCount=document.getElementById("adventCount"), aAll=document.getElementById("adventAll");
function aUpdate(){ const n=aboxes.filter(b=>b.classList.contains("open")).length; aCount.textContent=n+" of 6 opened"; aAll.textContent = n===6 ? "Close all" : "Open all six"; }
function aSet(b,open){ b.classList.toggle("open",open); b.querySelector(".abox-btn").setAttribute("aria-expanded",String(open)); }
aboxes.forEach(b=>b.querySelector(".abox-btn").addEventListener("click",()=>{ aSet(b,!b.classList.contains("open")); aUpdate(); }));
aAll.addEventListener("click",()=>{ const all=aboxes.every(b=>b.classList.contains("open")); aboxes.forEach((b,i)=>setTimeout(()=>{ aSet(b,!all); aUpdate(); }, reduce?0:i*120)); });
aUpdate();

/* ================= RECIPE ZINE BOOK ================= */
const book = document.getElementById("book"), leaves = [...book.querySelectorAll(".leaf")];
const pgPrev = document.getElementById("pgPrev"), pgNext = document.getElementById("pgNext"), pgStatus = document.getElementById("pgStatus");
const SPREADS = ["Cover","Pages 2–3","Pages 4–5","Pages 6–7","Back cover"];
let turned = 0;
function setBook(n){
  turned = Math.max(0, Math.min(leaves.length, n));
  leaves.forEach((l,i)=>l.classList.toggle("flipped", i < turned));
  book.dataset.open = String(turned);
  pgPrev.disabled = turned === 0;
  pgNext.disabled = turned === leaves.length;
  pgNext.textContent = turned === 0 ? "Open the zine" : "Next page";
  pgStatus.textContent = SPREADS[turned];
}
pgPrev.addEventListener("click", ()=>setBook(turned-1));
pgNext.addEventListener("click", ()=>setBook(turned+1));
leaves.forEach((l,i)=>l.addEventListener("click", ()=>setBook(l.classList.contains("flipped") ? i : i+1)));
setBook(0);

document.getElementById("zineDl").addEventListener("click", async ()=>{ const btn = document.getElementById("zineDl"); const note = document.getElementById("zineNote"); let dl = null; try{ dl = window.claude && claude.use ? await claude.use("downloads") : null; }catch(e){} if(!dl){ window.open("media/Recipe-Zine.pdf", "_blank", "noopener"); return; } btn.disabled = true; try{ const blob = await (await fetch("media/Recipe-Zine.pdf")).blob(); await dl.save({filename:"Its-okay-to-miss-home-Recipe-Zine.pdf", data:blob}); }catch(e){ if(e && e.code !== "declined"){ note.textContent = "The download couldn't start here. You can still read the zine in the book above."; note.hidden = false; } } finally{ btn.disabled = false; } });
const rForm = document.getElementById("recipeForm"), rOpen = document.getElementById("recipeOpen");
rOpen.addEventListener("click", ()=>{ rForm.hidden = !rForm.hidden; rOpen.setAttribute("aria-expanded", String(!rForm.hidden)); if(!rForm.hidden) document.getElementById("rName").focus(); });
rForm.querySelectorAll("input,textarea").forEach(el=>el.addEventListener("input", ()=>{ const f = el.closest(".field"); if(f) f.classList.remove("invalid"); }));
rForm.addEventListener("submit", async e=>{
  e.preventDefault();
  let ok = true, first = null;
  rForm.querySelectorAll(".field[data-req]").forEach(f=>{
    const el = f.querySelector("input,textarea"); let good = el.value.trim() !== "";
    if(good && f.hasAttribute("data-email")) good = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim());
    f.classList.toggle("invalid", !good); if(!good){ ok = false; first = first || el; }
  });
  if(!ok){ first.focus(); return; }
  const v = id=>document.getElementById(id).value.trim();
  const data = { name:v("rName"), home:v("rHome"), dish:v("rDish"), email:v("rEmail"), recipe:v("rRecipe"), story:v("rStory"), credit:(rForm.querySelector("input[name=rCredit]:checked")||{}).value||"With my name", sentAt:new Date().toISOString() };
  const m = document.getElementById("rMsg"), b = document.getElementById("rSubmit");
  b.disabled = true; b.textContent = "Sending…";
  try{
    if(db && myUid){ await db.doc("recipes/"+myUid).set(data); m.textContent = `Thank you${data.name?", "+data.name:""}. Your ${data.dish} is on its way into the zine. We'll email you if we have questions.`; }
    else { m.textContent = `Thank you${data.name?", "+data.name:""}. Your ${data.dish} is on its way into the zine.`; }
    m.className = "notice ok"; m.hidden = false;
  }catch(err){ m.className = "notice"; m.textContent = "We couldn't send your recipe just now. Check your connection and try again."; m.hidden = false; }
  finally{ b.disabled = false; b.textContent = "Send my recipe"; }
});

/* ================= STORE ================= */
let db = null;
function collect(){
  return {
    first:val("first"), last:val("last"), preferred:val("pref"), email:val("email"),
    gender: val("gender"),
    home: homeVal(), ingredient:val("ingredient"), kind:val("kind"), shelfStable:val("shelf"),
    story:val("story"), cooking:val("cook"), feeling: val("mood") ? Number(val("mood")) : null,
    allergies: vals("allergy"), allergyNotes:val("allergyOther"), diet: vals("diet"),
    seat: mySeat, photos:val("photo"), zine:val("zine"), friend:val("friend"), updates:val("stay"),
    access:val("access"), questions:val("questions"), updatedAt:new Date().toISOString()
  };
}
function fill(d){
  const set = (n,v)=>{ const el = form.elements[n]; if(el && v!=null) el.value = v; };
  set("first",d.first); set("last",d.last); set("pref",d.preferred); set("email",d.email);
  const std = ["Woman","Man","Non-binary","Prefer not to say"];
  if(d.gender && std.includes(d.gender)){ const r = form.querySelector(`input[name=gender][value="${d.gender}"]`); if(r) r.checked = true; }
  const opts = [...form.elements.home.options].map(o=>o.value);
  if(d.home){ if(opts.includes(d.home)) set("home", d.home); else { set("home","Other"); set("homeOther", d.home); document.getElementById("homeOtherF").hidden = false; } }
  set("ingredient", d.ingredient); set("story", d.story); set("allergyOther", d.allergyNotes); set("access", d.access); set("questions", d.questions);
  for(const [n,v] of [["kind",d.kind],["cook",d.cooking],["mood",d.feeling!=null?String(d.feeling):""],["photo",d.photos],["zine",d.zine]]){ const r = v && form.querySelector(`input[name=${n}][value="${v}"]`); if(r) r.checked = true; }
  (d.allergies||[]).forEach(v=>{ const c = form.querySelector(`input[name=allergy][value="${v}"]`); if(c) c.checked = true; });
  (d.diet||[]).forEach(v=>{ const c = form.querySelector(`input[name=diet][value="${v}"]`); if(c) c.checked = true; });
  form.elements.shelf.checked = !!d.shelfStable; form.elements.friend.checked = !!d.friend; form.elements.stay.checked = d.updates !== false;
  mySeat = d.seat || null; renderSeats(); updateTag();
}
function showDone(d){
  document.getElementById("formArea").hidden = true;
  document.getElementById("doneArea").hidden = false;
  document.getElementById("doneText").textContent = `See you at the table on Saturday 12 December, ${d.preferred||d.first}. ${d.seat ? "You're at "+seatLabel(d.seat)+". " : ""}Bring your ${d.ingredient||"ingredient"} with the tag on the right.`;
}
document.getElementById("editAgain").addEventListener("click", ()=>{ document.getElementById("doneArea").hidden = true; document.getElementById("formArea").hidden = false; showStep(0); });

form.addEventListener("submit", async e=>{
  e.preventDefault();
  for(let k=0;k<steps.length;k++){ if(!validStep(k)){ showStep(k); return; } }
  const data = collect();
  msg.hidden = true; submit.disabled = true; submit.textContent = "Saving…";
  try{
    if(db && myUid){
      if(data.seat){
        const owner = takenSeats.get(data.seat);
        if(owner && owner !== myUid){ throw {code:"seat_taken"}; }
      }
      await db.doc("signups/"+myUid).set(data);
      await db.doc("seats/"+myUid).set({seat:data.seat||null, home:data.home, at:data.updatedAt});
    }
    showDone(data);
    if(!db || !myUid){ }
  }catch(err){
    msg.hidden = false; msg.className = "notice";
    msg.textContent = err && err.code === "seat_taken" ? "Someone just took that seat. Pick another one, or skip and we'll seat you." : err && err.code === "quota_exceeded" ? "We've hit our sign-up limit. Please message MUISS and we'll add you to the waitlist." : "We couldn't save your sign-up just now. Check your connection and try again.";
    if(err && err.code === "seat_taken"){ mySeat = null; renderSeats(); updateTag(); }
  }finally{ submit.disabled = false; submit.textContent = "Reserve my seat"; }
});

async function connect(){ /* public copy: nothing is saved */ }

/* boot */
showStep(0);
route();
buildScene();
connect();

/* ================= POSTER 3D + BROCHURE ================= */
(function(){
  const stage = document.getElementById("posterStage"), card = document.getElementById("poster3d");
  if(stage && card){
    let ry = -22, rx = 6, drag = null, idle = 0, t0 = performance.now();
    const set = ()=>{ card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`; };
    function tick(now){
      requestAnimationFrame(tick);
      if(drag || reduce || !stage.offsetParent) return;
      if(now - idle < 1800) return;
      const t = (now - t0)/1000;
      ry += ((Math.sin(t*.6)*28) - ry)*.03; rx += ((5 + Math.sin(t*.9)*3) - rx)*.03; set();
    }
    stage.addEventListener("pointerdown", e=>{ drag = {x:e.clientX, y:e.clientY, ry, rx}; stage.setPointerCapture(e.pointerId); });
    stage.addEventListener("pointermove", e=>{ if(!drag) return; ry = drag.ry + (e.clientX-drag.x)*.6; rx = Math.max(-30, Math.min(30, drag.rx - (e.clientY-drag.y)*.3)); set(); });
    const end = ()=>{ if(!drag) return; drag = null; idle = performance.now(); ry = ((ry % 360) + 540) % 360 - 180; t0 = performance.now() - 1000*Math.asin(Math.max(-1,Math.min(1,ry/28)))/.6; };
    stage.addEventListener("pointerup", end); stage.addEventListener("pointercancel", end);
    set(); requestAnimationFrame(tick);
  }
  const bro = document.getElementById("bro");
  if(!bro) return;
  let st = 0;
  const NAMES = ["About the campaign","How it works","Missing home is part of our story"];
  function show(n){ st = (n+3)%3; bro.dataset.s = st; bro.setAttribute("aria-label", "Tri-fold brochure, showing: " + NAMES[st] + ". Click to turn to the next part."); }
  const scene = document.getElementById("broScene");
  scene.tabIndex = 0;
  scene.addEventListener("click", ()=>show(st+1));
  scene.addEventListener("keydown", e=>{ if(e.key==="Enter" || e.key===" "){ e.preventDefault(); show(st+1); } });
  show(0);
})();
/* poster downloads (viewer confirms the save, same as the media release) */
(async function(){
  const btns = [...document.querySelectorAll(".dl-btn")]; if(!btns.length || !window.claude || !claude.use) return;
  const dl = await claude.use("downloads"); if(!dl) return;
  btns.forEach(btn=>{
    btn.hidden = false;
    btn.addEventListener("click", async ()=>{
      btn.disabled = true;
      try{
        const blob = await (await fetch(btn.dataset.dl)).blob();
        await dl.save({filename:btn.dataset.name, data:blob});
      }catch(e){ if(e && ["unavailable","not_granted","capability_disabled","capability_removed"].includes(e.code)) btns.forEach(b=>b.hidden = true); }
      finally{ btn.disabled = false; }
    });
  });
})();
/* gallery spray-paint reveal, scattered order */
(function(){
  const imgs = [...document.querySelectorAll(".gal2 img")]; if(!imgs.length) return;
  const order = imgs.map((_,i)=>i).sort(()=>Math.random()-.5);
  order.forEach((k,n)=>imgs[k].style.setProperty("--d", (n*0.28)+"s"));
  const run = ()=>imgs.forEach(im=>{ im.classList.remove("sprayed"); void im.offsetWidth; im.classList.add("sprayed"); });
  if(!("IntersectionObserver" in window)){ run(); return; }
  const g = document.querySelector(".gal2"); let shown = false;
  new IntersectionObserver(es=>{ es.forEach(e=>{ if(e.isIntersecting && !shown){ shown = true; run(); } if(!e.isIntersecting && e.boundingClientRect.top > 0) shown = false; }); }, {threshold:.15}).observe(g);
})();
/* gallery carousel */
(function(){
  const car = document.getElementById("galCar"); if(!car) return;
  const slides = [...car.querySelectorAll(".car-slide")], n = slides.length, dotsEl = car.querySelector(".car-dots");
  let i = 0, timer = null;
  const dots = slides.map((_,k)=>{ const b = document.createElement("button"); b.type = "button"; b.setAttribute("aria-label", "Photo " + (k+1)); b.addEventListener("click", ()=>{ go(k); restart(); }); dotsEl.appendChild(b); return b; });
  function go(k){
    i = (k + n) % n;
    slides.forEach((sl, j)=>{ let d = j - i; if(d > n/2) d -= n; if(d < -n/2) d += n; sl.dataset.pos = d === 0 ? "0" : Math.abs(d) >= 2 ? "2" : d < 0 ? "-1" : "1"; sl.setAttribute("aria-hidden", String(d !== 0)); });
    dots.forEach((b, j)=>b.setAttribute("aria-current", String(j === i)));
  }
  function restart(){ clearInterval(timer); if(!reduce) timer = setInterval(()=>{ if(car.offsetParent && !car.matches(":hover")) go(i+1); }, 4000); }
  car.querySelector(".prev").addEventListener("click", ()=>{ go(i-1); restart(); });
  car.querySelector(".next").addEventListener("click", ()=>{ go(i+1); restart(); });
  slides.forEach((sl, j)=>sl.addEventListener("click", ()=>{ if(j !== i){ go(j); restart(); } }));
  let x0 = null;
  car.addEventListener("pointerdown", e=>{ x0 = e.clientX; });
  car.addEventListener("pointerup", e=>{ if(x0 === null) return; const dx = e.clientX - x0; x0 = null; if(Math.abs(dx) > 40){ go(i + (dx < 0 ? 1 : -1)); restart(); } });
  car.addEventListener("keydown", e=>{ if(e.key === "ArrowLeft"){ go(i-1); restart(); } if(e.key === "ArrowRight"){ go(i+1); restart(); } });
  go(0); restart();
})();
/* one video at a time */
document.addEventListener("play", e=>{ document.querySelectorAll("video").forEach(v=>{ if(v !== e.target) v.pause(); }); }, true);
})();

(function(){
function paint(){
  document.querySelectorAll(".page").forEach(pg=>{
    if(pg.querySelector(":scope > .txp-layer")) return;
    const L = document.createElement("i"); L.className = "txp-layer"; L.setAttribute("aria-hidden","true"); pg.prepend(L);
  });
}
if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", paint); else paint();
})();
