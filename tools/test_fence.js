#!/usr/bin/env node
'use strict';
/* Pagar desa utama + kota (Batch 9B-39): assets/world/fences.json dari tools/build_fences.py,
   sprite fence_wood.png (PetalByte). Memeriksa data, rute tidak terpotong, kolisi/gambar runtime
   (menjalankan js/tilemap.js sungguhan di vm dengan stub), cache, dan dokumen lisensi. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert');
const root = path.resolve(__dirname, '..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const rj = (p) => JSON.parse(rd(p));
let n = 0;
const ok = (c, m) => { n++; assert.ok(c, m); };

/* 1. sprite */
const spr = fs.readFileSync(path.join(root, 'assets/world/fence_wood.png'));
ok(spr.slice(1, 4).toString() === 'PNG', 'sprite PNG');
ok(spr.readUInt32BE(16) === 32 && spr.readUInt32BE(20) === 32, 'sprite 32x32');
const sha = crypto.createHash('sha256').update(spr).digest('hex');
ok(rd('docs/LICENSE_AND_ASSETS.md').includes(sha), 'sha256 sprite tercatat di LICENSE_AND_ASSETS');
ok(/PetalByte/.test(rd('CREDITS')) && /PetalByte/.test(rd('docs/LICENSE_AND_ASSETS.md')), 'kredit PetalByte');

/* 2. data = keluaran pembangkit (deterministik) */
const before = rd('assets/world/fences.json');
const gen = spawnSync('python3', ['tools/build_fences.py'], { cwd: root, encoding: 'utf8' });
ok(gen.status === 0, 'build_fences.py jalan: ' + gen.stderr);
const after = rd('assets/world/fences.json');
if (before !== after) fs.writeFileSync(path.join(root, 'assets/world/fences.json'), before);   /* jangan ubah berkas saat tes */
ok(before === after, 'fences.json sama dengan keluaran tools/build_fences.py');

const F = JSON.parse(before);
const V = F.village.cells, C = F.city.cells;
ok(F.v === 1 && F.sprite === 'fence_wood.png' && F.pitch === 24 && F.artLeft === 4, 'metadata');
ok(V.length > 60 && C.length === 133, 'jumlah sel desa ' + V.length + ', kota ' + C.length);
const key = (x, y) => y * 1000 + x;
const vs = new Set(V.map((c) => key(c[0], c[1])));
ok(vs.size === V.length && new Set(C.map((c) => key(c[0], c[1]))).size === C.length, 'tanpa duplikat');

/* 3. desa: sel sah dan celah tepat */
const idx = rj('assets/world/index.json');
const water = (x, y) => idx.grid[y][x] === '~';
ok(V.every((c) => c[0] >= 6 && c[0] <= 53 && c[1] >= 6 && c[1] <= 35 && !water(c[0], c[1])), 'sel desa di pulau, bukan air');
const jembatan = [52, 53].flatMap((x) => [22, 23, 24].map((y) => [x, y]));
const gerbangU = [29, 30, 31, 32].map((x) => [x, 6]);
ok(jembatan.concat(gerbangU).every((c) => !vs.has(key(c[0], c[1]))), 'celah Jembatan timur dan Gerbang utara terbuka');
ok(F.village.fishGaps.length >= 4 && F.village.fishGaps.every((c) => !vs.has(key(c[0], c[1]))), 'celah memancing terbuka');
ok(F.village.fishGaps.every((c) => [-1, 0, 1].some((dx) => [-1, 0, 1].some((dy) => water(c[0] + dx, c[1] + dy)))), 'celah memancing menempel ke air');

