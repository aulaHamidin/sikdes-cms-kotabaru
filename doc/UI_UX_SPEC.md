# UI/UX Specification — SIKDES Kota Baru

| Metadata | Nilai |
| --- | --- |
| Versi | 1.1.1 |
| Tanggal | 31 Agustus 2026 |
| Status | Dibekukan untuk implementasi |
| Acuan produk | `PRD-SIKDES-Kota-Baru-CI4.md` |
| Acuan teknologi | `Rekomendasi-Library-CI4-PHP-8.3.md` |
| Bahasa antarmuka | Indonesia |

Dokumen ini adalah sumber tunggal untuk sistem visual, komponen, Screen ID, pola interaksi, responsive behavior, state, dan wording antarmuka SIKDES Kota Baru. Aturan bisnis tetap mengikuti PRD. Jika implementasi membutuhkan pola visual baru, spesifikasi ini harus dinaikkan versinya sebelum pola tersebut dipakai oleh modul.

Urutan otoritas adalah PRD, rekomendasi teknologi, spesifikasi ini, implementation plan, lalu source code dan test.

Spesifikasi v1.1.1 dibekukan pada 31 Agustus 2026 setelah visual QA component gallery berstatus lulus pada viewport 320, 768, 1024, dan 1440 px. Bukti, temuan yang diselesaikan sebelum pembekuan, serta hasil walkthrough keyboard tercatat di [`visual-qa/README.md`](visual-qa/README.md).

## 1. Prinsip pengalaman pengguna

1. **Jelas sebelum cepat.** Dampak mutasi penting dijelaskan sebelum pengguna mengonfirmasi.
2. **Detail sebelum edit.** Klik baris membuka detail; Edit selalu aksi eksplisit.
3. **Status terlihat.** Proses panjang mempunyai status persisted dan tidak bergantung pada browser tetap terbuka.
4. **Tidak mengandalkan warna.** Ikon, label, dan teks selalu menyertai warna status.
5. **Privasi berdasarkan konteks.** PII hanya tampil pada layar internal yang berhak dan tidak pernah masuk portal publik.
6. **Histori tidak disamarkan sebagai kondisi kini.** Tanggal efektif, waktu pencatatan, status void, dan kondisi as-of dibedakan dalam label.
7. **Kesalahan dapat diperbaiki.** Validasi menjelaskan field, penyebab, dan langkah perbaikan dalam bahasa Indonesia.
8. **Satu pola global.** Modul tidak membuat variasi lokal untuk tombol, tabel, form, dialog, alert, upload, atau status.

Yang tidak boleh muncul pada rilis awal:

- registrasi atau akun warga;
- menu layanan surat, QR, tanda tangan digital, anggaran, atau komentar;
- tombol hard delete untuk data penting;
- ekspor laporan resmi dari tombol client-side DataTables;
- data pribadi atau tautan file privat pada portal publik;
- gradient, asset runtime dari CDN, dan editor rich-text di luar CMS.

## 2. Sistem visual

### 2.1 Token warna

| Token | Nilai | Pemakaian |
| --- | --- | --- |
| `--color-primary` | `#0504FF` | CTA utama, link, navigasi aktif, focus accent |
| `--color-primary-hover` | `#0303CC` | Hover CTA utama; turunan tetap dan tidak mengikuti logo upload |
| `--color-accent` | `#FFF000` | Aksen singkat, marker, status perhatian; bukan teks panjang atau CTA utama |
| `--color-success` | `#339967` | Status berhasil/aktif bersama ikon dan label |
| `--color-danger` | `#FE0000` | Token identitas untuk aksen kesalahan, border, ikon, dan visual nonteks sesuai PRD |
| `--color-danger-strong` | `#CC0000` | Turunan tetap untuk tombol/indikator berisiko dengan teks putih normal; kontras 5,89:1 |
| `--color-warning-bg` | `#FFF9CC` | Latar peringatan |
| `--color-canvas` | `#F8FAFC` | Latar aplikasi |
| `--color-surface` | `#FFFFFF` | Card, sidebar, dialog, form |
| `--color-text` | `#0F172A` | Teks utama |
| `--color-muted` | `#475569` | Teks sekunder; tetap memenuhi kontras |
| `--color-border` | `#CBD5E1` | Border dan divider |
| `--color-focus` | `#0504FF` | Focus ring 3 px dengan offset 2 px |

Warna status tidak boleh menjadi satu-satunya pembeda. Status menggunakan kombinasi ikon, label teks, dan bentuk badge. `--color-danger-strong` adalah varian aksesibilitas tetap dari token danger PRD, bukan pengganti warna identitas `#FE0000`. Logo baru hanya mengganti identitas visual, tidak mengubah token.

### 2.2 Tipografi

