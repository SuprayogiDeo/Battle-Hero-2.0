#!/usr/bin/env node
'use strict';
/* Tes Kafe Kota dan Toko Kota (Step 10): kafe memakai menu masakan Penginapan dengan harga +25%, stok 2/hari yang TERPISAH dari Penginapan;
   Toko Kota menjual Umpan Langka (90 emas, 5/hari). Menguji harga tepat, penolakan (emas kurang / stok habis / masakan aktif), reset harian,
   simpan+muat, klik UI, dan bahwa perilaku Penginapan desa tidak berubah. */
const fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'tools/test_browser_smoke.js'), 'utf8');
const head = src.slice(0, src.indexOf('assert.ok(vm.runInContext("typeof Save.readMain'));
const mod = { exports: {} };
new Function('require', '__dirname', 'module', head + '\nmodule.exports={context,vm};')(require, path.join(root, 'tools'), mod);
const { context, vm } = mod.exports, ev = c => vm.runInContext(c, context, { timeout: 5000 });
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const reset = g => ev(`S.g=${g};S.buff=null;S.inn=null;S.cshop=null;lifeEnsure();S.fish.bait=0`);
ev("S.set.lang='id'");

// 1) venue: harga kafe = harga dasar x 1.25 (dibulatkan), stok kafe 2, stok Penginapan 3
const base = id => ev(`innPrice(LIFE_RECIPES.find(r=>r.id==='${id}'))`), cafe = id => ev(`innPrice(LIFE_RECIPES.find(r=>r.id==='${id}'),'cafe')`);
const ids = ev('LIFE_RECIPES.map(r=>r.id)');
ok(ids.every(id => cafe(id) === Math.round(base(id) * 1.25)), 'harga kafe = harga Penginapan x 1.25');
ok(ev("innPrice(LIFE_RECIPES[0],'tidak_ada')") === base(ids[0]), 'venue tak dikenal jatuh ke harga Penginapan');
reset(5000); ok(ev("innLeft('fish_soup')") === 3 && ev("innLeft('fish_soup','cafe')") === 2, 'stok awal: Penginapan 3, kafe 2');
ok(ev("innRows('cafe').every(r=>r.left===2&&r.ok)") && ev('innRows().every(r=>r.left===3&&r.ok)'), 'baris menu kafe/Penginapan benar');

// 2) pembelian di kafe: emas turun tepat, buff sama dengan Penginapan, stok terpisah
const P = cafe('fish_soup');
ok(ev("innBuy('fish_soup','cafe')") === 'ok' && ev('S.g') === 5000 - P, 'beli di kafe: emas turun tepat ' + P);
ok(ev("innLeft('fish_soup','cafe')") === 1 && ev("innLeft('fish_soup')") === 3 && ev('S.inn.sold["cafe:fish_soup"]') === 1 && !ev('S.inn.sold.fish_soup'), 'stok kafe berkurang, stok Penginapan tidak');
ok(ev('S.buff.id') === 'fish_soup' && ev('S.buff.stages') === ev("LIFE_RECIPES.find(r=>r.id==='fish_soup').stages"), 'buff aktif sama seperti Penginapan');
ok(ev("innBuy('fish_soup','cafe')") === 'active' && ev('S.g') === 5000 - P, 'masakan sama masih aktif: ditolak');
ev('S.buff=null'); ok(ev("innBuy('fish_soup','cafe')") === 'ok' && ev("innLeft('fish_soup','cafe')") === 0, 'pembelian ke-2 berhasil, stok kafe habis');
ev('S.buff=null'); const g1 = ev('S.g'); ok(ev("innBuy('fish_soup','cafe')") === 'stock' && ev('S.g') === g1, 'stok kafe habis: ditolak tanpa mengurangi emas');
ok(ev("innBuy('fish_soup')") === 'ok', 'Penginapan desa masih bisa beli masakan yang sama (stok terpisah)');
reset(cafe('farm_stew') - 1); ok(ev("innBuy('farm_stew','cafe')") === 'gold' && ev('S.buff') === null, 'emas kurang 1 di kafe: ditolak');
ok(ev("innBuy('tidak_ada','cafe')") === 'none', 'id tak dikenal ditolak');

// 3) Toko Kota: Umpan Langka
reset(1000); ok(ev('CSHOP_BAIT.g') === 90 && ev('CSHOP_BAIT.cap') === 5 && ev('cshopLeft()') === 5, 'toko: 90 emas, batas 5/hari');
ok(ev('cshopBuy()') === 'ok' && ev('S.g') === 910 && ev('S.fish.bait') === 1 && ev('cshopLeft()') === 4, 'beli umpan: emas -90, umpan +1, sisa 4');
for (let i = 0; i < 4; i++) ok(ev('cshopBuy()') === 'ok', 'pembelian umpan ke-' + (i + 2));
ok(ev('S.fish.bait') === 5 && ev('S.g') === 550 && ev('cshopLeft()') === 0, 'lima umpan: emas 550, sisa 0');
ok(ev('cshopBuy()') === 'stock' && ev('S.g') === 550 && ev('S.fish.bait') === 5, 'melebihi batas: ditolak tanpa efek');
ok(ev('cshopRow().ok') === false, 'baris toko tidak bisa dibeli saat habis');
reset(89); ok(ev('cshopBuy()') === 'gold' && ev('S.fish.bait') === 0 && ev('cshopLeft()') === 5, 'emas kurang 1: ditolak');
reset(90); ok(ev('cshopBuy()') === 'ok' && ev('S.g') === 0, 'emas pas: berhasil, sisa 0');
// umpan ikut dipakai sistem memancing (bait > 0 mengubah bobot)
ok(ev('S.fish.bait') === 1, 'umpan tercatat di S.fish.bait (dipakai lifeChooseFish)');