/* 4. rute: panjang rute spawn -> Jembatan / Dermaga / gerbang kota tidak berubah oleh pagar */
const W = idx.w, H = idx.h, CS = idx.chunkSize || 32;
const col = new Uint8Array(W * H);
idx.chunks.forEach((c) => {
  const d = rj('assets/world/' + c.file);
  d.layers.collision.forEach((v, i) => { if (v) col[(c.y * CS + Math.floor(i / CS)) * W + c.x * CS + (i % CS)] = 1; });
});
function bfs(extra) {
  const blk = (x, y) => col[y * W + x] || water(x, y) || (extra && extra.has(key(x, y)));
  const D = new Int32Array(W * H).fill(-1), q = [[30, 26]]; D[26 * W + 30] = 0;
  for (let h = 0; h < q.length; h++) {
    const [x, y] = q[h];
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || D[ny * W + nx] >= 0 || blk(nx, ny)) return;
      D[ny * W + nx] = D[y * W + x] + 1; q.push([nx, ny]);
    });
  }
  return (x, y) => D[y * W + x];
}
const d0 = bfs(null), d1 = bfs(vs);
[['Jembatan', 56, 23], ['Dermaga', 55, 80], ['Gerbang kota', 124, 23]].forEach(([nm, x, y]) => {
  ok(d0(x, y) > 0, nm + ' terjangkau tanpa pagar');
  ok(d1(x, y) === d0(x, y), nm + ' tetap ' + d0(x, y) + ' petak dengan pagar (dapat ' + d1(x, y) + ')');
});

/* 5. runtime: jalankan js/tilemap.js sungguhan dengan stub */
const files = { 'assets/world/index.json': rd('assets/world/index.json'), 'assets/world/fences.json': before };
class FakeImage { set src(v) { this._s = v; this.complete = true; this.naturalWidth = 32; } get src() { return this._s; } }
const calls = [];
const ctx = {
  self: {}, console, Object, Math, JSON, Array, Promise, Date,
  fetch: (u) => Promise.resolve(files[u] ? { ok: true, json: () => Promise.resolve(JSON.parse(files[u])) } : { ok: false }),
  Image: FakeImage, document: { createElement: () => ({ getContext: () => ({}) }) },
};
vm.createContext(ctx);
vm.runInContext(rd('js/tilemap.js') + '\n;this.__T = Tmap;', ctx);
ok(typeof ctx.__T.fenceSolid === 'function' && typeof ctx.__T.fenceCity === 'function', 'Tmap mengekspor fenceSolid/fenceCity');
ctx.__T.init('assets/world/');
setTimeout(() => {
  const T = ctx.__T;
  ok(V.every((c) => T.fenceSolid(c[0], c[1])), 'semua sel desa solid');
  ok(!T.fenceSolid(52, 23) && !T.fenceSolid(30, 6) && !T.fenceSolid(40, 20), 'celah dan petak biasa tidak solid');
  const g = { drawImage: (...a) => calls.push(a) };
  const items = [];
  T.fenceCity(items, g, 0, 0, 0, 640);
  ok(items.length > 20, 'kota menggambar pagar di pojok kamera (' + items.length + ' panel)');
  items.forEach((i) => i.f());
  ok(calls.length === items.length && calls.every((a) => a[0] instanceof FakeImage), 'drawImage dipanggil per panel');
  const far = []; T.fenceCity(far, g, 5000, 5000, 0, 640);
  ok(far.length === 0, 'panel di luar layar tidak digambar');

  /* 6. hook dan cache */
  ok(/Tmap\.fenceSolid\(tx,ty\)/.test(rd('js/world.js')), 'wSolid memanggil Tmap.fenceSolid');
  ok(/Tmap\.fenceCity\(items,g,cx,cy,OX,VW\)/.test(rd('js/city.js')), 'city.js menggambar pagar kota');
  ok(/fenceDraw\(add, g, FPV\)/.test(rd('js/tilemap.js')), 'tilemap menggambar pagar desa');
  const sw = rd('sw.js');
  ok(/const VERSION = 'v94'/.test(sw) && /cache: v94/.test(rd('VERSION')), 'cache v94');
  ok(sw.includes("'fence_wood.png'") && sw.includes("'fences.json'"), 'sprite dan data pagar di-precache');
  ok(/Batch 9B-39/.test(rd('CHANGELOG.md')), 'CHANGELOG memuat Batch 9B-39');
  console.log('PASS: pagar desa utama + kota (' + n + ' pemeriksaan)');
}, 50);