- Font utama: Inter yang dibundle lokal melalui `@fontsource/inter`.
- Fallback: `system-ui`, `-apple-system`, `Segoe UI`, sans-serif.
- Base font: 16 px, line-height 1.5.
- Teks bantuan minimum: 14 px, line-height 1.5.
- Judul halaman: 28/34 px desktop, 24/30 px mobile, weight 700.
- Judul section: 20/28 px, weight 650–700.
- Label form: 14/20 px, weight 600.
- Angka tabular memakai `font-variant-numeric: tabular-nums`.
- NIK dan nomor KK tidak dipotong di tengah; pada ruang sempit gunakan wrap terkontrol atau tombol salin.

### 2.3 Spacing, bentuk, dan elevasi

- Grid dasar 8 px: token ruang 4, 8, 12, 16, 24, 32, 40, dan 48 px.
- Radius kecil 6 px, default 10 px, card 12 px, dialog 16 px.
- Border default 1 px `--color-border`.
- Bayangan card: `0 1px 2px rgba(15, 23, 42, .08)`.
- Bayangan overlay: `0 16px 40px rgba(15, 23, 42, .18)`.
- Target interaksi minimum 44×44 px.
- Animasi 120–200 ms dan dinonaktifkan ketika `prefers-reduced-motion: reduce`.
- Tidak menggunakan gradient.

### 2.4 Ikon dan gambar

- Ikon berasal dari Bootstrap Icons lokal dan selalu mempunyai label terlihat atau accessible name.
- Ikon dekoratif memakai `aria-hidden=true`.
- Logo sumber: `assets/images/logo-desa.png`; tampil utuh dengan `object-fit: contain`.
- Foto Kepala Desa memakai rasio 4:5; fallback silhouette mempunyai alt text yang sesuai konteks.
- Alt logo internal: `Logo Desa Kota Baru`. Alt logo publik mengikuti nama desa aktif.
- Jangan menampilkan foto Kepala Desa pada beranda publik.

## 3. Layout dan responsive behavior

### 3.1 Breakpoint

| Mode | Lebar | Perilaku utama |
| --- | --- | --- |
| Mobile | `<768px` | Satu kolom, navigation drawer, filter drawer, aksi utama full-width bila perlu |
| Tablet | `768–1023px` | Drawer, grid 2 kolom terbatas, tabel responsive |
| Desktop | `≥1024px` | Sidebar tetap, filter bar/panel, grid 12 kolom |

### 3.2 Layout internal `LAYOUT-INTERNAL`

- Skip link menjadi elemen fokus pertama.
- Sidebar desktop lebar 280 px, dapat dipadatkan menjadi 80 px tetapi pilihan pengguna tidak wajib dipersist pada rilis awal.
- Topbar tinggi minimum 64 px berisi tombol drawer, breadcrumb ringkas, notification center, dan menu akun.
- Konten utama lebar maksimum 1600 px, padding 24–32 px desktop dan 16 px mobile.
- Page header memuat breadcrumb, judul, deskripsi singkat, dan action group.
- Aksi utama diletakkan paling kanan pada desktop dan setelah judul pada mobile.
- Pada mobile, sidebar menjadi drawer dengan focus trap, tombol tutup terlihat, dan kembali fokus ke pemicu.
- Kepala Desa memakai layout yang sama, tetapi seluruh kontrol mutasi yang tidak berhak tidak dirender.

### 3.3 Layout publik `LAYOUT-PUBLIC`

- Mobile-first dengan header ringkas, logo, nama desa, navigasi, konten utama, dan footer.
- Navigation drawer mobile tidak menutupi tombol tutup dan mempunyai focus trap.
- Lebar konten artikel maksimum 760 px; listing maksimum 1200 px.
- Empat statistik publik boleh tampil sebagai 2×2 pada mobile dan 4 kolom pada desktop.
- Tidak ada link menuju panel internal selain tautan `Masuk` yang terpisah dan tidak dominan.

### 3.4 Layout autentikasi `LAYOUT-AUTH`

- Card login maksimum 440 px, berada di tengah viewport tanpa memaksa tinggi ketika keyboard mobile terbuka.
- Logo, nama aplikasi, judul, instruksi singkat, form, dan bantuan error tersusun satu kolom.
- Pesan login gagal tidak membocorkan apakah username/email terdaftar.

### 3.5 Urutan fokus

Urutan fokus mengikuti urutan visual: skip link, header/drawer toggle, navigasi, page header/action, filter, konten, pagination, lalu footer. Sticky element tidak boleh menutupi focused element. Dialog dan drawer mengunci fokus hanya selama terbuka.

## 4. Peran dan navigasi

### 4.1 Navigasi internal

| Item | Admin Desa | Kepala Desa |
| --- | :---: | :---: |
| Dashboard | Lihat | Lihat |
| Penduduk | Kelola | Lihat |
| Kartu Keluarga | Kelola | Lihat |
| Import | Kelola | — |
| Laporan | Kelola template, buat, unduh | Buat dan unduh |
| Konten | Kelola | — |
| Audit | Lihat penuh sesuai kebijakan | Lihat audit relevan |
| Backup | Kelola | — |
| Job | Lihat | Lihat job sendiri/relevan |
| Pengguna | Kelola | — |
| Pengaturan Aplikasi | Kelola | — |

