# Laporan Visual QA — Component Gallery SIKDES

| Item | Hasil |
| --- | --- |
| Tanggal | 31 Agustus 2026 |
| Status | **LULUS** |
| Spesifikasi | `UI_UX_SPEC.md` v1.1.1 |
| Screen ID | `DEV-COMPONENT-GALLERY` |
| URL uji | `http://127.0.0.1:8765/design/component-gallery/` |
| Browser | Microsoft Edge `152.0.4191.53` (Chromium) |
| Runner | `design/component-gallery/visual-qa.mjs` tanpa dependency npm |

## Keputusan

Component gallery lulus gate visual, responsive, aksesibilitas dasar, dan interaksi. `UI_UX_SPEC.md` v1.1.1 layak dibekukan sebagai kontrak implementasi. Perubahan berikutnya pada token, layout, Screen ID, registry komponen, atau pola interaksi wajib menaikkan versi spesifikasi sesuai governance.

## Cakupan dan hasil

| Gate | 320 px | 768 px | 1024 px | 1440 px |
| --- | :---: | :---: | :---: | :---: |
| Render penuh dan komposisi visual | Lulus | Lulus | Lulus | Lulus |
| Page-level horizontal reflow | Lulus | Lulus | Lulus | Lulus |
| Marker kesiapan JavaScript | Lulus | Lulus | Lulus | Lulus |
| Target interaksi minimum 44×44 px | Lulus | Lulus | Lulus | Lulus |
| Grid metrik | 1 kolom | 2 kolom | 4 kolom | 4 kolom |
| Kontras tombol danger | 5,89:1 | 5,89:1 | 5,89:1 | 5,89:1 |
| Resource eksternal/gradient | Tidak ada | Tidak ada | Tidak ada | Tidak ada |
| Error console/JavaScript/request | 0 | 0 | 0 | 0 |
| Region scroll horizontal berlabel | Lulus | Lulus | Lulus | Lulus |

Tabel penduduk pada ruang sempit bergulir horizontal hanya di region `role="region"` yang mempunyai `aria-label`; halaman sendiri tidak dapat digulir horizontal. Seluruh screenshot memakai data contoh non-PII.

Walkthrough keyboard menguji dan memverifikasi:

- skip link sebagai fokus pertama dan terlihat saat fokus;
- modal, navigation drawer, serta filter drawer terbuka dengan fokus awal yang benar;
- `Tab`/`Shift+Tab` tetap terperangkap di overlay aktif;
- `Escape` menutup overlay dan fokus kembali ke pemicu;
- row tabel dapat diaktifkan dengan keyboard tanpa mengambil aksi tombol di dalam row;
- toast, tombol loading, dan pemulihan state bekerja;
- `prefers-reduced-motion: reduce` menurunkan animasi/transisi ke durasi efektif minimum.

## Temuan yang diselesaikan sebelum pembekuan

| Temuan baseline | Koreksi final |
| --- | --- |
| Selector focusable `[tabindex]:not([tabindex=-1])` tidak valid dan memutus focus trap | Nilai atribut `-1` diberi quote; modal dan drawer kembali mempunyai focus trap/return tanpa exception JavaScript |
| Tombol kecil 36 px dan pagination 40 px melanggar target 44×44 px | Seluruh control terkait dinaikkan menjadi minimum 44×44 px |
| Danger `#FE0000` hanya memberi kontras 4,03:1 terhadap teks putih | Token identitas `#FE0000` dipertahankan sesuai PRD; varian tetap `danger-strong` `#CC0000` dipakai pada permukaan dengan teks putih dan menghasilkan 5,89:1 |
| Grid metrik pada desktop 1024 px masih 2 kolom | Breakpoint dikoreksi menjadi 4 kolom mulai 1024 px |
| Request favicon menghasilkan 404 di console | Favicon memakai logo lokal |
| Capture navigation drawer sempat merekam transisi pertengahan | Evidence final menunggu transisi 220 ms sebelum screenshot |
| Field readiness dan telemetry overflow menghasilkan data yang ambigu | Gallery memberi marker readiness eksplisit; audit menolak marker yang hilang dan mengecualikan isi region scroll horizontal berlabel dari overflow page-level |

## Bukti

Screenshot penuh:

- [Mobile 320 px](mobile-320-full.png)
- [Tablet 768 px](tablet-768-full.png)
- [Desktop 1024 px](desktop-1024-full.png)
- [Desktop 1440 px](desktop-1440-full.png)

State interaktif:

- [Navigation drawer mobile](mobile-320-navigation-drawer.png)
- [Filter drawer mobile](mobile-320-filter-drawer.png)
- [Modal desktop dan focus ring](desktop-1440-modal.png)

Ringkasan visual:

- [Contact sheet mobile 320 px](previews/mobile-320-contact.jpg)
- [Contact sheet tablet 768 px](previews/tablet-768-contact.jpg)
- [Contact sheet desktop 1024 px](previews/desktop-1024-contact.jpg)
- [Contact sheet desktop 1440 px](previews/desktop-1440-contact.jpg)

Hasil terstruktur: [`visual-qa-results.json`](visual-qa-results.json).

## Transparansi eksekusi

Koneksi in-app browser tidak dapat dibentuk karena helper sandbox Windows gagal saat membuat proses browser. Visual QA kemudian dijalankan memakai Microsoft Edge lokal melalui Chrome DevTools Protocol. Ini tetap menghasilkan render Chromium nyata, screenshot pixel, event keyboard browser, console log, dan network log; bukan pemeriksaan source/DOM statis semata. Bukti visual seluruh viewport dan focus state diperiksa kembali secara langsung sebelum keputusan pembekuan.