// 4) simpan+muat dan reset harian
reset(1000); ev("innBuy('fish_soup','cafe')"); ev('cshopBuy()'); ev('sv()'); ev('S=Object.assign({},Save.readMain())');
ok(ev("innLeft('fish_soup','cafe')") === 1 && ev('cshopLeft()') === 4, 'stok kafe dan toko tetap setelah save+load');
ev("S.inn.d='1999-01-01';S.cshop.d='1999-01-01'");
ok(ev("innLeft('fish_soup','cafe')") === 2 && ev('cshopLeft()') === 5, 'hari berganti: stok direset');
ev('S.cshop=null;S.inn=null'); ok(ev('cshopLeft()') === 5 && ev("innLeft('fish_soup','cafe')") === 2, 'save lama tanpa S.cshop/S.inn aman');
ev('S.cshop={d:today(),bait:"x"}'); ok(ev('cshopLeft()') === 5, 'S.cshop rusak dipulihkan');

// 5) UI: dua bahasa, klik, dan layar tergambar lewat dispatcher draw()/lifeInputState
['id', 'en'].forEach(l => { ev(`S.set.lang='${l}'`); ev("innV='cafe';st='inn'"); assert.doesNotThrow(() => ev('draw()')); ev("st='cshop'"); assert.doesNotThrow(() => ev('draw()')); n += 2; });
ev("S.set.lang='id'"); reset(1000); ev("st='world';wI=null;wFrom=0;cshopOpen()");
ok(ev('lifeInputState(300,200)') === true && ev('S.fish.bait') === 0, 'klik di luar tombol BELI tidak membeli');
ev('lifeInputState(550,83)'); ok(ev('S.fish.bait') === 1 && ev('S.g') === 910, 'klik BELI di toko membeli umpan');
ok(ev('lifeInputState(40,10)') === true && ev('st') === 'world', 'KEMBALI menutup toko');
ev("innOpen('cafe')"); ok(ev('st') === 'inn' && ev('innV') === 'cafe', "innOpen('cafe') membuka kafe");
ev('lifeInputState(550,62+8+5)'); ok(ev('S.buff&&S.buff.id') === ids[0] && ev('S.g') === 910 - cafe(ids[0]), 'klik BELI baris 1 kafe membeli ' + ids[0]);
ev("innOpen()"); ok(ev('innV') === 'inn', 'innOpen() tanpa argumen kembali ke Penginapan');
ev("st='world'");