Menu tanpa akses tidak dirender. Endpoint tetap wajib menegakkan otorisasi server dan mengembalikan 403.

### 4.2 Matriks aksi

| Aksi | Admin Desa | Kepala Desa | Publik |
| --- | :---: | :---: | :---: |
| Melihat PII dan dokumen penduduk | Ya | Ya | Tidak |
| Mutasi penduduk/KK | Ya | Tidak | Tidak |
| Membuat dan mengunduh laporan | Ya | Ya | Tidak |
| Mengubah template laporan | Ya | Tidak | Tidak |
| Mengelola CMS/pengaturan/pengguna | Ya | Tidak | Tidak |
| Menjalankan/mengunduh backup | Ya | Tidak | Tidak |
| Melihat konten published dan statistik publik | Ya | Ya | Ya |

### 4.3 Navigasi publik

Urutan tetap: Beranda, Berita, Pengumuman, Agenda, Profil Desa. Item aktif memakai `aria-current=page`. Label `Masuk` menuju `/masuk` dan tidak disatukan dengan navigasi konten pada layar kecil.

## 5. Registry komponen global

| ID komponen | Nama | Kontrak inti |
| --- | --- | --- |
| `APP-SIDEBAR` | Sidebar internal | Role-aware, active state, drawer mobile, keyboard accessible |
| `APP-TOPBAR` | Topbar | Drawer trigger, breadcrumb ringkas, notifikasi, akun |
| `PAGE-HEADER` | Header halaman | Breadcrumb, judul, deskripsi, action group |
| `BUTTON` | Tombol | Varian primary, secondary, danger, ghost, icon; state disabled/loading |
| `STATUS-BADGE` | Badge status | Ikon + teks + warna; tidak color-only |
| `ALERT` | Alert inline | Info/success/warning/error dengan heading ringkas |
| `TOAST` | Notifikasi sementara | Hanya feedback nonkritis; dapat ditutup dan tidak mengganti error inline |
| `ERROR-SUMMARY` | Ringkasan error | Fokus setelah submit gagal; link menuju field bermasalah |
| `FORM-FIELD` | Field form | Label permanen, required marker, helper, error, described-by |
| `RELATION-SELECT` | Tom Select relasi | Lazy-load, debounce, maksimum 20 hasil, empty/error state |
| `FILTER-BAR` | Filter desktop | Apply/reset, active filter summary, tidak auto-submit setiap input |
| `FILTER-DRAWER` | Filter mobile | Focus trap, apply/reset, active count pada trigger |
| `DATA-TABLE` | Tabel server-side | Row click ke detail, Edit eksplisit, loading/empty/error/pagination |
| `METRIC-CARD` | Kartu metrik | Label, nilai, konteks periode; bukan link jika tidak ada drill-down |
| `DATA-CHART` | Grafik | Canvas/visual dan tabel data alternatif |
| `CONFIRM-DIALOG` | Dialog konfirmasi | Nama target, dampak, input alasan bila wajib, aksi eksplisit |
| `JOB-PROGRESS` | Status job | Status persisted, progress, pesan aman, attempt, result link terotorisasi |
| `FILE-UPLOAD` | Upload | Tipe/ukuran/dimensi, nama file, progress, error signature/dimensi |
| `EMPTY-STATE` | Kondisi kosong | Judul, penjelasan, aksi relevan; dibedakan dari filtered-empty |
| `NOTIFICATION-CENTER` | Pusat notifikasi | Jenis, waktu, target, read state; tidak memuat secret |
| `LEADER-CARD` | Kepala Desa | Foto/fallback, nama, jabatan, masa jabatan sesuai konteks |
| `RICH-TEXT` | Editor CMS Trix | Toolbar terbatas, attachment off, hasil tetap disanitasi server |
| `PRIVATE-DOWNLOAD` | Aksi file privat | Otorisasi ulang server, audit download, tidak mengekspos path storage |
| `UNSAVED-GUARD` | Peringatan perubahan | Aktif setelah form berubah; tidak muncul setelah submit berhasil |

Komponen berlogika diimplementasikan sebagai Controlled View Cells dengan property contract. Partial stateless menggunakan view include. Modul tidak boleh menyalin markup komponen untuk membuat varian lokal.

## 6. Kontrak komponen dan interaksi

### 6.1 Tombol dan action group

- Satu aksi primary per region.
- `Simpan` untuk form biasa; `Simpan dan aktifkan` hanya jika aktivasi memang bagian transaksi.
- Aksi risiko tinggi memakai danger dan tidak berdampingan tanpa jarak dengan CTA utama.
- Tombol loading mempertahankan lebar, menampilkan spinner dan label proses, serta `aria-disabled=true`.
- Tombol icon-only wajib mempunyai tooltip visual dan accessible name.

