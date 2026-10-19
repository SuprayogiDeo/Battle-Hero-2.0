/* Hero Battle - cf.js
 Skrip klasik. Sakelar opt-in ?cf=1 untuk sprite atlas Cute Fantasy (assets/world/cf_atlas.png/json, Kenmi, non-komersial).
 Tanpa ?cf=1: CF.on === false, tidak ada fetch/Image baru, semua pemanggil memakai jalur lama (tampilan default tidak berubah).
 Dengan ?cf=1: hewan Kandang (ranch.js), tile jembatan dan sprite pagar objek dunia (tilemap.js) diganti dari atlas; eksterior Penginapan desa (tilemap.js) = rumah atlas;
 gedung kota (city.js cityDrawB) = kotak lama yang atap, dinding, jendela, dan pintunya disusun dari potongan rumah atlas (ukuran, warna aksen, papan nama, pintu, tabrakan tetap).
 Atlas belum siap / gagal dimuat -> setiap helper mengembalikan false/null dan pemanggil jatuh ke sprite lama. Data peta, tabrakan, chunk tidak disentuh. */
var CF = (function () {
  var ON = false;
  try { ON = /[?&]cf=1(?:[&#]|$)/.test((typeof location !== 'undefined' && location.search) || ''); } catch (e) { }
  var BASE = 'assets/world/', M = null, IM = null, bad = false, started = false;
  /* titik kaki (px sel 32) per hewan; sheet 2x2 sel 32: baris 0 = diam, baris 1 = jalan, 2 frame per baris, menghadap kiri */
  var FEET = { chicken: 20, cow: 24, pig: 21, sheep: 21 }, ANAME = { chicken: 'Chicken', cow: 'Cow', pig: 'Pig', sheep: 'Sheep' };
  /* jembatan (id tile 128-143 di bridge_tiles.json) -> sel Bridge_Wood 16 px (kolom, baris). Id lain null (pakai tile lama);
     tiang lama (132,141,142) tidak digambar karena Bridge_Wood sudah punya ujung gelondong sendiri. */
  var BR = { 128: [0, 1], 129: [1, 1], 130: [1, 1], 131: [2, 1], 133: [0, 2], 134: [1, 2], 135: [1, 2], 136: [2, 2], 137: [0, 3], 138: [1, 3], 139: [1, 3], 140: [2, 3] };
  var BR_SKIP = { 132: 1, 141: 1, 142: 1 };
  function start() {
    if (!ON || started) return; started = true;
    try {
      fetch(BASE + 'cf_atlas.json').then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) {
        M = j.entries; var i = new Image();
        i.onload = function () { IM = i; }; i.onerror = function () { bad = true; }; i.src = BASE + 'cf_atlas.png';
      }).catch(function () { bad = true; });
    } catch (e) { bad = true; }
  }
  function ready() { return ON && !bad && !!IM && !!M; }
  /* true bila keputusan sudah final (siap atau gagal): chunk menunggu ini supaya tidak ter-bake setengah lama setengah baru */
  function settled() { return !ON || bad || ready(); }
  /* hewan: true bila tergambar. (x,y) = titik kaki, sc = skala, flip = cermin (sheet menghadap kiri) */
  function drawAnimal(g, type, t, x, y, sc, walk, flip) {
    if (!ready()) return false;
    var e = M['animals/' + ANAME[type]]; if (!e) return false;
    sc = sc || 1; var f = Math.floor(Math.max(0, t) / 260) % 2, sx = e.x + f * 32, sy = e.y + (walk ? 32 : 0), px = Math.round(x), py = Math.round(y), fy = FEET[type] || 22;
    var old = g.imageSmoothingEnabled; g.imageSmoothingEnabled = false;
    if (flip) { g.save(); g.translate(px, py); g.scale(-1, 1); g.drawImage(IM, sx, sy, 32, 32, -16 * sc, -fy * sc, 32 * sc, 32 * sc); g.restore(); }
    else g.drawImage(IM, sx, sy, 32, 32, px - 16 * sc, py - fy * sc, 32 * sc, 32 * sc);
    g.imageSmoothingEnabled = old; return true;
  }
  /* tile jembatan: null = pakai tile lama; {im:null} = jangan gambar; {im,sx,sy[,dx,ux,uy]} = gambar sel 16x16 dari atlas (bila ux ada, gambar dasar ux,uy dulu; dx = geser x sel utama) */
  function tile(n) {
    if (!ready()) return null;
    if (BR_SKIP[n]) return { im: null };
    var c = BR[n]; if (!c) return null;
    var e = M['decor/Bridge_Wood']; if (!e) return null;
    var t = { im: IM, sx: e.x + c[0] * 16, sy: e.y + c[1] * 16 };
    /* sel ujung (kolom 0 / 2) punya tepi kosong 4-5 px: geser rata ke tepi petak dan isi dasarnya dengan sel tengah supaya ujung menempel di tanah */
    if (c[0] !== 1) { t.dx = c[0] === 0 ? -5 : 4; t.ux = e.x + 16; t.uy = t.sy; }
    return t;
  }
  /* pagar objek dunia (fence_h / fence_v): true bila tergambar. (sx,sb) = tengah-bawah di layar (skala 2x seperti sprite lama) */
  function drawFence(g, k, sx, sb) {
    if (!ready()) return false;
    var e = M['decor/Fences']; if (!e || (k !== 'fence_h' && k !== 'fence_v')) return false;
    var h = k === 'fence_h', ox = e.x + (h ? 32 : 0), oy = e.y + (h ? 0 : 16), old = g.imageSmoothingEnabled;
    g.imageSmoothingEnabled = false;
    g.drawImage(IM, ox, oy, 16, 16, Math.round(sx - 16), Math.round(sb - (h ? 26 : 32)), 32, 32);
    g.imageSmoothingEnabled = old; return true;
  }
  /* Penginapan desa: objek `b_res1` (index.json, rumah warga lama 86x73) di titik pintu INN_AT (sama dengan INT_B 'penginapan' di interior.js). Hanya gambar yang diganti; peta, tabrakan, pintu, urutan-y tidak berubah. */
  var INN_AT = { x: 200, y: 320 }, HOUSE = 'decor/House_1_Wood_Base_Blue';
  function isInn(o) { return !!o && o.k === 'b_res1' && o.x === INN_AT.x && o.y === INN_AT.y; }
  /* rumah atlas 96x128 skala 2x: tengah pintu (x 40) tepat di atas titik kaki sprite lama (sx,sb) dan dasar pintu 6 px layar di atasnya (seperti pintu lama, y 70 dari 73), jadi pintu tetap di tempat pintu lama.
     INN_R = meta bergaya sprite (door = kotak pintu dalam px sprite) untuk papan nama dinding; posisi kiri-atas: innXY. */
  var INN_R = { w: 96, h: 128, door: [33, 86, 14, 26] };
  function innXY(sx, sb) { return { x: Math.round(sx - 80), y: Math.round(sb - 230) }; }
  function drawInn(g, sx, sb) {
    if (!ready()) return false;
    var e = M[HOUSE]; if (!e) return false;
    var old = g.imageSmoothingEnabled; g.imageSmoothingEnabled = false;
    var p = innXY(sx, sb); g.drawImage(IM, e.x, e.y, 96, 128, p.x, p.y, 192, 256);
    g.imageSmoothingEnabled = old; return true;
  }
  /* gedung kota: potongan rumah atlas (px sprite): genting (16,36,16x16), balok (20,80,12x8), dinding (20,92,12x12), dasar (20,104,12x8), pintu (32,86,16x26), jendela (58,90,12x14); skala 2x.
     Tinggi atap 1 baris petak (bh 3) atau 2 (bh >= 4). (x,y,w,h) = badan di layar, dx = x pintu (kiri petak pintu), bw = lebar petak. Kembalikan false bila atlas belum siap. */
  function drawCityB(g, x, y, w, h, dx, bw, bh, accent) {
    if (!ready()) return false;
    var e = M[HOUSE]; if (!e) return false;
    var old = g.imageSmoothingEnabled, rh = bh >= 4 ? 64 : 32, by = y + rh, wy0 = by + 16, wh = h - rh - 16, i, j;
    g.imageSmoothingEnabled = false;
    function cut(sx, sy, sw, sh, ox, oy, cw, ch) { g.drawImage(IM, e.x + sx, e.y + sy, sw, sh, Math.round(ox), Math.round(oy), cw, ch); }
    for (j = 0; j < rh; j += 32) for (i = 0; i < w; i += 32) cut(16, 36, 16, 16, x + i, y + j, 32, 32);
    if (accent) { g.fillStyle = accent; g.fillRect(x, by - 4, w, 4); }
    for (i = 0; i < w; i += 24) cut(20, 80, Math.min(12, (w - i) / 2), 8, x + i, by, Math.min(24, w - i), 16);
    for (j = 0; j < wh - 16; j += 24) for (i = 0; i < w; i += 24) { var ch = Math.min(24, wh - 16 - j); cut(20, 92, Math.min(12, (w - i) / 2), ch / 2, x + i, wy0 + j, Math.min(24, w - i), ch); }
    for (i = 0; i < w; i += 24) cut(20, 104, Math.min(12, (w - i) / 2), 8, x + i, y + h - 16, Math.min(24, w - i), 16);
    var wyy = wy0 + Math.floor((wh - 16 - 28) / 2);
    for (i = 0; i < bw; i++) { var wx = x + i * 32 + 4; if (Math.abs(wx + 12 - dx - 16) > 48) cut(58, 90, 12, 14, wx, wyy, 24, 28); }
    cut(32, 86, 16, 26, dx, y + h - 52, 32, 52);
    g.imageSmoothingEnabled = old; return true;
  }
  start();
  return { isInn: isInn, drawInn: drawInn, innXY: innXY, INN_R: INN_R, INN_AT: INN_AT, drawCityB: drawCityB, on: ON, ready: ready, settled: settled, drawAnimal: drawAnimal, tile: tile, drawFence: drawFence };
})();