// 6) Toko Kota daftar (Step 14): barang bahan masakan masuk stok dapur, stok harian per barang, tolak, simpan-muat, gulir
const IT = ev('CSHOP_ITEMS.map(i=>i.id)');
ok(IT.length >= 8 && IT[0] === 'bait' && ['egg', 'milk', 'cheese', 'fruit', 'mushroom'].every(k => IT.includes(k)), 'daftar toko: umpan + telur, susu, keju, buah, jamur, dst');
ok(ev('CSHOP_ITEMS.every(i=>i.g>0&&i.cap>0&&i.n.length===2&&i.d.length===2)'), 'tiap barang punya harga, batas, nama dan deskripsi dua bahasa');
const atlas = JSON.parse(fs.readFileSync(path.join(root, 'assets/world/mart_icons.json'), 'utf8')).icons;
ok(ev('CSHOP_ITEMS.filter(i=>i.ic[0]!=="dish")').every(i => { const a = atlas[Object.keys(atlas).find(k => atlas[k].x === i.ic[1] && atlas[k].y === i.ic[2] && atlas[k].s === (i.ic[0] === 'fruit' ? 16 : 32) && (i.ic[0] === 'fruit') === k.startsWith('fruit_'))]; return !!a; }), 'ikon tiap barang menunjuk sel nyata di atlas mart/fruit');
const kinds = { egg: "S.ranch.stock.egg", milk: "S.ranch.stock.milk", cheese: "S.kitchen.food.cheese", fruit: "S.gather.items.fruit", mushroom: "S.gather.items.mushroom", butter: "S.kitchen.food.butter", flour: "S.kitchen.food.flour" };
Object.keys(kinds).forEach(k => {
  reset(1000); ev('ranchState()'); const price = ev(`cshopItem('${k}').g`), cap = ev(`cshopItem('${k}').cap`), b0 = ev(`lifeFoodCount('${k}')`) | 0, raw0 = ev(kinds[k] + '|0');
  ok(ev(`cshopBuy('${k}')`) === 'ok' && ev('S.g') === 1000 - price, k + ': beli, emas turun tepat ' + price);
  ok((ev(kinds[k] + '|0')) === raw0 + 1, k + ': masuk ke ' + kinds[k]);
  if (['egg', 'milk', 'fruit', 'mushroom'].includes(k)) ok(ev(`lifeFoodCount('${k}')`) === b0 + 1, k + ': terbaca oleh lifeFoodCount (stok dapur)');
  ok(ev(`cshopLeft('${k}')`) === cap - 1 && ev('cshopLeft()') === 5, k + ': stok harian barang ini berkurang, umpan tidak');
  for (let i = 1; i < cap; i++) ev(`cshopBuy('${k}')`);
  const g1 = ev('S.g'), st1 = ev(kinds[k] + '|0'); ok(ev(`cshopBuy('${k}')`) === 'stock' && ev('S.g') === g1 && ev(kinds[k] + '|0') === st1, k + ': stok habis, ditolak tanpa efek');
});
reset(cshopP('egg') - 1); function cshopP(k) { return ev(`cshopItem('${k}').g`); }
ok(ev("cshopBuy('egg')") === 'gold' && ev('S.g') === cshopP('egg') - 1 && ev('cshopLeft("egg")') === 10, 'emas kurang 1: telur ditolak, stok tidak berkurang');
ok(ev("cshopBuy('tidak_ada')") === 'none', 'barang tak dikenal ditolak');
// bahan yang dibeli benar-benar memasak: Telur Dadar Hutan = telur + jamur + herba
reset(1000); ev('S.ranch.stock.egg=0;S.gather.items.mushroom=0;S.gather.items.herb=1;S.kitchen.cooked=0');
ok(ev("lifeCanCook(LIFE_RECIPES.find(r=>r.id==='forest_omelet'))") === false, 'tanpa telur/jamur belum bisa masak');
ev("cshopBuy('egg')"); ev("cshopBuy('mushroom')");
ok(ev("lifeCanCook(LIFE_RECIPES.find(r=>r.id==='forest_omelet'))") === true, 'telur + jamur dari toko dipakai dapur: bisa masak');
ev("lifeConsume('egg',1)"); ok(ev('S.ranch.stock.egg') === 0, 'lifeConsume mengurangi telur belian');
// simpan-muat per barang + reset harian
reset(1000); ev('S.kitchen.food.cheese=0'); ev("cshopBuy('cheese')"); ev("cshopBuy('cheese')"); ev("cshopBuy('fruit')"); ev('sv()'); ev('S=Object.assign({},Save.readMain())');
ok(ev("cshopLeft('cheese')") === 4 && ev("cshopLeft('fruit')") === 9 && ev("S.kitchen.food.cheese") === 2, 'stok per barang dan isi dapur tetap setelah save+load');
ev("S.cshop.d='1999-01-01'"); ok(ev("cshopLeft('cheese')") === 6 && ev("cshopLeft('fruit')") === 10, 'hari berganti: stok semua barang direset');
ev("S.cshop={d:today(),sold:{cheese:'x',egg:-4}}"); ok(ev("cshopLeft('cheese')") === 6 && ev("cshopLeft('egg')") === 10, 'S.cshop.sold rusak dipulihkan');
// gulir + klik UI
reset(5000); ev("st='world';wI=null;wFrom=0;cshopOpen()");
ok(ev('cshopScroll') === 0 && ev('cshopRows().length') === 5 && ev('cshopRows()[0].it.id') === 'bait', 'terbuka di atas: 5 baris, baris pertama umpan');
ev('lifeInputState(50,320)'); ok(ev('cshopScroll') === 0, 'panah atas di posisi teratas tidak menggulir');
ev('lifeInputState(120,320)'); ok(ev('cshopScroll') === 1 && ev('cshopRows()[0].it.id') === 'egg', 'panah bawah menggulir satu baris');
for (let i = 0; i < 9; i++) ev('lifeInputState(120,320)'); ok(ev('cshopScroll') === ev('cshopMaxScroll()') && ev('cshopRows().length') === 5, 'gulir berhenti di batas bawah');
ev('cshopScroll=1'); ev('lifeInputState(550,83)'); ok(ev("S.cshop.sold.egg") === 1 && ev('S.g') === 5000 - cshopP('egg'), 'klik BELI baris pertama saat tergulir membeli telur');
['id', 'en'].forEach(l => { ev(`S.set.lang='${l}'`); ev("st='cshop'"); [0, ev('cshopMaxScroll()')].forEach(sc => { ev(`cshopScroll=${sc}`); assert.doesNotThrow(() => ev('draw()')); n++; }); });
ev("S.set.lang='id'"); ev("st='world'");

console.log('City shops tests OK (' + n + ' checks)');
