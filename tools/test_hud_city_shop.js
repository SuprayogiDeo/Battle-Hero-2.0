#!/usr/bin/env node
'use strict';
/* Audit HUD Kota, interior kota, dan menu toko (Toko Kota, kedai Kafe/Penginapan) di portrait dan landscape.
   Area ketuk DIUKUR dengan menyentuh langsung (pindai 0.5 px logis) lalu dikali skala layar s; syarat >= 44 px layar.
   Profil: portrait s=.60 (384 px), .64 (412 px), .67 (430 px); landscape s=.85, 1, 1.2. Portrait HP < 384 px ditutup #rotateNotice (index.html). */
const fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8'), rj = f => JSON.parse(rd(f));
const head = rd('tools/test_browser_smoke.js'); const hs = head.slice(0, head.indexOf('assert.ok(vm.runInContext("typeof Save.readMain'));
const mod = { exports: {} }; new Function('require', '__dirname', 'module', hs + '\nmodule.exports={context,vm};')(require, path.join(root, 'tools'), mod);
const { context, vm } = mod.exports, ev = c => vm.runInContext(c, context, { timeout: 5000 }), run = k => { for (let i = 0; i < k; i++) ev('updWorld(.1)'); };
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const SC = [.6, .64, .67, .85, 1, 1.2], MIN = 43.5, ZV = [.9, 1, 1.1];
const setS = s => ev('cv.getBoundingClientRect=()=>({left:0,top:0,width:' + 640 * s + ',height:' + 360 * s + '})');
const span = (probe, lo, hi) => { let c = 0; for (let v = lo; v < hi; v += .5) if (probe(v)) c += .5; return c; };
const circ = (c, r) => { const x = Math.max(r.x, Math.min(c.cx, r.x + r.w)), y = Math.max(r.y, Math.min(c.cy, r.y + r.h)); return (x - c.cx) ** 2 + (y - c.cy) ** 2 < c.r * c.r; };
const M = rj('assets/world/mi_interior.json'), MC = rj('assets/world/mi_chars.json');
context.fetch = u => Promise.resolve({ ok: true, json: () => Promise.resolve(/mi_interior/.test(u) ? M : /mi_chars/.test(u) ? MC : null) });