### 6.2 Tabel data

- DataTables selalu server-side dan menerima kontrak `draw`, `recordsTotal`, `recordsFiltered`, dan `data`.
- Seluruh area baris yang bukan control interaktif membuka detail melalui keyboard maupun pointer.
- Link/tombol di dalam baris menghentikan row navigation.
- Kolom action tidak menjadi satu-satunya jalan menuju detail.
- Sorting aktif diumumkan melalui `aria-sort`.
- Pagination mempunyai label hasil, misalnya `Menampilkan 21–40 dari 357 data`.
- Pada mobile, kolom prioritas tetap terlihat; metadata lain masuk detail row. NIK/KK tidak disingkat menjadi nilai ambigu.

### 6.3 Filter dan pencarian

- Search utama mempunyai label, debounce, dan tombol bersihkan.
- Filter desktop memakai bar atau panel; mobile memakai drawer.
- Tombol trigger mobile menampilkan jumlah filter aktif.
- Filter aktif diringkas sebagai chip yang dapat dihapus satu per satu.
- `Reset filter` tidak menghapus search tanpa label yang menjelaskan dampaknya.
- Empty tanpa data dan filtered-empty menggunakan pesan serta aksi berbeda.

### 6.4 Form dan validasi

- Label selalu terlihat; placeholder hanya contoh, bukan label.
- Field wajib ditandai teks `(wajib)` dan dijelaskan sekali di awal form.
- Validasi dijalankan di server; validasi client hanya membantu.
- Submit gagal memindahkan fokus ke `ERROR-SUMMARY`, lalu pengguna dapat menuju field melalui link.
- Error field memakai `aria-invalid=true` dan `aria-describedby`.
- Data tanggal ditampilkan dan dimasukkan dengan label WIB yang eksplisit ketika waktu relevan.
- Form panjang dibagi menjadi section semantik, bukan wizard kecuali PRD menetapkan proses bertahap.
- `UNSAVED-GUARD` aktif setelah perubahan nyata.

### 6.5 Pencarian relasi

- Tom Select baru mencari setelah sedikitnya 2 karakter, debounce 300 ms, maksimum 20 hasil.
- Endpoint menggunakan cursor dan format `{items: [{id, text, meta}], nextCursor}`.
- Hasil penduduk menampilkan nama dan metadata pembeda yang aman untuk pengguna internal.
- Daftar penuh penduduk tidak pernah dimuat ke browser.
- Loading, tidak ditemukan, gagal memuat, dan pilihan tidak lagi valid mempunyai pesan terpisah.

### 6.6 Konfirmasi mutasi

Dialog wajib untuk perubahan status penduduk, restore, perpindahan KK, nonaktif/restore KK, publikasi/penarikan konten, aktivasi konfigurasi, reset password, dan operasi backup. Dialog harus menyebut target dan dampak, bukan hanya `Apakah Anda yakin?`.

### 6.7 Job dan proses panjang

- Label status: `Menunggu`, `Diproses`, `Berhasil`, `Gagal`.
- Browser boleh ditutup; teks bantuan menjelaskan bahwa proses tetap berjalan.
- Polling dihentikan pada terminal state dan melambat ketika tab tidak aktif.
- Error UI aman untuk pengguna; detail teknis hanya masuk log dengan correlation/job ID.
- `resultUrl` hanya dirender setelah respons server yang sudah melewati otorisasi.

### 6.8 Upload

- Drop zone selalu mempunyai alternatif tombol `Pilih file`.
- Jenis, ukuran, dan dimensi ditampilkan sebelum pemilihan.
- Nama file tidak dianggap bukti tipe; server memeriksa signature dan melakukan re-encode sesuai PRD.
- File privat tidak mempunyai preview melalui URL publik.
- Upload gagal mempertahankan input form lain bila aman.

### 6.9 Grafik

- Grafik bukan satu-satunya penyampai data.
- Setiap grafik mempunyai heading, konteks periode, legenda yang dapat dibaca, dan tabel alternatif.
- Tooltip dapat diakses keyboard atau informasi yang sama tersedia pada tabel.

### 6.10 Rich text CMS

- Editor memakai Trix dengan paragraf, heading, bold, italic, daftar, kutipan, dan tautan.
- Attachment dinonaktifkan.
- Paste tidak boleh mempertahankan script, style, event handler, iframe, atau remote embed.
- Sanitasi HTML Purifier di server tetap wajib saat input; output di-escape sesuai konteks.

## 7. Screen registry dan URL kanonis

Setiap page root wajib mempunyai `data-screen-id` dengan nilai tepat seperti registry. Satu Screen ID boleh dipakai oleh GET form dan hasil POST yang sama, tetapi tidak boleh dipakai untuk tujuan layar berbeda.

