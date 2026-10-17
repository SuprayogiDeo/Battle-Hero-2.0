# License and third-party asset notice

## Project license

This repository does not currently include a blanket open-source license. Unless the project owner adds one, assume the project's original code and original content are **not granted for reuse by default**. Do not add an MIT/GPL/Apache license automatically because the repository contains third-party art with separate terms.

## Sunnyside World art

The current `CREDITS` file records that parts of the world art are derived from the **Sunnyside World** asset pack by Daniel Diggle. The creator's official page describes use in free and commercial projects, modification, and restrictions on repackaging/reselling and AI training. It also describes redistribution in tutorial/educational-course contexts. These terms should be read directly before making source assets downloadable from a public repository:

- Official page and current license text: <https://danieldiggle.itch.io/sunnyside>

The runtime files under `assets/world/` include cropped/combined/derived assets. Publishing a public GitHub repository makes source files downloadable, even when they are being used in a game. **Before making this repository public or deploying it, confirm that distribution of these derived source files in a public code repository is permitted under the pack's terms, or obtain written clarification from the creator.** A private repository avoids public distribution but does not replace the need to comply with the license.

The original asset-pack archive itself is not included in this repository. Do not add the original pack, paid packs, or unrelated downloaded asset bundles to the repo.

## 99 Ingredients icons

Tahap 8C uses selected derived 16×16 icons from the **99 Ingredients** pack by Keifoo PX in `assets/world/items.png`. Tahap 8D tidak menambah ikon 99 Ingredients; atlas farming/world memakai tahap crop Sunnyside yang sudah diturunkan ke runtime, dan `assets/world/chars.png` diperbarui untuk strip WATERING. Source page: <https://keifoopx.itch.io/99-various-ingredients>. The project catalog records permitted project use/modification and prohibits reselling/repackaging raw icons; re-read the current creator terms before any public repository or deployment. The original ZIP/PSD files are not bundled here.

## Hollow Dolphin fishing icons

Tahap 9B-19 menambahkan `assets/world/fish_icons.png` dan `assets/world/fish_icons.json`: atlas runtime 11 sel 16×16 (10 ikon untuk ikan `LIFE_FISH` + siluet `unknown` untuk ikan yang belum ditemukan) yang dipotong oleh `tools/build_fish_icons.py` dari `fishing_icons_sheet_16x16.png`, bagian dari **Fishing Icon Pack** oleh **Hollow Dolphin**. Pemetaan ikan → indeks ikon dan alasannya tercatat di `fish_icons.json` (`sheetIndex`, `why`). Ikon hanya dipotong dan digabung; siluet `unknown` diturunkan dari bentuk satu ikon dan diberi warna rata. Arsip paket dan ukuran sprite lain (32/48/64 px, ikon terpisah) **tidak** dimasukkan ke repo.

**Status lisensi: belum terkonfirmasi.** Arsip yang diterima hanya berisi gambar (tanpa berkas lisensi atau README), sehingga syarat penggunaan, atribusi wajib, dan izin distribusi ulang tidak diketahui. Seperti sumber lain di proyek privat ini, ini adalah gerbang pemblokir sebelum rilis publik: periksa halaman resmi paket, simpan salinan syaratnya bersama berkas yang dicakup, dan hapus atau ganti ikon bila syaratnya tidak mengizinkan. Atlas dapat dibuat ulang dengan `python3 tools/build_fish_icons.py --sheet <path>/fishing_icons_sheet_16x16.png`.

## Cute Fantasy (Kenmi)

Batch 9B-23 menambahkan `assets/world/cf_atlas.png` dan `assets/world/cf_atlas.json`: atlas 19 PNG dari paket **Cute Fantasy (Free)** oleh Kenmi (`Tiles/*`, `Outdoor decoration/*`, `Animals/*`), dibuat `tools/build_cf_tiles.py` (hanya digabung). Berkas `read_me.txt` paket menyatakan: boleh dipakai di proyek **non-komersial**, boleh dimodifikasi, **tidak boleh redistribusi atau dijual, meskipun sudah dimodifikasi**. Konsekuensi: repo harus tetap privat dan atlas ini tidak boleh ikut rilis publik atau komersial (gerbang pra-rilis: hapus atlas atau dapatkan lisensi yang sesuai). Atlas belum dirujuk peta/tileset desa; paket mentah tidak ada di repo.

## Other assets

Review `CREDITS` and the provenance of every image/audio/font added later. Keep license and attribution notices with the files they cover. Do not assume that files found in a previous working directory are cleared for public redistribution.


## Tahap 8F+8G — signage dan lampu

Tahap ini tidak menambahkan arsip aset atau pack baru. Metadata jendela merupakan koordinat turunan pada sprite rumah yang sudah ada; papan nama menggunakan sprite Sunnyside yang ada; gapura dan palung pakan baru digambar secara prosedural dalam kode runtime. Tinjau tetap syarat Sunnyside dan syarat rumah yang bersumber dari unggahan pengguna sebelum distribusi publik. Proyek tetap privat.


## Modern City Top-Down Pack — Free Sampler (CC0)

Batch 9B-25 menambahkan `assets/world/city/city_tiles.png` dan `city_tiles.json` (20 entri: 16 tile 16×16, 3 prop jalan, sprite rubah), dibuat `tools/build_city_tiles.py` dari `sampler_tileset_16.png`, `sampler_props_3.png`, dan `fox_commuter_npc.png` pada **Modern City Top-Down Pack — Free Sampler** oleh **The Venice Menace Baking Co.** (<https://venicemenacebakingco.itch.io/modern-city-topdown-pack>). Pratinjau 4× ada di `docs/preview_city_tiles.png`.

- **Lisensi: CC0.** README paket menyatakan penggunaan komersial dan pribadi diizinkan tanpa kewajiban atribusi. Kami tetap mencatat sumbernya di `CREDITS`. Larangan "jangan jual ulang paketnya apa adanya" berlaku untuk paket mentah, yang **tidak** dimasukkan ke repo; hanya potongan 16×16 turunan yang disertakan.
- **Pengungkapan bantuan AI:** README paket menyatakan seninya dihasilkan dengan bantuan AI dan dikurasi manual (diungkap di halaman itch.io penulis). Karena itu aset ini ditandai sebagai AI-assisted; tinjau kebijakan platform tujuan rilis tentang konten AI sebelum publikasi.
- Pemrosesan: dipotong, latar dibuang menjadi transparan, diperkecil nearest-neighbour. Tidak ada pewarnaan ulang. Tile asli berukuran besar bergaya 16×16 (bukan autotile 16×16 asli), sehingga detail tipis dapat berubah setelah diperkecil.
- Atlas belum dirujuk peta/kode runtime dan tidak masuk precache service worker.
