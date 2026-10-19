#!/usr/bin/env python3
"""Bangun assets/world/fences.json: pagar keliling desa utama (pulau permukiman) dan kota.

Sprite: assets/world/fence_wood.png = Sprite-0005 dari 'Pixel Art Fence & Barrier Pack (32x32)'
(PetalByte, itch.io; halaman produk menyatakan boleh untuk proyek komersial/nonkomersial).
Gunakan `--sprite <path>` sekali untuk menyalin sprite dari paket asli; arsip paket tidak masuk repo.

Aturan desa utama: sel pagar = petak rumput di tepi air luar pulau (x 6-53, y 6-35), kecuali
bangunan, benda penghalang, ladang berpagar, celah jalan (Jembatan timur, Gerbang utara) dan
celah akses memancing (2 petak di tengah tiap bentang >= 10 petak, karena memancing butuh kaki
<= 16 px dari air). Kota: cincin luar 40x30 (sudah solid) kecuali celah gerbang kembali (0,13-15).
"""
import json, os, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = os.path.join(ROOT, 'assets', 'world')
ISLAND = (6, 6, 53, 35)                     # x0,y0,x1,y1 pulau permukiman
FARM = (7, 27, 20, 35)                      # ladang berpagar + 1 petak (sudah ada pagarnya)
VGAPS = {(x, 6) for x in range(29, 33)} | {(x, y) for x in (52, 53) for y in (22, 23, 24)}
RIVER_X, RIVER_Y = 24, (7, 35)              # sungai dalam pulau: bukan tepi luar
CITY_GAP = {(0, 13), (0, 14), (0, 15)}
MIN_RUN, GAP_W = 10, 2


def jload(*p):
    with open(os.path.join(*p), encoding='utf-8') as f:
        return json.load(f)


def village():
    idx = jload(W, 'index.json')
    atlas = jload(W, 'atlas.json')['anims']
    spr = idx['spr']
    key = lambda o: o.get('k') or o.get('a')
    dims = lambda k: (spr.get(k) or atlas.get(k))
    col, foot, bld = set(), set(), set()
    for c in idx['chunks']:
        d = jload(W, c['file'])
        n = 32
        for i, v in enumerate(d['layers']['collision']):
            if v:
                col.add((c['x'] * n + i % n, c['y'] * n + i // n))
        for o in d['objects']:
            k = key(o)
            foot.add((o['x'] // 16, (o['y'] - 1) // 16))
            if k.startswith('b_') or k in ('tower', 'windtower', 'stall_red') or k.startswith('house'):
                s = dims(k)
                if s:
                    for y in range((o['y'] - s['h']) // 16, (o['y'] - 1) // 16 + 1):
                        for x in range((o['x'] - s['ax']) // 16, (o['x'] - s['ax'] + s['w'] - 1) // 16 + 1):
                            bld.add((x, y))
    grid = idx['grid']
    water = lambda x, y: grid[y][x] == '~'
    outer = lambda x, y: water(x, y) and not (x == RIVER_X and RIVER_Y[0] <= y <= RIVER_Y[1])
    adj = lambda x, y: any(outer(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1))
    x0, y0, x1, y1 = ISLAND
    ring = {}
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if water(x, y) or not adj(x, y) or (x, y) in bld or (x, y) in col or (x, y) in foot:
                continue
            if FARM[0] <= x <= FARM[2] and FARM[1] <= y <= FARM[3]:
                continue
            if (x, y) in VGAPS:
                continue
            horiz = outer(x, y - 1) or outer(x, y + 1) or not (outer(x - 1, y) or outer(x + 1, y))
            ring[(x, y)] = 'h' if horiz else 'v'
    # celah akses memancing: tengah tiap bentang lurus panjang
    gaps = set()
    for (x, y), o in sorted(ring.items(), key=lambda t: (t[0][1], t[0][0])):
        pass
    for o, step in (('h', (1, 0)), ('v', (0, 1))):
        seen = set()
        for c in sorted(ring, key=lambda t: (t[1], t[0]) if o == 'h' else (t[0], t[1])):
            if ring[c] != o or c in seen:
                continue
            run = [c]
            seen.add(c)
            while True:
                n = (run[-1][0] + step[0], run[-1][1] + step[1])
                if n in ring and ring[n] == o:
                    run.append(n)
                    seen.add(n)
                else:
                    break
            if len(run) >= MIN_RUN:
                parts = 2 if len(run) >= 22 else 1
                for k in range(1, parts + 1):
                    m = len(run) * k // (parts + 1)
                    for g in run[m:m + GAP_W]:
                        gaps.add(g)
    cells = sorted((c for c in ring if c not in gaps), key=lambda t: (t[1], t[0]))
    return [[x, y, ring[(x, y)]] for x, y in cells], sorted([list(g) for g in gaps])


def city():
    c = jload(W, 'city', 'city.json')
    w, h = c['w'], c['h']
    cells = []
    for y in range(h):
        for x in range(w):
            if not (x in (0, w - 1) or y in (0, h - 1)) or (x, y) in CITY_GAP:
                continue
            cells.append([x, y, 'v' if (x in (0, w - 1) and 0 < y < h - 1) else 'h'])
    return cells


def main():
    if '--sprite' in sys.argv:
        shutil.copyfile(sys.argv[sys.argv.index('--sprite') + 1], os.path.join(W, 'fence_wood.png'))
    vc, vg = village()
    out = {'v': 1, 'sprite': 'fence_wood.png', 'pitch': 24, 'artLeft': 4,
           'village': {'cells': vc, 'fishGaps': vg}, 'city': {'cells': city()}}
    with open(os.path.join(W, 'fences.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, separators=(',', ':'))
        f.write('\n')
    print('desa:', len(vc), 'sel,', len(vg), 'celah memancing; kota:', len(out['city']['cells']), 'sel')


if __name__ == '__main__':
    main()