### 7.1 Portal publik dan autentikasi

| Screen ID | URL kanonis | Akses | Tujuan dan komponen utama |
| --- | --- | --- | --- |
| `PUB-HOME` | `/` | Publik | Identitas desa, empat `METRIC-CARD`, berita/pengumuman/agenda terbaru; tanpa foto Kepala Desa |
| `PUB-NEWS` | `/berita` | Publik | Listing berita published, search, pagination, `EMPTY-STATE` |
| `PUB-NEWS-DETAIL` | `/berita/{slug}` | Publik | Judul, tanggal publikasi, konten sanitized, kembali ke daftar |
| `PUB-ANNOUNCEMENT` | `/pengumuman` | Publik | Daftar pengumuman published, periode relevan, pagination |
| `PUB-AGENDA` | `/agenda` | Publik | Agenda published mendatang/terlewat dengan label waktu WIB |
| `PUB-PROFILE` | `/profil-desa` | Publik | Profil published terstruktur, kontak aktif, `LEADER-CARD`; section kosong disembunyikan |
| `AUTH-LOGIN` | `/masuk` | Tamu | Login username/email + password, error generik, throttling feedback |
| `AUTH-CHANGE-PASSWORD` | `/ganti-password` | Internal | Ganti temporary password sebelum akses panel penuh |

### 7.2 Dashboard dan penduduk

| Screen ID | URL kanonis | Akses | Tujuan dan komponen utama |
| --- | --- | --- | --- |
| `INT-DASHBOARD` | `/panel` | Admin, Kades | Metrik aktif, perubahan bulan berjalan, breakdown, `DATA-CHART` + tabel, `LEADER-CARD`, job/notifikasi relevan |
| `RES-INDEX` | `/panel/penduduk` | Admin, Kades | `DATA-TABLE`, search NIK/nama/KK, filter status/RT/RW/Belum Masuk KK; Tambah hanya Admin |
| `RES-SHOW` | `/panel/penduduk/{id}` | Admin, Kades | Identitas, status, membership saat ini, dokumen privat, ringkasan histori; Edit/status hanya Admin |
| `RES-CREATE` | `/panel/penduduk/tambah` | Admin | Form data wajib/opsional; hasil selalu penduduk aktif dan boleh tanpa KK |
| `RES-EDIT` | `/panel/penduduk/{id}/ubah` | Admin | Koreksi atribut kini, bantuan bahwa histori versi baru akan dibuat |
| `RES-STATUS` | `/panel/penduduk/{id}/status` | Admin | Pilih Pindah/Meninggal atau Restore yang diizinkan, tanggal efektif, alasan, dokumen |
| `RES-HISTORY` | `/panel/penduduk/{id}/riwayat` | Admin, Kades | Timeline versi atribut, lifecycle event, membership, void, dan waktu pencatatan |

### 7.3 Kartu keluarga

| Screen ID | URL kanonis | Akses | Tujuan dan komponen utama |
| --- | --- | --- | --- |
| `KK-INDEX` | `/panel/kartu-keluarga` | Admin, Kades | `DATA-TABLE`, search nomor KK/alamat/anggota, filter aktif/nonaktif/headless/kosong |
| `KK-SHOW` | `/panel/kartu-keluarga/{id}` | Admin, Kades | Identitas KK, anggota aktif, kepala, histori alamat/membership, notifikasi invariant |
| `KK-CREATE` | `/panel/kartu-keluarga/tambah` | Admin | Form nomor, alamat, RT/RW, tanggal terbit opsional; boleh aktif kosong |
| `KK-EDIT` | `/panel/kartu-keluarga/{id}/ubah` | Admin | Koreksi data/alamat KK dan pembuatan versi |
| `KK-MOVE` | `/panel/kartu-keluarga/{id}/pindah` | Admin | Pilih satu/lebih anggota, KK existing atau baru, preview dampak headless/nonaktif |
| `KK-RESTORE` | `/panel/kartu-keluarga/{id}/pulihkan` | Admin | Restore SALAH_INPUT, alasan/keterangan; hasil aktif kosong tanpa membership |

Tambah anggota dilakukan dari `KK-SHOW` melalui dialog/form section dan hanya mencari penduduk aktif tanpa membership. Penduduk yang sudah menjadi anggota harus diarahkan ke `KK-MOVE`.

### 7.4 Import, laporan, backup, dan job

