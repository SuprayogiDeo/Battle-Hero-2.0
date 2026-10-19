#!/usr/bin/env node
'use strict';
/* Tes quest Kafe Kota (Bob): antar 1 Ikan Mas -> 3 Umpan Langka, sekali saja. Menguji status S.cq, pengiriman, dua bahasa,
   simpan+muat (termasuk data lama/rusak), dan kabel interior (objek Bob, INT_FUN, intAct). */
const fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'tools/test_browser_smoke.js'), 'utf8');
const head = src.slice(0, src.indexOf('assert.ok(vm.runInContext("typeof Save.readMain'));
const mod = { exports: {} };
new Function('require', '__dirname', 'module', head + '\nmodule.exports={context,vm};')(require, path.join(root, 'tools'), mod);
const { context, vm } = mod.exports, ev = c => vm.runInContext(c, context, { timeout: 5000 });
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const reset = () => ev('S.cq=null;lifeEnsure();S.fish.bait=0;S.fish.stock={};S.g=100;wMsg={t:0,s:""}');
const msg = () => ev('wMsg.s');
ev("S.set.lang='id'");

// status awal + data rusak
reset(); ok(ev('cqEnsure().s') === 0, 'tanpa S.cq: status 0');
['5', '"x"', '[]', '{s:9}', '{s:-3}', '{s:"1"}'].forEach(v => { ev(`S.cq=${v}`); const s = ev('cqEnsure().s'); ok(s >= 0 && s <= 2 && Number.isInteger(s), 'data S.cq=' + v + ' dipulihkan ke 0..2'); });

// bicara pertama = terima quest
reset(); ok(ev('cqTalk()') === 'info' && ev('S.cq.s') === 1, 'bicara pertama: quest diterima (s=1)');
ok(/Ikan Mas/.test(msg()) && /Umpan Langka/.test(msg()), 'dialog ID menyebut Ikan Mas dan Umpan Langka');
// belum punya ikan
ok(ev('cqTalk()') === 'need' && ev('S.cq.s') === 1 && ev('S.fish.bait') === 0, 'tanpa ikan: tetap s=1, umpan tidak berubah');
ok(/Ikan Mas/.test(msg()), 'pengingat menyebut ikan');
// ikan lain tidak dihitung
ev('S.fish.stock.bluegill=3'); ok(ev('cqTalk()') === 'need' && ev('S.fish.stock.bluegill') === 3, 'ikan lain tidak diterima');
// antar
ev('S.fish.stock.carp=2'); const g = ev('S.g');
ok(ev('cqTalk()') === 'ok', 'antar Ikan Mas: berhasil');
ok(ev('S.cq.s') === 2 && ev('S.fish.stock.carp') === 1 && ev('S.fish.bait') === 3 && ev('S.g') === g, 'status 2, ikan -1, umpan +3, emas tetap');
ok(/\+3/.test(msg()), 'pesan imbalan menyebut +3');
// tidak bisa diulang
ok(ev('cqTalk()') === 'info' && ev('S.fish.bait') === 3 && ev('S.fish.stock.carp') === 1 && ev('S.cq.s') === 2, 'sesudah selesai: tidak ada imbalan ulang');
// umpan benar-benar bisa dipakai (jalur yang sama dengan quest Nelayan)
ok(ev('S.fish.bait|0') === 3, 'umpan masuk S.fish.bait (dipakai saat memancing)');

// simpan + muat: s=1 dan s=2 bertahan
reset(); ev('cqTalk()'); ev('sv()'); ev('S=Object.assign({},Save.readMain())'); ok(ev('cqEnsure().s') === 1, 'simpan+muat: s=1 bertahan');
ev('S.fish.stock.carp=1;cqTalk();sv()'); ev('S=Object.assign({},Save.readMain())'); ok(ev('S.cq.s') === 2 && ev('S.fish.bait') === 3, 'simpan+muat: s=2 dan umpan bertahan');
ev('cqTalk()'); ok(ev('S.fish.bait') === 3, 'sesudah muat: tidak ada imbalan ganda');
// save lama tanpa S.cq
ev('delete S.cq'); assert.doesNotThrow(() => ev('cqTalk()')); ok(ev('S.cq.s') === 1, 'save lama tanpa S.cq aman'); n++;

// dua bahasa
const L = {}; ['id', 'en'].forEach(l => { ev(`S.set.lang='${l}'`); L[l] = [0, 1, 2].map(s => { ev(`S.cq={s:${s}}`); return ev('cqLines()'); }); });
ok(L.id.every((t, i) => t && t !== L.en[i] && !/undefined|NaN/.test(t + L.en[i])), 'dialog tiga status berbeda di ID dan EN, tanpa undefined');
ok(/Carp/.test(L.en[0]) && /Rare Bait/.test(L.en[0]), 'dialog EN menyebut Carp dan Rare Bait');
ev("S.set.lang='id'");

// kabel interior
const isrc = fs.readFileSync(path.join(root, 'js/interior.js'), 'utf8');
ok(/\['mi_bob',9,3,1,1,'cafeq','BARISTA'\]/.test(isrc), 'Bob di Kafe memakai aksi cafeq/BARISTA');
ok(/\['mi_bench',7,3,2,1,'cafe','MENU'\]/.test(isrc), 'menu Kafe tetap bisa dibuka lewat konter');
ok(ev('INT_FUN.cafeq') === 1, 'cafeq terdaftar di INT_FUN');
reset(); ev('wMsg.t=0;intAct({act:"cafeq"})'); ok(ev('S.cq.s') === 1 && ev('wMsg.t') > 0 && ev('tr(wMsg.s)').length > 10, 'intAct(cafeq) memulai quest dan menampilkan pesan');
console.log('test_city_quest: ' + n + ' pemeriksaan lulus');