// ---------- A) menu toko: Toko Kota (8 barang) dan kedai Kafe (6 masakan) ----------
ev("var __c={back:0,buy:[],up:0,down:0};goBack=function(){__c.back++};cshopBuy=function(id){__c.buy.push(id)};innBuy=function(id){__c.buy.push(id)};sfx=function(){};S.set.lang='id'");
const menus = [['cshop', 'cshopClick', 'CSHOP_ITEMS.length', "st='cshop'", 'cshopScroll'], ['inn', 'innClick', 'LIFE_RECIPES.length', "st='inn';innV='cafe'", 'innScroll']];
SC.forEach(s => { setS(s); menus.forEach(([nm, click, tot, setup, scr]) => { ev(setup); const T = ev(tot), LY = ev('shopLay(' + T + ')'), tag = ` (${nm}, s=${s})`;
  ok(LY.p * s >= 43.99 && LY.t * s >= 43.99 - 1e-9, 'selang baris dan satuan sentuh >= 44 px' + tag);
  ok(62 + (LY.n - 1) * LY.p + 42 <= 360 && (!LY.ctl || 62 + LY.n * LY.p <= LY.ctl) && (!LY.ctl || LY.ctl + 28 <= 360), 'baris + kontrol di dalam kanvas, tidak bertumpuk' + tag);
  ok(LY.n >= 1 && (LY.n === T || LY.ctl > 0), 'semua baris tampil, atau ada kontrol gulir' + tag);
  // KEMBALI: tinggi dan lebar
  ev('__c.back=0'); ok(span(y => { ev('__c.back=0'); ev(`${click}(40,${y})`); return ev('__c.back') > 0 }, 0, 360) * s >= MIN, 'tinggi area KEMBALI >= 44 px' + tag);
  ok(span(x => { ev('__c.back=0'); ev(`${click}(${x},10)`); return ev('__c.back') > 0 }, 0, 640) * s >= MIN, 'lebar area KEMBALI >= 44 px' + tag);
  // BELI tiap baris terlihat: tinggi dan lebar, terpisah antar baris
  for (let i = 0; i < LY.n; i++) { const cy = 62 + i * LY.p + 21, id = () => ev('__c.buy.join()');
    ev('__c.buy=[]'); ev(`${click}(550,${cy})`); const mine = id(); ok(mine !== '' && mine.indexOf(',') < 0, 'baris ' + i + ' dapat dibeli di tengahnya' + tag);
    const hit = (x, y) => { ev('__c.buy=[]'); ev(`${click}(${x},${y})`); return id() === mine }, h = span(y => hit(550, y), 0, 360), w = span(x => hit(x, cy), 0, 640);
    ok(h * s >= MIN && w * s >= MIN, `BELI baris ${i}: ${(h * s).toFixed(1)}x${(w * s).toFixed(1)} px >= 44` + tag); ok(h <= LY.p + .5, 'area BELI tidak menimpa baris lain' + tag); }
  // gulir ▲▼
  if (LY.ctl) { ev(`${scr}=${nm === 'cshop' ? 1 : 1}`); const probe = (x, y) => { ev(`${scr}=1`); ev(`${click}(${x},${y})`); return ev(scr); };
    ok(span(y => probe(40, y) === 0, 0, 360) * s >= MIN, '▲ tinggi >= 44 px' + tag); ok(span(x => probe(x, LY.ctl + 5) === 0, 0, 640) * s >= MIN, '▲ lebar >= 44 px' + tag);
    ok(span(y => probe(120, y) === 2, 0, 360) * s >= MIN, '▼ tinggi >= 44 px' + tag); ok(span(x => probe(x, LY.ctl + 5) === 2, 0, 640) * s >= MIN, '▼ lebar >= 44 px' + tag);
    // semua baris terjangkau lewat gulir
    ev(`${scr}=0`); for (let i = 0; i < T; i++) ev(`${click}(120,${LY.ctl + 5})`); ok(ev(scr) === T - LY.n, 'gulir ke bawah mencapai baris terakhir' + tag); ev(`${scr}=0`); }
  assert.doesNotThrow(() => { ev('draw()'); ['id', 'en'].forEach(l => { ev(`S.set.lang='${l}'`); ev('draw()'); }); ev("S.set.lang='id'"); }); n++; }); });