| Screen ID | URL kanonis | Akses | Tujuan dan komponen utama |
| --- | --- | --- | --- |
| `IMP-INDEX` | `/panel/import` | Admin | Riwayat batch, status job, unduh template resmi |
| `IMP-CREATE` | `/panel/import/baru` | Admin | Upload XLSX ke quarantine, batas file/baris, konfirmasi backup-before-parse |
| `IMP-VALIDATION` | `/panel/import/{id}/validasi` | Admin | Ringkasan validasi dan tabel semua error sheet/baris/kolom/instruksi |
| `IMP-SHOW` | `/panel/import/{id}` | Admin | Detail batch, backup terkait, progress, hasil dan audit |
| `RPT-INDEX` | `/panel/laporan` | Admin, Kades | Riwayat request/file, filter jenis/status/periode, retensi |
| `RPT-CREATE` | `/panel/laporan/baru` | Admin, Kades | Jenis, as-of/periode, template yang diizinkan, format, ringkasan snapshot |
| `RPT-SHOW` | `/panel/laporan/{id}` | Admin, Kades | `JOB-PROGRESS`, parameter snapshot, file privat, status retensi |
| `RPT-TEMPLATE` | `/panel/laporan/template` | Admin | Daftar/form template berversi; kop, kolom, orientasi, penandatangan |
| `BAK-INDEX` | `/panel/backup` | Admin | Backup terjadwal/pre-import/manual, retensi, verifikasi, aksi manual |
| `BAK-SHOW` | `/panel/backup/{id}` | Admin | Metadata aman, checksum/verifikasi, job, download privat; tanpa restore web |
| `JOB-INDEX` | `/panel/job` | Admin; Kades terbatas | Daftar job sesuai scope pengguna, status, tipe, initiator, attempt |
| `JOB-SHOW` | `/panel/job/{id}` | Admin; Kades terbatas | Progress, pesan aman, waktu, hasil terotorisasi, correlation ID |

### 7.5 CMS, audit, pengguna, dan pengaturan

| Screen ID | URL kanonis | Akses | Tujuan dan komponen utama |
| --- | --- | --- | --- |
| `CMS-INDEX` | `/panel/konten` | Admin | Tab Berita/Pengumuman/Agenda, filter status, preview publik |
| `CMS-EDITOR` | `/panel/konten/{jenis}/tambah` dan `/panel/konten/{jenis}/{id}/ubah` | Admin | Metadata, `RICH-TEXT`, status, jadwal/publikasi sesuai jenis |
| `CMS-SHOW` | `/panel/konten/{jenis}/{id}` | Admin | Preview sanitized, status, histori, publish/withdraw action |
| `AUD-INDEX` | `/panel/audit` | Admin; Kades terbatas | Filter pelaku/aksi/target/tanggal, tabel append-only |
| `AUD-SHOW` | `/panel/audit/{id}` | Admin; Kades terbatas | Waktu, pelaku, target, before/after aman, tanggal efektif, request metadata aman |
| `USR-INDEX` | `/panel/pengguna` | Admin | Pengguna internal, role/status, tanpa credential/session detail sensitif |
| `USR-FORM` | `/panel/pengguna/tambah` dan `/panel/pengguna/{id}/ubah` | Admin | Username, email opsional, role, temporary password/reset flow |
| `USR-SHOW` | `/panel/pengguna/{id}` | Admin | Profil akun, status temporary password, audit relevan, reset/role action |
| `SET-IDENTITY` | `/panel/pengaturan/identitas` | Admin | Identitas typed, kelengkapan laporan, timezone WIB read-only |
| `SET-BRAND` | `/panel/pengaturan/branding` | Admin | Logo aktif/fallback, upload/re-encode, preview berbagai konteks |
| `SET-HEAD` | `/panel/pengaturan/kepala-desa` | Admin | Versi Kepala Desa, masa jabatan, foto, sambutan, aktivasi atomik |
| `SET-PROFILE` | `/panel/pengaturan/profil-desa` | Admin | Form terstruktur, draft/published/archived, preview sebelum publish |
| `SET-HISTORY` | `/panel/pengaturan/riwayat` | Admin | Riwayat identitas, branding, Kepala Desa, profil |
| `SET-PREVIEW` | `/panel/pengaturan/pratinjau` | Admin | Preview dashboard internal, Profil Desa publik, dan kop laporan |

### 7.6 Screen development-only

| Screen ID | URL target setelah bootstrap | Akses | Tujuan |
| --- | --- | --- | --- |
| `DEV-COMPONENT-GALLERY` | `/__dev/component-gallery` | Environment development saja | Menguji seluruh komponen global, state, responsive, keyboard, dan visual token |

Route development tidak boleh terdaftar pada production. Artefak statis Tahap 1 berada di `design/component-gallery/` dan menjadi referensi migrasi ke Controlled View Cells pada Tahap 2.

## 8. State matrix

Seluruh screen harus menentukan state berikut. State yang tidak relevan secara bisnis tetap mempunyai penanganan eksplisit, misalnya redirect atau dedicated error page.

