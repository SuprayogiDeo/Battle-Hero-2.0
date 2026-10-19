#!/usr/bin/env node
'use strict';
/* Tes ?cf=1 untuk bangunan (Step 15): eksterior Penginapan desa (b_res1 di titik pintu 200,320) = rumah atlas Cute Fantasy, dan gedung kota (Kafe, Toko Kota, Apartemen)
   = kotak lama yang atap/dinding/jendela/pintunya disusun dari potongan rumah atlas. Mengunci: tanpa flag tidak ada yang berubah, pintu/tabrakan/geometri sama,
   gambar tetap di dalam badan gedung, pintu atlas tepat di petak pintu, papan nama tetap, atlas belum siap -> jalur lama persis. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..'); let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
const atlasMeta = JSON.parse(rd('assets/world/cf_atlas.json')), HOUSE = atlasMeta.entries['decor/House_1_Wood_Base_Blue'];
const settle = async () => { for (let i = 0; i < 6; i++) await new Promise(r => setImmediate(r)); };
function loadCf(search) {
  class Img { set src(v) { this._src = v; Promise.resolve().then(() => this.onload && this.onload()); } get src() { return this._src; } }
  const ctx = vm.createContext({ location: { search }, Image: Img, console, Promise, fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve(atlasMeta) }) });
  vm.runInContext(rd('js/cf.js') + '\n;this.CF=CF;', ctx); return ctx.CF;
}
function recG() { const o = []; let fs_ = ''; return { o, g: { imageSmoothingEnabled: true, set fillStyle(v) { fs_ = v; }, get fillStyle() { return fs_; }, set font(v) { }, get font() { return ''; },
  fillRect(...a) { o.push(['fillRect', fs_, ...a]); }, drawImage(...a) { o.push(['drawImage', ...a.slice(1)]); }, measureText: () => ({ width: 40 }) } }; }

/* ---- 0) data: geometri/pintu tidak berubah ---- */
const src = rd('js/city.js'), B = eval(src.match(/const CITY_B=(\[[\s\S]*?\}\]);/)[1]);
ok(JSON.stringify(B.map(b => [b.id, b.tpl, b.bx, b.by, b.bw, b.bh, b.dx])) === '[["kafe","ccafe",3,2,6,3,5],["toko_kota","cshop",26,2,6,3,28],["apartemen","capt",24,18,7,4,27]]', 'CITY_B (badan SOLID bx,by,bw,bh dan pintu dx) tidak berubah');
const idx = JSON.parse(rd('assets/world/index.json')), inn = idx.objects.filter(o => o.k === 'b_res1'), M = idx.spr.b_res1;
ok(inn.length === 1 && inn[0].x === 200 && inn[0].y === 320 && JSON.stringify(M.door) === '[37,55,13,15]' && M.ax === 43 && M.ay === 73, 'Penginapan di index.json tetap b_res1 (200,320), meta pintu lama utuh');
ok(/\{id:'penginapan',tpl:'inn',x:200,y:320,/.test(rd('js/interior.js')), 'pintu interior Penginapan tetap x:200,y:320');
ok(!/CF\./.test(rd('js/interior.js')) && !/CF\./.test(rd('js/npc.js')), 'interior.js dan npc.js (pintu, logika) tidak menyentuh CF');

(async () => {
  const OFF = loadCf(''), ON = loadCf('?cf=1'); await settle();
  /* ---- 1) Penginapan desa ---- */
  ok(OFF.on === false && OFF.isInn({ k: 'b_res1', x: 200, y: 320 }) === true && OFF.drawInn(recG().g, 100, 100) === false && OFF.drawCityB(recG().g, 0, 0, 192, 96, 64, 6, 3, '#fff') === false, 'flag mati: helper bangunan netral (false, tanpa gambar)');
  ok(ON.INN_AT.x === 200 && ON.INN_AT.y === 320, 'titik pintu Penginapan di cf.js = interior.js');
  ok(ON.isInn({ k: 'b_res1', x: 200, y: 320 }) && !ON.isInn({ k: 'b_res1', x: 192, y: 208 }) && !ON.isInn({ k: 'b_res3', x: 200, y: 320 }) && !ON.isInn({ k: 'b_toko', x: 320, y: 320 }) && !ON.isInn(null), 'hanya b_res1 di (200,320) yang diganti; rumah warga lain tidak');
  const r = recG(); ok(ON.ready() && ON.drawInn(r.g, 400, 700) === true && r.o.length === 1, 'drawInn: satu gambar atlas');
  const d = r.o[0]; ok(d[1] === HOUSE.x && d[2] === HOUSE.y && d[3] === 96 && d[4] === 128 && d[7] === 192 && d[8] === 256, 'sumber = House_1 96x128 di atlas, skala 2x');
  ok(d[5] + 40 * 2 === 400, 'tengah pintu atlas (x 40) tepat di titik kaki sprite lama (sama dengan tengah pintu lama, ax 43)');
  ok(d[6] + 112 * 2 === 700 - 6 && d[6] + 111 * 2 + 2 === 700 - 6, 'dasar pintu atlas (y 112) 6 px layar di atas titik kaki, seperti pintu lama (y 70 dari 73)');
  ok(ON.INN_R.door[0] + ON.INN_R.door[2] / 2 === 40 && ON.INN_R.w === 96 && ON.INN_R.h === 128, 'meta papan nama: pintu rumah atlas di x 40');
  const tm = rd('js/tilemap.js'); ok(/CF\.on && CF\.isInn\(o\) && CF\.ready\(\)/.test(tm) && /wallName\(o\.k\)/.test(tm.slice(tm.indexOf('CF.isInn'), tm.indexOf('CF.isInn') + 400)), 'tilemap.js: hanya saat flag hidup + atlas siap; papan nama dinding tetap dipasang');

  /* ---- 2) gedung kota: jalankan cityDrawB asli di vm ---- */
  const fn = src.slice(src.indexOf('function cityDrawB'), src.indexOf('\n}\n', src.indexOf('function cityDrawB')) + 3);
  function run(CF, b, cx, cy) { const rr = recG(), ctx = vm.createContext({ g: rr.g, CF, WS: 32, OX: 0, VW: 640, wL: (a) => a, T: (t, x, y) => rr.o.push(['T', t, x, y]), Math });
    vm.runInContext(fn + '\n;this.f=cityDrawB;', ctx); ctx.f(b, cx, cy); return rr.o; }
  const sign = o => o.filter(a => a[0] === 'T').length, signBox = o => o.filter(a => a[0] === 'fillRect' && a[1] === '#f4ecd0').length;
  B.forEach(b => {
    const cx = b.bx * 32 - 100, cy = 0, x = 100, y = b.by * 32, w = b.bw * 32, h = b.bh * 32, dx = b.dx * 32 - cx;
    const legacy = run(OFF, b, cx, cy), cf = run(ON, b, cx, cy);
    ok(legacy.filter(a => a[0] === 'drawImage').length === 0 && legacy.length > 15, b.id + ': flag mati = gambar kotak lama (tanpa drawImage)');
    const di = cf.filter(a => a[0] === 'drawImage'); ok(di.length > 20 && di.every(a => a[1] >= HOUSE.x && a[1] + a[3] <= HOUSE.x + 96 && a[2] >= HOUSE.y && a[2] + a[4] <= HOUSE.y + 128), b.id + ': flag hidup memakai potongan atlas');
    ok(di.every(a => a[5] >= x && a[5] + a[7] <= x + w && a[6] >= y && a[6] + a[8] <= y + h), b.id + ': semua potongan di dalam badan gedung (tidak keluar dari kotak tabrakan ' + w + 'x' + h + ')');
    const door = di.filter(a => a[3] === 16 && a[4] === 26); ok(door.length === 1 && door[0][1] === HOUSE.x + 32 && door[0][2] === HOUSE.y + 86 && door[0][5] === dx && door[0][6] === y + h - 52 && door[0][7] === 32 && door[0][8] === 52, b.id + ': pintu atlas tepat di petak pintu dx=' + b.dx + ', dasar di dasar gedung');
    const wins = di.filter(a => a[3] === 12 && a[4] === 14); ok(wins.length >= b.bw - 3 && wins.every(a => Math.abs(a[5] + 12 - dx - 16) > 48), b.id + ': ' + wins.length + ' jendela, tidak ada yang menutup pintu');
    ok(sign(cf) === 1 && signBox(cf) === 1 && sign(legacy) === 1 && signBox(legacy) === 1, b.id + ': papan nama tetap digambar (satu teks, satu kotak) di kedua mode');
    ok(cf.some(a => a[0] === 'fillRect' && a[1] === '#1c1a24' && a[2] === x - 2 && a[3] === y - 2 && a[4] === w + 4 && a[5] === h + 4), b.id + ': bingkai gelap ukuran badan tetap');
    // geser kamera: posisi layar bergeser sama persis
    const cf2 = run(ON, b, cx + 7, 5).filter(a => a[0] === 'drawImage'); ok(cf2.length === di.length && cf2.every((a, i) => a[5] === di[i][5] - 7 && a[6] === di[i][6] - 5), b.id + ': posisi mengikuti kamera');
  });
  // atlas belum siap / gagal: jatuh ke jalur lama persis
  const notReady = { on: true, ready: () => false, drawCityB: () => false };
  ok(JSON.stringify(run(notReady, B[0], B[0].bx * 32 - 100, 0)) === JSON.stringify(run(OFF, B[0], B[0].bx * 32 - 100, 0)), 'flag hidup tapi atlas belum siap: gedung digambar persis seperti lama');
  const cs = rd('js/city.js'); ok(/CF\.on&&CF\.ready\(\)&&CF\.drawCityB\(/.test(cs) && !/CF\./.test(cs.replace(/CF\.on&&CF\.ready\(\)&&CF\.drawCityB\([^)]*\)/, '')), 'city.js hanya menyentuh CF di cityDrawB');
  // apartemen (bh 4) punya atap dua baris, kafe/toko satu baris
  const roofRows = b => run(ON, b, b.bx * 32 - 100, 0).filter(a => a[0] === 'drawImage' && a[3] === 16 && a[4] === 16).length / b.bw;
  ok(roofRows(B[0]) === 1 && roofRows(B[2]) === 2, 'atap: satu baris genting (tinggi 3 petak), dua baris (tinggi 4 petak)');
  console.log('PASS: bangunan ?cf=1 — Penginapan + gedung kota (' + n + ' pemeriksaan)');
})().catch(e => { console.error(e && e.stack || e); process.exit(1); });