// ---------- B) HUD Kota (wC) dan interior kota (wI) ----------
ev("S.world={x:126*32+16,y:23*32+24};best=10;st='world';wI=null;wC=null;wFade=null;wTalk=null;wDlg=0;lifeWorldQuick=false;hudEnsure();lifeHour=()=>9;location.search='?mi=0';S.set.lang='id'");
const C = rj('assets/world/city/city.json'), chunks = C.chunks.map(c => rj('assets/world/city/' + c.file)), CT = rj('assets/world/city/city_tiles.json');
ev(`cityInstall(${JSON.stringify(C)},${JSON.stringify(chunks)},${JSON.stringify(CT)})`);
ev('wInteract()'); run(8); ok(ev('!!wC'), 'masuk kota');
ev("var __act=0,__tog=0,__map=0,__hc=hudCtx;jrToggleFocus=function(){__tog++};hbOpenWorldMap=function(){__map++}");
function audit(where) { SC.forEach(s => { setS(s); [0, 1, 2].forEach(ui => { ev('S.set.ui=' + ui); const z = ZV[ui], L = ev('hudLayout()'), tag = ` (${where}, s=${s}, ui=${ui})`, hbW = 7 * L.step + L.slot, r = Math.max(30 * z, L.hit / 2);
  // tombol aksi (disentuh): tinggi dan lebar
  ev("hudCtx=function(){return{l:'X',on:1,f:function(){__act++}}}");
  ok(span(y => { ev('__act=0;hudSw=null'); ev(`hudDown(1,592,${y})`); return ev('__act') > 0 }, 0, 360) * s >= MIN, 'tinggi tombol aksi >= 44 px' + tag);
  ok(span(x => { ev('__act=0;hudSw=null'); ev(`hudDown(1,${x},${L.ay})`); return ev('__act') > 0 }, 0, 640) * s >= MIN, 'lebar tombol aksi >= 44 px' + tag); ev('hudCtx=__hc;hudSw=null');
  // slot hotbar tengah (slot 3)
  const first = L.left + L.slot / 2, c3 = first + 3 * L.step, slot3 = (x, y) => { ev('hudSw=null'); ev(`hudDown(1,${x},${y})`); return ev('hudSw&&hudSw.slot') === 3 };
  ok(span(y => slot3(c3, y), 0, 360) * s >= MIN && span(x => slot3(x, L.centerY), 0, 640) * s >= MIN, 'slot hotbar 3 >= 44 px' + tag); ev('hudSw=null');
  // visual: hotbar tidak menimpa tombol aksi, semuanya di dalam kanvas
  ok(L.left >= -1e-6 && L.left + hbW <= 640 + 1e-6 && L.y >= 0 && L.y + L.slot <= 360, 'hotbar di dalam kanvas' + tag);
  ok(!circ({ cx: 592, cy: L.ay, r }, { x: L.left, y: L.y, w: hbW, h: L.slot }), 'hotbar tidak menimpa tombol aksi' + tag);
  if (where === 'kota') { const f = ev('jrFocusRect()'), mm = { x: 4, y: 4, w: 100 * z, h: 76 * z };
    ok(!circ({ cx: 592, cy: L.ay, r }, f) && !circ({ cx: 592, cy: L.ay, r }, mm), 'minimap dan FOKUS tidak menimpa tombol aksi' + tag);
    ok(f.y + f.h <= L.y - 2 || f.x + f.w <= L.left || f.x >= L.left + hbW, 'FOKUS tidak menimpa hotbar' + tag);
    ok(span(y => { ev('__map=0'); ev(`hudDown(1,20,${y})`); return ev('__map') > 0 }, 0, 120) * s >= MIN, 'area ketuk minimap >= 44 px' + tag);
    ev('S.journal.fmin=0'); ok(span(y => { ev('__tog=0'); ev(`hudDown(1,${f.x + 10},${y})`); return ev('__tog') > 0 }, 0, 360) * s >= MIN, 'area ketuk FOKUS >= 44 px' + tag); } }); }); }
audit('kota');
// interior: masuk Kafe lewat pintu asli
const B = ev('CITY_B.map(b=>({id:b.id,tpl:b.tpl,bx:b.bx,by:b.by,bh:b.bh,dx:b.dx}))');
for (const b of B) { ev(`wC.x=${b.dx}*32+16;wC.y=${b.by + b.bh}*32+26;wC.near=cityNear()`); ev('hudCtx().f()'); run(10); ok(ev('!!wI') && ev('wI.b.id') === b.id, 'masuk ' + b.id);
  if (b.id === 'kafe') { audit('interior-kafe');
    // label aksi interior muat lingkaran terkecil (9 px monospace 0.6 em, r = 27)
    ev("S.set.lang='id'"); const objs = ev('wI.room.objs.filter(o=>o.act).map(o=>o.lab)'); ['id', 'en'].forEach(l => { ev(`S.set.lang='${l}'`); objs.forEach(lab => { const t = ev(`intLabel(${JSON.stringify(lab)})`); ok(t.length * 9 * .6 <= 2 * 27 - 6, `label interior "${t}" (${l}) muat tombol aksi`); }); }); ev("S.set.lang='id'"); }
  ev('wI.x=wI.room.sx;wI.y=wI.room.sy;wI.near=intNear()'); ev('hudCtx().f()'); run(10); ok(ev('wI') === null && ev('!!wC'), 'keluar ' + b.id); }
console.log(`PASS: audit HUD Kota/interior kota/menu toko, portrait + landscape, area ketuk >= 44 px layar (${n} pemeriksaan)`);