| State | Tampilan | Perilaku aksesibilitas | Aksi |
| --- | --- | --- | --- |
| Loading | Skeleton/spinner dengan ukuran stabil | Region `aria-busy=true`, teks `Memuat…` | Control penyebab loading dinonaktifkan sementara |
| Empty | `EMPTY-STATE` menjelaskan belum ada data | Heading dan deskripsi terbaca | CTA membuat data hanya bila role berhak |
| Filtered-empty | `Tidak ada hasil sesuai filter` + ringkasan filter | Live region sopan setelah hasil berubah | Ubah atau reset filter |
| Validation error | `ERROR-SUMMARY` + error per field | Fokus ke summary; link ke field | Perbaiki lalu kirim ulang |
| System error | Alert error dengan correlation ID aman | `role=alert` untuk kegagalan setelah aksi | Coba lagi atau kembali; tanpa stack trace |
| Forbidden | Halaman 403 dengan alasan kewenangan generik | Heading jelas dan fokus awal | Kembali ke dashboard/halaman sebelumnya |
| Success | Alert/toast dan state data terbaru | Live region sopan; fokus dipertahankan logis | Lihat detail atau lanjutkan |
| Processing | `JOB-PROGRESS` persisted | Status mempunyai label teks dan update tidak terlalu sering | Halaman boleh ditutup; refresh/poll |

### 8.1 Copy state baku

| Konteks | Judul | Isi singkat |
| --- | --- | --- |
| Empty penduduk | Belum ada data penduduk | Tambahkan penduduk pertama bila Anda mempunyai kewenangan. |
| Filtered-empty | Tidak ada hasil | Ubah kata pencarian atau hapus sebagian filter. |
| Job queued | Menunggu diproses | Pekerjaan sudah tersimpan dan akan diproses oleh sistem. |
| Job running | Sedang diproses | Halaman ini boleh ditutup. Proses akan tetap berjalan. |
| Job failed | Proses gagal | Periksa pesan yang tersedia atau gunakan ID pekerjaan saat meminta bantuan. |
| Forbidden | Akses tidak diizinkan | Akun Anda tidak mempunyai kewenangan untuk tindakan ini. |
| Generic error | Terjadi kendala | Data belum berubah. Silakan coba lagi atau catat ID kendala. |

Pesan tidak boleh menjanjikan `data belum berubah` jika transaksi mungkin sudah commit; service harus mengirim outcome yang benar dan idempotency key harus digunakan untuk job.

## 9. Wording dan vocabulary

### 9.1 Label status

| Nilai sistem | Label UI |
| --- | --- |
| `active` | Aktif |
| `inactive` | Nonaktif |
| `moved` | Pindah |
| `deceased` | Meninggal |
| `queued` | Menunggu |
| `running` | Diproses |
| `succeeded` | Berhasil |
| `failed` | Gagal |
| `draft` | Draf |
| `published` | Dipublikasikan |
| `withdrawn` | Ditarik |
| `archived` | Diarsipkan |
| `void` | Dibatalkan sebagai salah input |

### 9.2 Istilah tetap

- Gunakan `Penduduk`, bukan `Warga`, untuk data kependudukan internal.
- Gunakan `Kartu Keluarga` pada judul dan `KK` setelah konteks jelas.
- Gunakan `Belum Masuk KK`, bukan `tidak punya keluarga`.
- Gunakan `Tambah anggota` hanya untuk penduduk aktif tanpa membership.
- Gunakan `Pindah/Pecah KK` untuk penduduk yang sudah mempunyai membership.
- Gunakan `Pulihkan` pada tombol dan `Restore` hanya pada penjelasan teknis bila diperlukan.
- Bedakan `Tanggal efektif` dari `Dicatat pada`.
- Gunakan format tanggal Indonesia yang tidak ambigu, misalnya `31 Agustus 2026`; waktu memakai suffix `WIB`.
- Tombol memakai kata kerja: `Tambah penduduk`, `Simpan perubahan`, `Pindahkan anggota`, `Buat laporan`.

### 9.3 Konfirmasi baku

| Operasi | Judul | Dampak minimum yang dijelaskan |
| --- | --- | --- |
| Pindah penduduk | Tandai penduduk sebagai pindah? | Status nonaktif, membership berakhir, KK dapat menjadi tanpa kepala/nonaktif |
| Meninggal | Tandai penduduk sebagai meninggal? | Status nonaktif dan membership berakhir; restore hanya salah input |
| Pindah KK | Pindahkan anggota terpilih? | Membership asal berakhir dan tujuan dibuat dalam satu transaksi |
| Restore KK | Pulihkan Kartu Keluarga? | KK aktif kembali tanpa memulihkan membership lama |
| Publish konten | Publikasikan konten? | Konten dapat dilihat publik setelah berhasil |
| Reset password | Buat temporary password baru? | Session/credential terkait diproses sesuai policy dan pengguna wajib mengganti password |

## 10. Accessibility contract — WCAG 2.2 AA

- Setiap halaman mempunyai satu `h1` dan landmark `header`, `nav`, `main`, serta `footer` sesuai layout.
- Skip link terlihat saat fokus dan menuju `main`.
- Semua control dapat dijalankan keyboard tanpa pointer.
- Focus indicator minimum 3 px, kontras, dan tidak ditutupi sticky content.
- Modal/drawer mempunyai nama, deskripsi bila perlu, focus trap, Escape, dan focus return.
- Label, helper, unit, serta error dihubungkan secara programatik.
- Required state tidak hanya memakai tanda bintang.
- Table header memakai scope; caption atau accessible name menjelaskan isi dan periode.
- Chart mempunyai tabel alternatif yang membawa informasi setara.
- Status update memakai live region dengan frekuensi wajar; tidak mengambil fokus secara otomatis.
- Timeout session diperingatkan dan dapat diperpanjang bila kebijakan keamanan mengizinkan.
- Target minimum 44×44 px dan jarak antar-control mencegah salah tekan.
- Zoom 200% dan reflow 320 CSS px tidak menghasilkan kehilangan fungsi atau scroll dua arah pada halaman; tabel boleh scroll horizontal di region berlabel bila detail-row tidak memadai.
- Kontras teks normal minimal 4.5:1 dan teks besar minimal 3:1.
- Error, success, warning, dan status tidak dibedakan hanya dengan warna.
- Screenshot automation dan Axe membantu pemeriksaan, tetapi keyboard walkthrough manual tetap wajib.

## 11. Matriks responsive komponen

| Komponen | Mobile | Tablet | Desktop |
| --- | --- | --- | --- |
| Sidebar | Drawer | Drawer | Tetap 280 px |
| Page action | Stack; primary dapat full-width | Wrap | Inline kanan |
| Filter | Drawer + active count | Drawer/panel ringkas | Bar/panel terlihat |
| Metric card | 2 kolom atau 1 bila sempit | 2 kolom | 4 kolom |
| Form | 1 kolom | 1–2 kolom | Maksimum 2 kolom, urutan baca tetap |
| Data table | Kolom prioritas + detail row/scroll berlabel | Responsive | Kolom lengkap sesuai kebutuhan |
| Dialog | Hampir full-screen dengan margin 16 px | Maksimum 640 px | Maksimum 640/800 px sesuai konten |
| Toast | Inset 16 px, lebar fleksibel | Kanan atas | Kanan atas |
| Chart | Tinggi minimum 280 px + tabel | 320 px + tabel | 360 px + tabel |

Konten tidak boleh berpindah urutan secara visual dengan CSS sehingga berbeda dari urutan DOM.

## 12. Component gallery contract

Gallery wajib memperlihatkan:

- token warna, tipografi, spacing, radius, dan fokus;
- semua varian tombol serta state disabled/loading;
- field text/select/date/file, helper, wajib, invalid, dan error summary;
- status badge domain, CMS, dan job;
- alert, toast, modal konfirmasi, drawer filter, dan unsaved warning;
- tabel normal, loading, empty, filtered-empty, dan error;
- metric card, chart placeholder dengan tabel alternatif, notification item, leader card;
- file upload, job progress, pagination, breadcrumb, page header;
- layout desktop/mobile dan focus-visible state.

Gallery tidak menjadi source bisnis dan tidak memakai data penduduk nyata. Seluruh identitas contoh harus jelas fiktif, tidak menyerupai credential, NIK, atau nomor KK yang valid.

Acceptance gallery:

1. Tidak memuat asset dari CDN atau koneksi pihak ketiga.
2. Tidak menggunakan gradient.
3. Berfungsi pada 320 px, 768 px, 1024 px, dan desktop lebar.
4. Control interaktif dapat dipakai keyboard dan mengembalikan fokus.
5. `prefers-reduced-motion` dihormati.
6. Tidak ada error JavaScript pada interaksi gallery.
7. Setelah CI4 bootstrap, gallery dimigrasikan ke komponen aktual dan hanya tersedia pada environment development.

## 13. Governance dan definition of done UI

Perubahan patch dapat memperjelas wording tanpa mengubah pola. Perubahan token, layout, Screen ID, registry komponen, atau pola interaksi menaikkan versi spesifikasi dan mencatat alasan.

Sebuah screen selesai bila:

- memakai Screen ID dan URL dari registry;
- memakai layout dan komponen global;
- role yang tidak berhak tidak melihat mutation control dan server menolak endpoint;
- seluruh state relevan diuji;
- keyboard, focus, label, error, reflow, kontras, dan target sentuh diperiksa;
- desktop/mobile screenshot dibandingkan dengan kontrak;
- tidak memuat PII pada portal publik atau path file privat;
- test dapat menelusuri Screen ID dan komponen ke `IMPLEMENTATION_PLAN.md`.

Setelah pemeriksaan Tahap 1 lulus, metadata status dokumen diubah menjadi `Dibekukan untuk implementasi` tanpa mengubah versi 1.1.1.
